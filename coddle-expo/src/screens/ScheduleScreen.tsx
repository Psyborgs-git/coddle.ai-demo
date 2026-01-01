import React, { useState, useMemo } from 'react';
import { ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { useStore } from '../store/useStore';
import { format, parseISO, addMinutes, isToday, isTomorrow, differenceInMinutes } from 'date-fns';
import { Box, Text } from '../components/ui';
import { CoachWidget } from '../components/CoachWidget';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shopify/restyle';
import { Theme } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';
import { ScheduleBlock } from '../types';

export const ScheduleScreen = () => {
  const theme = useTheme<Theme>();
  const insets = useSafeAreaInsets();
  const schedule = useStore(state => state.schedule);
  const learnerState = useStore(state => state.learnerState);
  const coachTips = useStore(state => state.coachTips);
  const [adjustment, setAdjustment] = useState(0);
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);

  // Apply adjustment to schedule for display
  const adjustedSchedule = useMemo(() => schedule.map(block => {
    const start = addMinutes(parseISO(block.startISO), adjustment);
    const end = addMinutes(parseISO(block.endISO), adjustment);
    return { ...block, startISO: start.toISOString(), endISO: end.toISOString() };
  }), [schedule, adjustment]);

  // Group schedule by day
  const groupedSchedule = useMemo(() => {
    const groups: { [key: string]: ScheduleBlock[] } = {};
    adjustedSchedule.forEach(block => {
      const date = parseISO(block.startISO);
      const key = isToday(date) ? 'Today' : isTomorrow(date) ? 'Tomorrow' : format(date, 'EEE, MMM d');
      if (!groups[key]) groups[key] = [];
      groups[key].push(block);
    });
    return groups;
  }, [adjustedSchedule]);

  const handleTipTap = (tip: any) => {
    Alert.alert(tip.title, tip.message, [{ text: 'Got it', style: 'default' }]);
  };

  const handleBlockPress = (blockId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedBlock(expandedBlock === blockId ? null : blockId);
  };

  const getBlockIcon = (kind: string) => {
    switch (kind) {
      case 'windDown': return 'moon-outline';
      case 'bedtime': return 'moon';
      case 'nap': return 'cloudy-night';
      default: return 'time';
    }
  };

  const getBlockColor = (kind: string) => {
    switch (kind) {
      case 'windDown': return theme.colors.warning;
      case 'bedtime': return theme.colors.sleepBedtime;
      case 'nap': return theme.colors.primary;
      default: return theme.colors.secondaryText;
    }
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return { label: 'High', color: theme.colors.success };
    if (confidence >= 0.5) return { label: 'Medium', color: theme.colors.warning };
    return { label: 'Low', color: theme.colors.error };
  };

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <ScrollView 
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 20, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Box marginBottom="l">
          <Text variant="header">Smart Schedule</Text>
          <Text variant="body" color="secondaryText" marginTop="xs">
            Based on {learnerState?.confidence ? `${Math.round(learnerState.confidence * 100)}%` : '0%'} confident predictions
          </Text>
        </Box>

        {/* Learner Stats Card */}
        <Box
          backgroundColor="cardBackground"
          borderRadius="l"
          padding="m"
          marginBottom="l"
          shadowColor="black"
          shadowOpacity={0.08}
          shadowRadius={12}
          shadowOffset={{ width: 0, height: 4 }}
        >
          <Text variant="subtitle" marginBottom="m">Current Patterns</Text>
          <Box flexDirection="row" justifyContent="space-between">
            <Box flex={1} alignItems="center" padding="s">
              <Ionicons name="sunny-outline" size={24} color={theme.colors.warning} />
              <Text variant="body" fontWeight="600" marginTop="xs">
                {learnerState?.ewmaWakeWindowMin ? Math.round(learnerState.ewmaWakeWindowMin) : '--'} min
              </Text>
              <Text variant="caption" color="secondaryText">Wake Window</Text>
            </Box>
            <Box width={1} backgroundColor="gray100" />
            <Box flex={1} alignItems="center" padding="s">
              <Ionicons name="moon-outline" size={24} color={theme.colors.primary} />
              <Text variant="body" fontWeight="600" marginTop="xs">
                {learnerState?.ewmaNapLengthMin ? Math.round(learnerState.ewmaNapLengthMin) : '--'} min
              </Text>
              <Text variant="caption" color="secondaryText">Avg Nap</Text>
            </Box>
          </Box>
        </Box>

        {/* What-if Slider */}
        <Box
          backgroundColor="cardBackground"
          borderRadius="l"
          padding="m"
          marginBottom="l"
          shadowColor="black"
          shadowOpacity={0.08}
          shadowRadius={12}
          shadowOffset={{ width: 0, height: 4 }}
        >
          <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="s">
            <Text variant="subtitle">What-if Adjustment</Text>
            <Box backgroundColor={adjustment === 0 ? 'gray100' : 'primaryLight'} paddingHorizontal="m" paddingVertical="xs" borderRadius="round">
              <Text variant="body" color={adjustment === 0 ? 'secondaryText' : 'primary'} fontWeight="600">
                {adjustment > 0 ? '+' : ''}{adjustment} min
              </Text>
            </Box>
          </Box>
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={-30}
            maximumValue={30}
            step={5}
            value={adjustment}
            onValueChange={(val) => setAdjustment(val)}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.gray100}
            thumbTintColor={theme.colors.primary}
          />
          <Box flexDirection="row" justifyContent="space-between">
            <Text variant="caption" color="secondaryText">-30 min</Text>
            <Text variant="caption" color="secondaryText">+30 min</Text>
          </Box>
        </Box>

        {/* Coach Widget */}
        {coachTips.length > 0 && (
          <Box marginBottom="l">
            <CoachWidget tips={coachTips} onTapTip={handleTipTap} />
          </Box>
        )}

        {/* Schedule Blocks */}
        {Object.entries(groupedSchedule).map(([day, blocks]) => (
          <Box key={day} marginBottom="l">
            <Box flexDirection="row" alignItems="center" marginBottom="m">
              <Box width={4} height={20} backgroundColor="primary" borderRadius="s" marginRight="s" />
              <Text variant="subtitle">{day}</Text>
              <Text variant="caption" color="secondaryText" marginLeft="s">
                ({blocks.length} blocks)
              </Text>
            </Box>

            {blocks.map((block) => {
              const isExpanded = expandedBlock === block.id;
              const duration = differenceInMinutes(parseISO(block.endISO), parseISO(block.startISO));
              const confidence = getConfidenceLabel(block.confidence);

              return (
                <Pressable key={block.id} onPress={() => handleBlockPress(block.id)}>
                  <Box
                    backgroundColor="cardBackground"
                    borderRadius="m"
                    marginBottom="s"
                    overflow="hidden"
                    style={{ borderLeftWidth: 4, borderLeftColor: getBlockColor(block.kind) }}
                    shadowColor="black"
                    shadowOpacity={0.05}
                    shadowRadius={8}
                    shadowOffset={{ width: 0, height: 2 }}
                  >
                    <Box padding="m">
                      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
                        <Box flexDirection="row" alignItems="center" flex={1}>
                          <Box
                            width={40}
                            height={40}
                            borderRadius="m"
                            backgroundColor={block.kind === 'windDown' ? 'sleepWindDown' : 'primaryLight'}
                            alignItems="center"
                            justifyContent="center"
                            marginRight="m"
                          >
                            <Ionicons name={getBlockIcon(block.kind)} size={20} color={getBlockColor(block.kind)} />
                          </Box>
                          <Box flex={1}>
                            <Text variant="body" fontWeight="600">
                              {format(parseISO(block.startISO), 'h:mm a')} - {format(parseISO(block.endISO), 'h:mm a')}
                            </Text>
                            <Text variant="caption" color="secondaryText" marginTop="xs">
                              {block.kind.charAt(0).toUpperCase() + block.kind.slice(1)} • {duration} min
                            </Text>
                          </Box>
                        </Box>

                        <Box flexDirection="row" alignItems="center">
                          <Box 
                            style={{ backgroundColor: confidence.color + '20' }} 
                            paddingHorizontal="s" 
                            paddingVertical="xs" 
                            borderRadius="s"
                            marginRight="s"
                          >
                            <Text variant="caption" style={{ color: confidence.color }}>
                              {confidence.label}
                            </Text>
                          </Box>
                          <Ionicons 
                            name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                            size={20} 
                            color={theme.colors.secondaryText} 
                          />
                        </Box>
                      </Box>

                      {isExpanded && (
                        <Box marginTop="m" paddingTop="m" style={{ borderTopWidth: 1, borderTopColor: theme.colors.gray100 }}>
                          <Box flexDirection="row" alignItems="center" marginBottom="s">
                            <Ionicons name="bulb-outline" size={16} color={theme.colors.warning} />
                            <Text variant="caption" color="secondaryText" marginLeft="xs">
                              {block.rationale}
                            </Text>
                          </Box>
                          <Box flexDirection="row" justifyContent="space-between">
                            <Box>
                              <Text variant="caption" color="secondaryText">Confidence</Text>
                              <Text variant="body" fontWeight="600">{Math.round(block.confidence * 100)}%</Text>
                            </Box>
                            <Box>
                              <Text variant="caption" color="secondaryText">Duration</Text>
                              <Text variant="body" fontWeight="600">{duration} minutes</Text>
                            </Box>
                            <Box>
                              <Text variant="caption" color="secondaryText">Type</Text>
                              <Text variant="body" fontWeight="600">{block.kind}</Text>
                            </Box>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Pressable>
              );
            })}
          </Box>
        ))}

        {adjustedSchedule.length === 0 && (
          <Box
            backgroundColor="cardBackground"
            borderRadius="l"
            padding="xl"
            alignItems="center"
          >
            <Ionicons name="calendar-outline" size={48} color={theme.colors.secondaryText} />
            <Text variant="body" color="secondaryText" textAlign="center" marginTop="m">
              No schedule available yet.
              {'\n'}Log a few sleep sessions to generate predictions.
            </Text>
          </Box>
        )}
      </ScrollView>
    </Box>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20 },
});
