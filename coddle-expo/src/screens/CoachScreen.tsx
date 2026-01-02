import React, { useState, useMemo } from 'react';
import { ScrollView, StyleSheet, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useStore } from '../store/useStore';
import { Box, Text } from '../components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shopify/restyle';
import { Theme } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CoachTip } from '../types';
import { format, parseISO } from 'date-fns';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const CoachScreen = () => {
  const theme = useTheme<Theme>();
  const insets = useSafeAreaInsets();
  const coachTips = useStore(state => state.coachTips);
  const sessions = useStore(state => state.sessions);
  const learnerState = useStore(state => state.learnerState);
  const [expandedTipId, setExpandedTipId] = useState<string | null>(null);
  const [highlightedSessionIds, setHighlightedSessionIds] = useState<string[]>([]);

  const handleTipPress = (tip: CoachTip) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (expandedTipId === tip.id) {
      setExpandedTipId(null);
      setHighlightedSessionIds([]);
    } else {
      setExpandedTipId(tip.id);
      setHighlightedSessionIds(tip.relatedSessionIds || []);
    }
  };

  const getTipIcon = (type: string) => {
    switch (type) {
      case 'warning': return 'alert-circle';
      case 'success': return 'checkmark-circle';
      default: return 'information-circle';
    }
  };

  const getTipColor = (type: string) => {
    switch (type) {
      case 'warning': return theme.colors.warning;
      case 'success': return theme.colors.success;
      default: return theme.colors.primary;
    }
  };

  const getTipPriority = (tip: CoachTip): number => {
    // Higher priority = shows first
    if (tip.type === 'warning') return 3;
    if (tip.type === 'info') return 2;
    if (tip.type === 'success') return 1;
    return 0;
  };

  const sortedTips = useMemo(() => {
    return [...coachTips].sort((a, b) => getTipPriority(b) - getTipPriority(a));
  }, [coachTips]);

  const relatedSessions = useMemo(() => {
    if (highlightedSessionIds.length === 0) return [];
    return sessions
      .filter(s => highlightedSessionIds.includes(s.id) && !s.deleted)
      .sort((a, b) => b.startISO.localeCompare(a.startISO));
  }, [highlightedSessionIds, sessions]);

  return (
    <Box flex={1} backgroundColor="mainBackground">
      <ScrollView 
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Box marginBottom="l">
          <Box flexDirection="row" alignItems="center" marginBottom="s">
            <Ionicons name="bulb" size={32} color={theme.colors.warning} />
            <Text variant="header" marginLeft="s">Coach</Text>
          </Box>
          <Text variant="body" color="secondaryText">
            Personalized insights based on sleep patterns
          </Text>
        </Box>

        {/* Confidence Indicator */}
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
          <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="m">
            <Text variant="subtitle">Pattern Confidence</Text>
            <Text variant="body" fontWeight="600" color="primary">
              {Math.round(learnerState.confidence * 100)}%
            </Text>
          </Box>
          
          {/* Confidence Bar */}
          <Box
            height={8}
            backgroundColor="gray100"
            borderRadius="round"
            overflow="hidden"
          >
            <Box
              height={8}
              backgroundColor={
                learnerState.confidence >= 0.75 ? 'success' : 
                learnerState.confidence >= 0.5 ? 'warning' : 
                'error'
              }
              style={{ width: `${learnerState.confidence * 100}%` }}
            />
          </Box>
          
          <Text variant="caption" color="secondaryText" marginTop="s">
            {learnerState.confidence >= 0.75 
              ? 'High confidence - predictions are reliable'
              : learnerState.confidence >= 0.5
              ? 'Medium confidence - keep logging for better predictions'
              : 'Low confidence - more data needed'}
          </Text>
        </Box>

        {/* Tips List */}
        {sortedTips.length === 0 ? (
          <Box
            backgroundColor="cardBackground"
            borderRadius="l"
            padding="xl"
            alignItems="center"
          >
            <Ionicons name="checkmark-circle-outline" size={64} color={theme.colors.success} />
            <Text variant="subtitle" marginTop="m" textAlign="center">
              All Clear!
            </Text>
            <Text variant="body" color="secondaryText" textAlign="center" marginTop="s">
              No issues detected. Your sleep patterns look great!
            </Text>
          </Box>
        ) : (
          <Box>
            <Box flexDirection="row" alignItems="center" marginBottom="m">
              <Box width={4} height={20} backgroundColor="primary" borderRadius="s" marginRight="s" />
              <Text variant="subtitle">Insights & Tips</Text>
              <Box 
                backgroundColor="primaryLight" 
                borderRadius="round" 
                paddingHorizontal="s" 
                paddingVertical="xs" 
                marginLeft="s"
              >
                <Text variant="caption" color="primary" fontWeight="600">
                  {sortedTips.length}
                </Text>
              </Box>
            </Box>

            {sortedTips.map((tip, index) => {
              const isExpanded = expandedTipId === tip.id;
              const tipColor = getTipColor(tip.type);
              const tipIcon = getTipIcon(tip.type);

              return (
                <Pressable key={tip.id} onPress={() => handleTipPress(tip)}>
                  <Box
                    backgroundColor="cardBackground"
                    borderRadius="l"
                    marginBottom="m"
                    overflow="hidden"
                    style={{ 
                      borderLeftWidth: 4, 
                      borderLeftColor: tipColor 
                    }}
                    shadowColor="black"
                    shadowOpacity={isExpanded ? 0.15 : 0.05}
                    shadowRadius={isExpanded ? 12 : 8}
                    shadowOffset={{ width: 0, height: 2 }}
                  >
                    <Box padding="m">
                      {/* Tip Header */}
                      <Box flexDirection="row" alignItems="flex-start">
                        <Box
                          width={40}
                          height={40}
                          borderRadius="m"
                          alignItems="center"
                          justifyContent="center"
                          marginRight="m"
                          style={{ backgroundColor: tipColor + '20' }}
                        >
                          <Ionicons name={tipIcon} size={24} color={tipColor} />
                        </Box>
                        
                        <Box flex={1}>
                          <Box flexDirection="row" alignItems="center" marginBottom="xs">
                            <Text variant="subtitle" fontSize={16} flex={1}>
                              {tip.title}
                            </Text>
                            <Ionicons 
                              name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                              size={20} 
                              color={theme.colors.secondaryText} 
                            />
                          </Box>
                          
                          {!isExpanded && (
                            <Text variant="body" color="secondaryText" numberOfLines={2}>
                              {tip.message}
                            </Text>
                          )}
                        </Box>
                      </Box>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <Box marginTop="m" paddingTop="m" style={{ borderTopWidth: 1, borderTopColor: theme.colors.gray100 }}>
                          <Text variant="body" marginBottom="m">
                            {tip.message}
                          </Text>

                          <Box flexDirection="row" alignItems="center" marginBottom="m">
                            <Box 
                              backgroundColor="primaryLight"
                              paddingHorizontal="m" 
                              paddingVertical="xs" 
                              borderRadius="s"
                              style={{ opacity: 0.3 }}
                            >
                              <Text variant="caption" style={{ color: tipColor }} fontWeight="600">
                                {tip.type === 'warning' ? 'High Priority' : 
                                 tip.type === 'info' ? 'Medium Priority' : 
                                 'Low Priority'}
                              </Text>
                            </Box>
                          </Box>

                          {/* Related Sessions */}
                          {relatedSessions.length > 0 && (
                            <Box>
                              <Box flexDirection="row" alignItems="center" marginBottom="s">
                                <Ionicons name="link-outline" size={16} color={theme.colors.secondaryText} />
                                <Text variant="body" fontWeight="600" marginLeft="xs">
                                  Related Sessions ({relatedSessions.length})
                                </Text>
                              </Box>
                              
                              <Box 
                                backgroundColor="cardBackground"
                                borderRadius="m" 
                                padding="s"
                                style={{ backgroundColor: theme.colors.gray100 }}
                              >
                                {relatedSessions.slice(0, 3).map((session, idx) => {
                                  const start = parseISO(session.startISO);
                                  const end = session.endISO ? parseISO(session.endISO) : null;
                                  const duration = end ? Math.round((end.getTime() - start.getTime()) / 60000) : 0;
                                  
                                  return (
                                    <Box 
                                      key={session.id} 
                                      flexDirection="row" 
                                      justifyContent="space-between" 
                                      paddingVertical="xs"
                                      style={{ 
                                        borderBottomWidth: idx < Math.min(relatedSessions.length, 3) - 1 ? 1 : 0,
                                        borderBottomColor: theme.colors.cardBackground 
                                      }}
                                    >
                                      <Text variant="caption" color="secondaryText">
                                        {format(start, 'MMM d, h:mm a')}
                                      </Text>
                                      <Text variant="caption" fontWeight="600">
                                        {duration}min
                                      </Text>
                                    </Box>
                                  );
                                })}
                                
                                {relatedSessions.length > 3 && (
                                  <Text variant="caption" color="secondaryText" marginTop="xs" textAlign="center">
                                    +{relatedSessions.length - 3} more
                                  </Text>
                                )}
                              </Box>
                            </Box>
                          )}

                          {/* Action Hint */}
                          <Box 
                            flexDirection="row" 
                            alignItems="center" 
                            marginTop="m"
                            backgroundColor="primaryLight"
                            padding="s"
                            borderRadius="s"
                          >
                            <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} />
                            <Text variant="caption" color="primary" marginLeft="xs" flex={1}>
                              Tap related sessions in Timeline to review details
                            </Text>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Pressable>
              );
            })}
          </Box>
        )}
      </ScrollView>
    </Box>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20 },
});
