import { CoachTip, LearnerState, SleepSession, BabyProfile } from '../types';
import { COACH_RULES, getBaselineForAge, calculateAgeInMonths } from '../constants/baselines';
import { differenceInMinutes, parseISO, startOfDay, format, isSameDay, setHours } from 'date-fns';

/**
 * Generate comprehensive coach tips based on sleep patterns
 * Includes: short nap streaks, long wake windows, bedtime drift, 
 * split nights, inconsistency detection
 */
export const generateCoachTips = (
  sessions: SleepSession[],
  learnerState: LearnerState,
  activeProfile: BabyProfile | null
): CoachTip[] => {
  const tips: CoachTip[] = [];
  const validSessions = sessions.filter(s => !s.deleted && s.endISO).sort((a, b) => b.startISO.localeCompare(a.startISO)); // Newest first
  
  if (validSessions.length === 0) return tips;

  const ageMonths = activeProfile ? calculateAgeInMonths(activeProfile.birthDateISO) : 6;
  const baseline = getBaselineForAge(ageMonths);

  // Helper: Classify session as nap or night sleep
  const isNap = (session: SleepSession) => {
    const duration = differenceInMinutes(parseISO(session.endISO!), parseISO(session.startISO));
    return duration < 240; // Less than 4 hours = nap
  };

  // Helper: Get bedtime sessions (night sleep starting between 6 PM - 10 PM)
  const getBedtimeSessions = () => {
    return validSessions.filter(s => {
      if (isNap(s)) return false;
      const startHour = parseISO(s.startISO).getHours();
      return startHour >= 18 || startHour <= 3; // 6 PM to 3 AM
    });
  };

  // 1. Short Nap Streak
  const recentNaps = validSessions.filter(s => isNap(s)).slice(0, COACH_RULES.SHORT_NAP_STREAK);
  let shortNapCount = 0;
  
  recentNaps.forEach(s => {
    const duration = differenceInMinutes(parseISO(s.endISO!), parseISO(s.startISO));
    if (duration < COACH_RULES.SHORT_NAP_THRESHOLD) shortNapCount++;
  });

  if (shortNapCount >= 2 && recentNaps.length >= 2) {
    tips.push({
      id: 'short-nap-streak',
      title: 'Short Nap Streak',
      message: `${shortNapCount} of the last ${recentNaps.length} naps were under ${COACH_RULES.SHORT_NAP_THRESHOLD} minutes. Try extending wind-down routine or checking room environment (darkness, temperature, white noise).`,
      type: 'warning',
      relatedSessionIds: recentNaps.filter(s => 
        differenceInMinutes(parseISO(s.endISO!), parseISO(s.startISO)) < COACH_RULES.SHORT_NAP_THRESHOLD
      ).map(s => s.id)
    });
  }

  // 2. Overtired / Long Wake Window
  if (validSessions.length >= 2) {
    const lastSleep = validSessions[0];
    const prevSleep = validSessions[1];
    const wakeWindow = differenceInMinutes(parseISO(lastSleep.startISO), parseISO(prevSleep.endISO!));
    
    if (wakeWindow > baseline.wakeWindowMax * COACH_RULES.LONG_WAKE_THRESHOLD_RATIO) {
      tips.push({
        id: 'overtired',
        title: 'Long Wake Window Detected',
        message: `Last wake window was ${Math.round(wakeWindow/60*10)/10}h, which exceeds ${Math.round(baseline.wakeWindowMax/60*10)/10}h recommended for this age. Baby may be overtired. Consider shortening next wake window by 15-30 minutes.`,
        type: 'warning',
        relatedSessionIds: [lastSleep.id, prevSleep.id]
      });
    }
  }

  // 3. Bedtime Drift Detection
  const bedtimeSessions = getBedtimeSessions().slice(0, 7); // Last 7 bedtimes
  if (bedtimeSessions.length >= 3) {
    const bedtimeTimes = bedtimeSessions.map(s => {
      const start = parseISO(s.startISO);
      return start.getHours() * 60 + start.getMinutes();
    });
    
    const avgBedtime = bedtimeTimes.reduce((a, b) => a + b, 0) / bedtimeTimes.length;
    const latestBedtime = bedtimeTimes[0]; // Most recent
    const drift = Math.abs(latestBedtime - avgBedtime);
    
    if (drift > COACH_RULES.BEDTIME_VARIANCE_THRESHOLD) {
      const direction = latestBedtime > avgBedtime ? 'later' : 'earlier';
      const avgHour = Math.floor(avgBedtime / 60);
      const avgMin = Math.floor(avgBedtime % 60);
      
      tips.push({
        id: 'bedtime-drift',
        title: `Bedtime Drifting ${direction === 'later' ? 'Later' : 'Earlier'}`,
        message: `Recent bedtime is ${Math.round(drift)} minutes ${direction} than average (${avgHour}:${avgMin.toString().padStart(2, '0')}). Try to maintain consistent bedtime routine to improve sleep quality.`,
        type: 'info',
        relatedSessionIds: [bedtimeSessions[0].id]
      });
    }
  }

  // 4. Split Night Detection
  // Check for middle-of-night wake periods during night sleep
  const nightSessions = validSessions.filter(s => !isNap(s)).slice(0, 3);
  
  for (const session of nightSessions) {
    const start = parseISO(session.startISO);
    const end = parseISO(session.endISO!);
    const duration = differenceInMinutes(end, start);
    
    // Check if there was a gap in the middle of the night
    // Look for other sessions that might indicate split night
    const sameNightSessions = validSessions.filter(other => {
      if (other.id === session.id) return false;
      const otherStart = parseISO(other.startISO);
      const otherEnd = parseISO(other.endISO!);
      
      // Check if other session is within the expected night sleep period
      return otherStart > start && otherEnd < end;
    });
    
    if (sameNightSessions.length > 0) {
      tips.push({
        id: `split-night-${session.id}`,
        title: 'Split Night Detected',
        message: 'Baby had a wake period during the night. This might indicate too much daytime sleep or late bedtime. Consider adjusting daytime nap schedule.',
        type: 'warning',
        relatedSessionIds: [session.id, ...sameNightSessions.map(s => s.id)]
      });
      break; // Only show one split night tip
    }
  }

  // 5. Inconsistency Detection
  if (learnerState.confidence < COACH_RULES.HIGH_CONFIDENCE_THRESHOLD && validSessions.length >= COACH_RULES.MIN_SESSIONS_FOR_CONFIDENCE) {
    const napDurations = validSessions.filter(s => isNap(s)).slice(0, 10).map(s => 
      differenceInMinutes(parseISO(s.endISO!), parseISO(s.startISO))
    );
    
    if (napDurations.length >= 5) {
      const avg = napDurations.reduce((a, b) => a + b, 0) / napDurations.length;
      const variance = napDurations.reduce((sum, dur) => sum + Math.pow(dur - avg, 2), 0) / napDurations.length;
      const stdDev = Math.sqrt(variance);
      
      if (stdDev > 30) { // High variance (>30 min standard deviation)
        tips.push({
          id: 'inconsistent-schedule',
          title: 'Inconsistent Sleep Patterns',
          message: `Sleep durations vary significantly (avg: ${Math.round(avg)}min, variance: \u00b1${Math.round(stdDev)}min). Try to maintain consistent wake windows and bedtime routines to help establish predictable patterns.`,
          type: 'info',
          relatedSessionIds: validSessions.filter(s => isNap(s)).slice(0, 5).map(s => s.id)
        });
      }
    }
  }

  // 6. High Confidence Success Message
  if (learnerState.confidence >= COACH_RULES.HIGH_CONFIDENCE_THRESHOLD && validSessions.length >= COACH_RULES.MIN_SESSIONS_FOR_CONFIDENCE) {
    tips.push({
      id: 'high-confidence',
      title: 'Great Sleep Consistency! 🎉',
      message: `Sleep patterns are ${Math.round(learnerState.confidence * 100)}% consistent. Keep up the great work with the current routine!`,
      type: 'success',
      relatedSessionIds: []
    });
  }

  // 7. Insufficient Data
  if (validSessions.length < COACH_RULES.MIN_SESSIONS_FOR_CONFIDENCE) {
    tips.push({
      id: 'insufficient-data',
      title: 'Keep Logging Sleep Sessions',
      message: `${COACH_RULES.MIN_SESSIONS_FOR_CONFIDENCE - validSessions.length} more sessions needed for personalized insights. Continue tracking to unlock smart predictions!`,
      type: 'info',
      relatedSessionIds: []
    });
  }

  return tips;
};
