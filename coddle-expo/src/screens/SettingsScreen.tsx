import React, { useState, useEffect } from 'react';
import { ScrollView, Alert, Pressable, TextInput, Modal, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStore, PROFILE_COLORS } from '../store/useStore';
import { Box, Text } from '../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { Theme } from '../theme';
import { v4 as uuidv4 } from 'uuid';
import { BabyProfile } from '../types';
import { differenceInMonths, format, parseISO } from 'date-fns';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { getCurrentTimezone, isDST } from '../utils/date';
import { NotificationService } from '../services/notifications';
import { db } from '../services/database';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const SettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const theme = useTheme<Theme>();
  
  const profiles = useStore(state => state.profiles);
  const activeProfileId = useStore(state => state.activeProfileId);
  const profile = useStore(state => state.profile);
  const timezone = useStore(state => state.timezone);
  const addProfile = useStore(state => state.addProfile);
  const updateProfile = useStore(state => state.updateProfile);
  const deleteProfile = useStore(state => state.deleteProfile);
  const switchProfile = useStore(state => state.switchProfile);
  const reset = useStore(state => state.reset);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<BabyProfile | null>(null);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState(PROFILE_COLORS[0]);
  const [isDark, setIsDark] = useState(false);
  const [showNotificationLog, setShowNotificationLog] = useState(false);
  const [notificationLogs, setNotificationLogs] = useState<any[]>([]);

  // Load notification logs when expanded
  useEffect(() => {
    if (showNotificationLog) {
      loadNotificationLogs();
    }
  }, [showNotificationLog]);

  const loadNotificationLogs = async () => {
    try {
      const logs = await db.getNotificationLogs();
      setNotificationLogs(logs);
    } catch (error) {
      console.error('Failed to load notification logs:', error);
    }
  };

  const openAddModal = () => {
    setEditingProfile(null);
    setName('');
    setBirthDate(null);
    setSelectedColor(PROFILE_COLORS[profiles.length % PROFILE_COLORS.length]);
    setShowModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openEditModal = (p: BabyProfile) => {
    setEditingProfile(p);
    setName(p.name);
    setBirthDate(p.birthDateISO ? parseISO(p.birthDateISO) : null);
    setSelectedColor(p.avatarColor || PROFILE_COLORS[0]);
    setShowModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    if (!birthDate) {
      Alert.alert('Error', 'Please select a birth date');
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    if (editingProfile) {
      await updateProfile({
        ...editingProfile,
        name: name.trim(),
        birthDateISO: birthDate.toISOString(),
        avatarColor: selectedColor,
      });
      Toast.show({
        type: 'success',
        text1: 'Profile Updated',
        text2: `${name.trim()}'s profile has been updated`,
      });
    } else {
      await addProfile({
        id: uuidv4(),
        name: name.trim(),
        birthDateISO: birthDate.toISOString(),
        avatarColor: selectedColor,
        createdAtISO: new Date().toISOString(),
      });
      Toast.show({
        type: 'success',
        text1: 'Profile Created',
        text2: `${name.trim()} has been added`,
      });
    }

    setShowModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDelete = (p: BabyProfile) => {
    if (profiles.length <= 1) {
      Alert.alert('Cannot Delete', 'You need at least one profile');
      return;
    }

    Alert.alert(
      'Delete Profile',
      `Are you sure you want to delete ${p.name}'s profile? All associated sleep data will also be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            await deleteProfile(p.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Toast.show({
              type: 'info',
              text1: 'Profile Deleted',
              text2: `${p.name}'s profile has been removed`,
            });
          },
        },
      ]
    );
  };

  const handleSwitch = async (p: BabyProfile) => {
    if (p.id === activeProfileId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await switchProfile(p.id);
    Toast.show({
      type: 'success',
      text1: 'Profile Switched',
      text2: `Now tracking ${p.name}'s sleep`,
    });
  };

  const handleReset = () => {
    Alert.alert(
      'Reset All Data',
      'This will delete all profiles, sleep sessions, and settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            await reset();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Toast.show({
              type: 'info',
              text1: 'Data Reset',
              text2: 'All data has been cleared',
            });
          },
        },
      ]
    );
  };

  const getAgeString = (birthISO: string) => {
    const months = differenceInMonths(new Date(), parseISO(birthISO));
    if (months < 1) return 'Newborn';
    if (months === 1) return '1 month';
    if (months < 12) return `${months} months`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''}`;
    return `${years}y ${remainingMonths}m`;
  };

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <ScrollView showsVerticalScrollIndicator={false}>
        <Box padding="l" style={{ paddingTop: insets.top + 16 }}>
          <Text variant="header" marginBottom="l">Settings</Text>

          {/* Theme Selector */}
          <Box marginBottom="xl">
            <Text variant="subtitle" marginBottom="s">Theme</Text>
            <Box flexDirection="row" backgroundColor="cardBackground" borderRadius="m" padding="s">
              {(['system','light','dark'] as const).map(t => {
                const active = t === useStore.getState().themeMode;
                const label = t === 'system' ? 'Auto' : t === 'light' ? 'Light' : 'Dark';
                const icon = t === 'system' ? 'contrast' : t === 'light' ? 'sunny' : 'moon';
                return (
                  <Pressable
                    key={t}
                    onPress={async () => {
                      await useStore.getState().setThemeMode(t);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={{ flex: 1 }}
                  >
                    <Box
                      backgroundColor={active ? 'primary' : 'transparent'}
                      padding="s"
                      borderRadius="s"
                      alignItems="center"
                      justifyContent="center"
                      marginHorizontal="xs"
                    >
                      <Box flexDirection="row" alignItems="center">
                        <Ionicons name={icon} size={16} color={active ? 'white' : theme.colors.primary} />
                        <Text variant="body" marginLeft="s" color={active ? 'white' : 'primary'}>{label}</Text>
                      </Box>
                    </Box>
                  </Pressable>
                );
              })}
            </Box>
          </Box>

          {/* Profiles Section */}
          <Box marginBottom="xl">
            <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="m">
              <Text variant="subtitle">Baby Profiles</Text>
              <Pressable onPress={openAddModal}>
                <Box
                  backgroundColor="primary"
                  borderRadius="round"
                  padding="s"
                  flexDirection="row"
                  alignItems="center"
                >
                  <Ionicons name="person-add" size={20} color="white" />
                  <Text variant="caption" color="white" marginLeft="xs">Add</Text>
                </Box>
              </Pressable>
            </Box>

            {profiles.length === 0 ? (
              <Pressable onPress={openAddModal}>
                <Box
                  backgroundColor="cardBackground"
                  borderRadius="l"
                  padding="xl"
                  alignItems="center"
                  borderWidth={2}
                  borderStyle="dashed"
                  borderColor="secondaryText"
                >
                  <Ionicons name="person-add-outline" size={48} color={theme.colors.secondaryText} />
                  <Text variant="body" color="secondaryText" marginTop="m" textAlign="center">
                    No profiles yet.{'\n'}Tap to add your first baby profile.
                  </Text>
                </Box>
              </Pressable>
            ) : (
              profiles.map((p) => {
                const isActive = p.id === activeProfileId;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => handleSwitch(p)}
                    onLongPress={() => openEditModal(p)}
                  >
                    <Box
                      backgroundColor="cardBackground"
                      borderRadius="l"
                      padding="m"
                      marginBottom="s"
                      flexDirection="row"
                      alignItems="center"
                      borderWidth={isActive ? 2 : 0}
                      borderColor={isActive ? 'primary' : 'transparent'}
                      shadowColor="black"
                      shadowOpacity={isActive ? 0.15 : 0.05}
                      shadowRadius={8}
                      shadowOffset={{ width: 0, height: 2 }}
                    >
                      {/* Avatar */}
                      <Box
                        width={50}
                        height={50}
                        borderRadius="round"
                        alignItems="center"
                        justifyContent="center"
                        marginRight="m"
                        style={{ backgroundColor: p.avatarColor || PROFILE_COLORS[0] }}
                      >
                        <Text style={{ fontSize: 22, color: 'white', fontWeight: 'bold' }}>
                          {p.name.charAt(0).toUpperCase()}
                        </Text>
                      </Box>

                      {/* Info */}
                      <Box flex={1}>
                        <Box flexDirection="row" alignItems="center">
                          <Text variant="subtitle" fontSize={16}>{p.name}</Text>
                          {isActive && (
                            <Box backgroundColor="primary" borderRadius="s" paddingHorizontal="xs" marginLeft="s">
                              <Text variant="caption" color="white" fontSize={10}>Active</Text>
                            </Box>
                          )}
                        </Box>
                        <Text variant="caption" color="secondaryText">
                          {getAgeString(p.birthDateISO)} • Born {format(parseISO(p.birthDateISO), 'MMM d, yyyy')}
                        </Text>
                      </Box>

                      {/* Actions */}
                      <Box flexDirection="row">
                        <Pressable
                          onPress={() => openEditModal(p)}
                          hitSlop={8}
                        >
                          <Box padding="s">
                            <Ionicons name="pencil-outline" size={20} color={theme.colors.secondaryText} />
                          </Box>
                        </Pressable>
                        <Pressable
                          onPress={() => handleDelete(p)}
                          hitSlop={8}
                        >
                          <Box padding="s">
                            <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                          </Box>
                        </Pressable>
                      </Box>
                    </Box>
                  </Pressable>
                );
              })
            )}

            <Text variant="caption" color="secondaryText" marginTop="s">
              Long press a profile to edit. Tap to switch.
            </Text>
          </Box>

          {/* App Info Section */}
          <Box marginBottom="xl">
            <Text variant="subtitle" marginBottom="m">App Info</Text>
            <Box backgroundColor="cardBackground" borderRadius="l" padding="m">
              <Box flexDirection="row" justifyContent="space-between" paddingVertical="s">
                <Text variant="body" color="secondaryText">Version</Text>
                <Text variant="body">1.0.0</Text>
              </Box>
              <Box flexDirection="row" justifyContent="space-between" paddingVertical="s">
                <Text variant="body" color="secondaryText">Build</Text>
                <Text variant="body">Expo SDK 54</Text>
              </Box>
              <Box 
                flexDirection="row" 
                justifyContent="space-between" 
                paddingVertical="s"
                style={{ borderTopWidth: 1, borderTopColor: theme.colors.gray100 }}
              >
                <Text variant="body" color="secondaryText">Timezone</Text>
                <Text variant="body">{timezone}</Text>
              </Box>
              <Box flexDirection="row" justifyContent="space-between" paddingVertical="s">
                <Text variant="body" color="secondaryText">DST Active</Text>
                <Text variant="body">{isDST(new Date(), timezone) ? 'Yes' : 'No'}</Text>
              </Box>
            </Box>
          </Box>

          {/* Notification Log */}
          <Box marginBottom="l">
            <Text variant="subtitle" marginBottom="m">Notifications</Text>
            <Pressable onPress={() => setShowNotificationLog(!showNotificationLog)}>
              <Box
                backgroundColor="cardBackground"
                borderRadius="l"
                padding="m"
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
                shadowColor="black"
                shadowOpacity={0.05}
                shadowRadius={8}
                shadowOffset={{ width: 0, height: 2 }}
              >
                <Box flexDirection="row" alignItems="center">
                  <Ionicons name="notifications-outline" size={24} color={theme.colors.primary} />
                  <Box marginLeft="m">
                    <Text variant="body" fontWeight="600">View Notification Log</Text>
                    <Text variant="caption" color="secondaryText">
                      See scheduled and delivered notifications
                    </Text>
                  </Box>
                </Box>
                <Ionicons 
                  name={showNotificationLog ? "chevron-up" : "chevron-forward"} 
                  size={20} 
                  color={theme.colors.secondaryText} 
                />
              </Box>
            </Pressable>

            {showNotificationLog && (
              <Box
                backgroundColor="cardBackground"
                borderRadius="l"
                padding="m"
                marginTop="s"
              >
                {notificationLogs.length > 0 ? (
                  notificationLogs.slice(0, 10).map((log, index) => (
                    <Box
                      key={log.id}
                      paddingVertical="s"
                      style={{
                        borderTopWidth: index > 0 ? 1 : 0,
                        borderTopColor: theme.colors.gray100
                      }}
                    >
                      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
                        <Text variant="caption" fontWeight="600">{log.title}</Text>
                        <Box
                          paddingHorizontal="s"
                          paddingVertical="xs"
                          borderRadius="s"
                          backgroundColor={
                            log.status === 'scheduled' ? 'primary' as any :
                            log.status === 'delivered' ? 'success' as any :
                            'secondaryText' as any
                          }
                          opacity={0.2}
                        >
                          <Text variant="caption" fontSize={10} fontWeight="600">
                            {log.status.toUpperCase()}
                          </Text>
                        </Box>
                      </Box>
                      <Text variant="caption" color="secondaryText" marginTop="xs">
                        {format(parseISO(log.scheduledForISO), 'MMM d, h:mm a')}
                      </Text>
                    </Box>
                  ))
                ) : (
                  <Text variant="body" color="secondaryText" textAlign="center" paddingVertical="m">
                    No notifications logged yet
                  </Text>
                )}
              </Box>
            )}
          </Box>

          {/* Danger Zone */}
          <Box marginBottom="xl">
            <Text variant="subtitle" marginBottom="m" color="error">Danger Zone</Text>
            <Pressable onPress={handleReset}>
              <Box
                backgroundColor="cardBackground"
                borderRadius="l"
                padding="m"
                flexDirection="row"
                alignItems="center"
                borderWidth={1}
                borderColor="error"
              >
                <Ionicons name="warning-outline" size={24} color={theme.colors.error} />
                <Box marginLeft="m" flex={1}>
                  <Text variant="body" color="error" fontWeight="600">Reset All Data</Text>
                  <Text variant="caption" color="secondaryText">
                    Delete all profiles and sleep data
                  </Text>
                </Box>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.error} />
              </Box>
            </Pressable>
          </Box>
        </Box>
      </ScrollView>

      {/* Add/Edit Profile Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <Box flex={1} backgroundColor="mainBackground" padding="l" style={{ paddingTop: 20 }}>
          <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="xl">
            <Pressable onPress={() => setShowModal(false)}>
              <Text variant="body" color="primary">Cancel</Text>
            </Pressable>
            <Text variant="subtitle">{editingProfile ? 'Edit Profile' : 'New Profile'}</Text>
            <Pressable onPress={handleSave}>
              <Text variant="body" color="primary" fontWeight="600">Save</Text>
            </Pressable>
          </Box>

          {/* Color Picker */}
          <Text variant="body" marginBottom="s">Avatar Color</Text>
          <Box flexDirection="row" flexWrap="wrap" marginBottom="l">
            {PROFILE_COLORS.map((color) => (
              <Pressable
                key={color}
                onPress={() => {
                  setSelectedColor(color);
                  Haptics.selectionAsync();
                }}
              >
                <Box
                  width={44}
                  height={44}
                  borderRadius="round"
                  margin="xs"
                  alignItems="center"
                  justifyContent="center"
                  style={{ backgroundColor: color }}
                  borderWidth={selectedColor === color ? 3 : 0}
                  borderColor="mainBackground"
                >
                  {selectedColor === color && (
                    <Ionicons name="checkmark" size={24} color="white" />
                  )}
                </Box>
              </Pressable>
            ))}
          </Box>

          {/* Name Input */}
          <Text variant="body" marginBottom="s">Baby Name</Text>
          <Box
            backgroundColor="cardBackground"
            borderRadius="m"
            marginBottom="l"
          >
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter name"
              placeholderTextColor={theme.colors.secondaryText}
              style={{
                padding: 16,
                fontSize: 16,
                color: theme.colors.primaryText,
              }}
              autoFocus
            />
          </Box>

          {/* Birth Date Picker */}
          <Text variant="body" marginBottom="s">Birth Date</Text>
          <Pressable onPress={() => setShowDatePicker(true)}>
            <Box
              backgroundColor="cardBackground"
              borderRadius="m"
              padding="m"
              flexDirection="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Text variant="body" color={birthDate ? 'primaryText' : 'secondaryText'}>
                {birthDate ? format(birthDate, 'MMMM d, yyyy') : 'Select birth date'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.secondaryText} />
            </Box>
          </Pressable>

          {showDatePicker && (
            <Box marginVertical="m" backgroundColor="cardBackground" borderRadius="m" paddingVertical="m" overflow="hidden">
              <DateTimePicker
                value={birthDate || new Date()}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                textColor={theme.colors.primaryText}
                onChange={(e, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) setBirthDate(date);
                }}
              />
              {Platform.OS === 'android' && (
                <Box flexDirection="row" justifyContent="flex-end" paddingHorizontal="m" paddingBottom="s">
                  <Pressable
                    onPress={() => setShowDatePicker(false)}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text variant="body" color="primary" fontWeight="600">Done</Text>
                  </Pressable>
                </Box>
              )}
            </Box>
          )}

          {/* Preview */}
          {name && (
            <Box alignItems="center" marginTop="xl" marginBottom="l" paddingBottom="xl">
              <Box
                width={100}
                height={100}
                borderRadius="round"
                alignItems="center"
                justifyContent="center"
                marginBottom="m"
                style={{ 
                  backgroundColor: selectedColor, 
                  shadowColor: selectedColor, 
                  shadowOpacity: 0.3, 
                  shadowOffset: { width: 0, height: 4 }, 
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <Text style={{ fontSize: 48, color: 'white', fontWeight: 'bold' }}>
                  {name.charAt(0).toUpperCase()}
                </Text>
              </Box>
              <Text variant="subtitle" marginTop="s" textAlign="center">{name}</Text>
              {birthDate && (
                <Text variant="caption" color="secondaryText" marginTop="xs">
                  {getAgeString(birthDate.toISOString())}
                </Text>
              )}
            </Box>
          )}
        </Box>
      </Modal>
    </Box>
  );
};
