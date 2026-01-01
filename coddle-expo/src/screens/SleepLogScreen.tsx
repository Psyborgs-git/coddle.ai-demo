import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Platform, Modal, Pressable } from 'react-native';
import { useStore } from '../store/useStore';
import { v4 as uuidv4 } from 'uuid';
import { SleepSession } from '../types';
import { Box, Text, Button } from '../components/ui';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { differenceInSeconds, differenceInMinutes, differenceInHours, format, parseISO } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { Theme } from '../theme';
import Toast from 'react-native-toast-message';
import { VALIDATION_CONSTRAINTS, VALIDATION_MESSAGES } from '../constants/validation';

export const SleepLogScreen = () => {
  const theme = useTheme<Theme>();
  const { 
    addSession, 
    sessions, 
    isTimerRunning, 
    currentSessionStartISO, 
    startTimer, 
    stopTimer 
  } = useStore();
  
  const [elapsed, setElapsed] = useState(0);
  const [awakeElapsed, setAwakeElapsed] = useState(0);
  
  // Manual Entry State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualStart, setManualStart] = useState(new Date());
  const [manualEnd, setManualEnd] = useState(new Date());
  const [notes, setNotes] = useState('');

  // Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && currentSessionStartISO) {
      const start = parseISO(currentSessionStartISO);
      interval = setInterval(() => {
        setElapsed(differenceInSeconds(new Date(), start));
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, currentSessionStartISO]);

  // Awake Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!isTimerRunning && sessions.length > 0) {
      // Find last sleep session end
      const lastSleep = sessions.find(s => s.endISO && !s.deleted);
      if (lastSleep && lastSleep.endISO) {
        const end = parseISO(lastSleep.endISO);
        interval = setInterval(() => {
          setAwakeElapsed(differenceInSeconds(new Date(), end));
        }, 1000);
      }
    } else {
      setAwakeElapsed(0);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, sessions]);

  const handleToggleTimer = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (isTimerRunning) {
      // Validate minimum sleep duration before stopping
      if (currentSessionStartISO) {
        const durationMinutes = differenceInMinutes(new Date(), parseISO(currentSessionStartISO));
        
        if (durationMinutes < VALIDATION_CONSTRAINTS.MIN_SLEEP_DURATION_MINUTES) {
          Toast.show({
            type: 'error',
            text1: 'Too Short',
            text2: VALIDATION_MESSAGES.MIN_SLEEP,
            position: 'top',
          });
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }
      }
      
      await stopTimer();
      Toast.show({
        type: 'success',
        text1: 'Sleep Logged',
        text2: `Recorded ${formatDuration(elapsed)} of sleep`,
        position: 'top',
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      // Validate minimum wake duration before starting new sleep
      if (sessions.length > 0) {
        const lastSleep = sessions.find(s => s.endISO && !s.deleted);
        if (lastSleep && lastSleep.endISO) {
          const wakeMinutes = differenceInMinutes(new Date(), parseISO(lastSleep.endISO));
          
          if (wakeMinutes < VALIDATION_CONSTRAINTS.MIN_WAKE_DURATION_MINUTES) {
            Toast.show({
              type: 'error',
              text1: 'Too Soon',
              text2: VALIDATION_MESSAGES.MIN_WAKE,
              position: 'top',
            });
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
          }
        }
      }
      
      startTimer();
      Toast.show({
        type: 'info',
        text1: 'Sleep Started',
        text2: 'Timer is now running',
        position: 'top',
      });
    }
  };

  const handleManualSubmit = async () => {
    // Validation
    if (manualStart >= manualEnd) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Time',
        text2: VALIDATION_MESSAGES.START_BEFORE_END,
        position: 'top',
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (manualEnd > new Date()) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Time',
        text2: VALIDATION_MESSAGES.FUTURE_DATE,
        position: 'top',
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const durationMinutes = differenceInMinutes(manualEnd, manualStart);
    if (durationMinutes < VALIDATION_CONSTRAINTS.MIN_SLEEP_DURATION_MINUTES) {
      Toast.show({
        type: 'error',
        text1: 'Too Short',
        text2: VALIDATION_MESSAGES.MIN_SLEEP,
        position: 'top',
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const durationHours = differenceInHours(manualEnd, manualStart);
    if (durationHours > VALIDATION_CONSTRAINTS.MAX_SLEEP_DURATION_HOURS) {
      Toast.show({
        type: 'error',
        text1: 'Too Long',
        text2: VALIDATION_MESSAGES.MAX_SLEEP,
        position: 'top',
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const session: SleepSession = {
      id: uuidv4(),
      startISO: manualStart.toISOString(),
      endISO: manualEnd.toISOString(),
      source: 'manual',
      updatedAtISO: new Date().toISOString(),
      notes
    };

    await addSession(session);
    setShowManualModal(false);
    setNotes('');
    
    Toast.show({
      type: 'success',
      text1: 'Session Added',
      text2: `Logged ${formatDuration(durationMinutes * 60)} of sleep`,
      position: 'top',
    });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h}h ` : ''}${m}m ${s}s`;
  };

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="header" marginBottom="l">Sleep Log</Text>
        
        {/* Timer Card */}
        <Box 
          backgroundColor={isTimerRunning ? "sleepBedtime" : "cardBackground"} 
          padding="xl" 
          borderRadius="xl" 
          alignItems="center"
          shadowColor="black"
          shadowOpacity={0.1}
          shadowOffset={{ width: 0, height: 4 }}
          shadowRadius={12}
          elevation={5}
          marginBottom="l"
        >
          <Box marginBottom="m">
            <Ionicons 
              name={isTimerRunning ? "moon" : "sunny"} 
              size={64} 
              color={isTimerRunning ? theme.colors.white : theme.colors.warning} 
            />
          </Box>
          
          <Text 
            variant="header" 
            color={isTimerRunning ? "white" : "primaryText"} 
            marginBottom="s"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {isTimerRunning ? formatDuration(elapsed) : formatDuration(awakeElapsed)}
          </Text>
          
          <Text 
            variant="body" 
            color={isTimerRunning ? "white" : "secondaryText"} 
            marginBottom="l"
          >
            {isTimerRunning ? "Sleeping Soundly" : "Awake & Active"}
          </Text>
          
          <Button 
            onPress={handleToggleTimer}
            style={{ 
              backgroundColor: isTimerRunning ? theme.colors.white : theme.colors.primary,
              paddingHorizontal: 48,
              paddingVertical: 16,
              borderRadius: 999,
            }}
          >
            <Text 
              variant="subtitle" 
              color={isTimerRunning ? "primary" : "white"} 
              fontWeight="bold"
            >
              {isTimerRunning ? "Wake Up" : "Start Sleep"}
            </Text>
          </Button>
        </Box>

        {/* Manual Entry Button */}
        <Button 
          variant="outline" 
          onPress={() => setShowManualModal(true)}
          style={{ marginBottom: 24 }}
        >
          <Box flexDirection="row" alignItems="center" justifyContent="center">
            <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text color="primary" fontWeight="600">Add Past Session</Text>
          </Box>
        </Button>
        
        {/* Recent Sessions */}
        <Text variant="title" marginBottom="m">Recent Sessions</Text>
        {sessions.slice(0, 5).map(s => (
          <Box 
            key={s.id} 
            backgroundColor="cardBackground" 
            padding="m" 
            borderRadius="m" 
            marginBottom="s"
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box flexDirection="row" alignItems="center">
              <Box 
                width={40} 
                height={40} 
                borderRadius="round" 
                backgroundColor="primaryLight" 
                alignItems="center" 
                justifyContent="center"
                marginRight="m"
              >
                <Ionicons name="moon" size={20} color={theme.colors.primary} />
              </Box>
              <Box>
                <Text variant="body" fontWeight="600">
                  {format(parseISO(s.startISO), 'h:mm a')} - {s.endISO ? format(parseISO(s.endISO), 'h:mm a') : 'Now'}
                </Text>
                <Text variant="caption">
                  {s.endISO ? formatDuration(differenceInSeconds(parseISO(s.endISO), parseISO(s.startISO))) : 'Ongoing'} • {format(parseISO(s.startISO), 'MMM d')}
                </Text>
              </Box>
            </Box>
            {s.source === 'manual' && (
              <Box backgroundColor="gray100" paddingHorizontal="s" paddingVertical="xs" borderRadius="s">
                <Text variant="label">Manual</Text>
              </Box>
            )}
          </Box>
        ))}
      </ScrollView>

      {/* Manual Entry Modal */}
      <Modal visible={showManualModal} animationType="slide" presentationStyle="pageSheet">
        <Box flex={1} padding="l" backgroundColor="mainBackground">
          <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="l">
            <Text variant="header">Add Session</Text>
            <Pressable onPress={() => setShowManualModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.primaryText} />
            </Pressable>
          </Box>
          
          <Text variant="subtitle" marginBottom="s">Start Time</Text>
          <Box backgroundColor="cardBackground" borderRadius="m" marginBottom="m" overflow="hidden">
             <DateTimePicker
                value={manualStart}
                mode="datetime"
                display="spinner"
                onChange={(e, date) => date && setManualStart(date)}
                textColor={theme.colors.primaryText}
             />
          </Box>

          <Text variant="subtitle" marginBottom="s">End Time</Text>
          <Box backgroundColor="cardBackground" borderRadius="m" marginBottom="l" overflow="hidden">
             <DateTimePicker
                value={manualEnd}
                mode="datetime"
                display="spinner"
                onChange={(e, date) => date && setManualEnd(date)}
                textColor={theme.colors.primaryText}
             />
          </Box>

          <Button onPress={handleManualSubmit}>
            Save Session
          </Button>
        </Box>
      </Modal>
    </Box>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 60, paddingBottom: 100 },
});
