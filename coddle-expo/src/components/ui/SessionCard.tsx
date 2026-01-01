import React, { useRef, useEffect, useState } from 'react';
import { Animated, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Box, Text } from './index';
import { SleepSession } from '../../types';
import { format, differenceInMinutes, differenceInHours } from 'date-fns';
import { safeParseISO } from '../../utils/date';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { Theme } from '../../theme';
import * as Haptics from 'expo-haptics';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SessionCardProps = {
  session: SleepSession;
  onPress?: () => void;
  onLongPress?: () => void;
  highlighted?: boolean;
};

export const SessionCard: React.FC<SessionCardProps> = ({ 
  session, 
  onPress, 
  onLongPress,
  highlighted = false,
}) => {
  const theme = useTheme<Theme>();
  const [expanded, setExpanded] = useState(false);

  if (!session.startISO || !session.endISO) return null;

  const startDate = safeParseISO(session.startISO);
  const endDate = safeParseISO(session.endISO);
  if (!startDate || !endDate) return null;
  
  const durationMins = differenceInMinutes(endDate, startDate);
  const durationHours = differenceInHours(endDate, startDate);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 })
    ]).start();
  }, []);

  const handlePress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(!expanded);
    onPress?.();
  };

  const formatDuration = (mins: number): string => {
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${mins}m`;
  };

  const isLongSleep = durationMins > 120; // > 2 hours
  const isShortNap = durationMins < 30;

  return (
    <Pressable onPress={handlePress} onLongPress={onLongPress}>
      {({ pressed }) => (
        <Animated.View
          style={{
            opacity,
            transform: [{ translateY }, { scale: pressed ? 0.98 : 1 }],
            backgroundColor: highlighted ? theme.colors.primaryLight : theme.colors.cardBackground,
            borderRadius: 16,
            marginBottom: 12,
            shadowColor: theme.colors.black,
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 3,
            borderWidth: highlighted ? 2 : 0,
            borderColor: theme.colors.primary,
            overflow: 'hidden',
          }}
        >
          {/* Main Content */}
          <Box padding="m">
            <Box flexDirection="row" alignItems="center">
              {/* Sleep Icon */}
              <Box
                width={44}
                height={44}
                borderRadius="m"
                backgroundColor={isLongSleep ? 'sleepBedtime' : 'primaryLight'}
                alignItems="center"
                justifyContent="center"
                marginRight="m"
              >
                <Ionicons 
                  name={isLongSleep ? 'moon' : 'cloudy-night'} 
                  size={22} 
                  color={isLongSleep ? theme.colors.white : theme.colors.primary} 
                />
              </Box>

              {/* Time Info */}
              <Box flex={1}>
                <Text variant="body" fontWeight="600">
                  {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                </Text>
                <Text variant="caption" color="secondaryText" marginTop="xs">
                  {format(startDate, 'EEEE, MMM d')}
                </Text>
              </Box>

              {/* Duration Badge */}
              <Box 
                backgroundColor={isShortNap ? 'warning' : isLongSleep ? 'sleepBedtime' : 'primaryLight'} 
                paddingHorizontal="m" 
                paddingVertical="xs" 
                borderRadius="round"
              >
                <Text 
                  variant="caption" 
                  color={isShortNap || isLongSleep ? 'white' : 'primary'} 
                  fontWeight="600"
                >
                  {formatDuration(durationMins)}
                </Text>
              </Box>

              {/* Expand Icon */}
              <Box marginLeft="s">
                <Ionicons 
                  name={expanded ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  color={theme.colors.secondaryText} 
                />
              </Box>
            </Box>

            {/* Expanded Details */}
            {expanded && (
              <Box marginTop="m" paddingTop="m" style={{ borderTopWidth: 1, borderTopColor: theme.colors.gray100 }}>
                <Box flexDirection="row" flexWrap="wrap">
                  {/* Source Badge */}
                  <Box 
                    flexDirection="row" 
                    alignItems="center" 
                    backgroundColor="mainBackground" 
                    paddingHorizontal="s" 
                    paddingVertical="xs" 
                    borderRadius="s"
                    marginRight="s"
                    marginBottom="s"
                  >
                    <Ionicons 
                      name={session.source === 'timer' ? 'timer-outline' : 'create-outline'} 
                      size={14} 
                      color={theme.colors.secondaryText} 
                    />
                    <Text variant="label" marginLeft="xs">
                      {session.source === 'timer' ? 'Timer' : 'Manual'}
                    </Text>
                  </Box>

                  {/* Quality Badge */}
                  {session.quality && (
                    <Box 
                      flexDirection="row" 
                      alignItems="center" 
                      backgroundColor="mainBackground" 
                      paddingHorizontal="s" 
                      paddingVertical="xs" 
                      borderRadius="s"
                      marginRight="s"
                      marginBottom="s"
                    >
                      <Ionicons name="star" size={14} color={theme.colors.warning} />
                      <Text variant="label" marginLeft="xs">
                        Quality: {session.quality}/5
                      </Text>
                    </Box>
                  )}

                  {/* Short Nap Warning */}
                  {isShortNap && (
                    <Box 
                      flexDirection="row" 
                      alignItems="center" 
                      backgroundColor="warning" 
                      paddingHorizontal="s" 
                      paddingVertical="xs" 
                      borderRadius="s"
                      marginBottom="s"
                    >
                      <Ionicons name="warning" size={14} color={theme.colors.white} />
                      <Text variant="label" color="white" marginLeft="xs">
                        Short Nap
                      </Text>
                    </Box>
                  )}
                </Box>

                {/* Detailed Info */}
                <Box marginTop="s">
                  <Box flexDirection="row" justifyContent="space-between" marginBottom="xs">
                    <Text variant="caption" color="secondaryText">Started</Text>
                    <Text variant="caption">{format(startDate, 'PPpp')}</Text>
                  </Box>
                  <Box flexDirection="row" justifyContent="space-between" marginBottom="xs">
                    <Text variant="caption" color="secondaryText">Ended</Text>
                    <Text variant="caption">{format(endDate, 'PPpp')}</Text>
                  </Box>
                  <Box flexDirection="row" justifyContent="space-between">
                    <Text variant="caption" color="secondaryText">Duration</Text>
                    <Text variant="caption">{durationMins} minutes ({formatDuration(durationMins)})</Text>
                  </Box>
                </Box>

                {/* Notes */}
                {session.notes && (
                  <Box marginTop="m" padding="s" backgroundColor="mainBackground" borderRadius="s">
                    <Text variant="caption" color="secondaryText" marginBottom="xs">Notes</Text>
                    <Text variant="body">{session.notes}</Text>
                  </Box>
                )}

                {/* Long press hint */}
                <Box marginTop="m" alignItems="center">
                  <Text variant="caption" color="tertiaryText">
                    Long press to delete
                  </Text>
                </Box>
              </Box>
            )}
          </Box>
        </Animated.View>
      )}
    </Pressable>
  );
};
