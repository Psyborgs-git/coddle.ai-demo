import { LearnerState, ScheduleBlock, SleepSession, BabyProfile } from '../types';
import { addMinutes, format, parseISO, isBefore, startOfDay, addDays, differenceInMinutes, setHours, setMinutes } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { getBaselineForAge, calculateAgeInMonths } from '../constants/baselines';

/**
 * Generate schedule blocks for today and tomorrow based on learner state
 * Implements confidence bands and rationale for each block
 */
export const generateSchedule = (
  learnerState: LearnerState,
  lastSession: SleepSession | null,
  activeProfile: BabyProfile | null,
  now: Date | null = null
): ScheduleBlock[] => {
  const schedule: ScheduleBlock[] = [];
  const current = now || new Date();
  
  // Get age-based baseline
  const ageInMonths = activeProfile ? calculateAgeInMonths(activeProfile.birthDateISO) : 6;
  const baseline = getBaselineForAge(ageInMonths);
  
  // Determine starting point
  let simulationTime = current;
  let isCurrentlyAsleep = false;
  
  if (lastSession) {
    const lastEnd = lastSession.endISO ? parseISO(lastSession.endISO) : null;
    const lastStart = parseISO(lastSession.startISO);
    
    if (!lastEnd) {
      // Currently asleep - predict wake time
      const predictedWake = addMinutes(lastStart, learnerState.ewmaNapLengthMin);
      simulationTime = isBefore(predictedWake, current) ? current : predictedWake;
      isCurrentlyAsleep = true;
    } else {
      // Currently awake - use last wake time
      simulationTime = isBefore(lastEnd, current) ? current : lastEnd;
    }
  }

  // Generate blocks for rest of today and tomorrow
  const endOfTomorrow = addDays(startOfDay(current), 2);
  
  // Track for confidence calculation
  let blockCount = 0;
  const maxBlocks = 20;
  
  // Typical bedtime (7:00 PM) and wake time (6:00 AM)
  const typicalBedtimeHour = 19;
  const typicalWakeHour = 6;

  while (isBefore(simulationTime, endOfTomorrow) && blockCount < maxBlocks) {
    blockCount++;
    
    // Calculate next sleep start (wake window)
    const nextSleepStart = addMinutes(simulationTime, learnerState.ewmaWakeWindowMin);
    const hour = parseInt(format(nextSleepStart, 'H'));
    
    // Determine if this is a nap or bedtime
    // Bedtime: between 6 PM and 10 PM, or if it's been a long wake window suggesting end of day
    const isBedtime = (hour >= typicalBedtimeHour && hour <= 22) || 
                      (hour >= 0 && hour < 4);
    
    const kind: 'nap' | 'bedtime' = isBedtime ? 'bedtime' : 'nap';
    
    // Calculate sleep duration
    let sleepDuration: number;
    let confidenceAdjustment = 0;
    
    if (isBedtime) {
      // Night sleep: 10-12 hours
      sleepDuration = 660; // 11 hours default
      confidenceAdjustment = -0.1; // Slightly less confident about night sleep prediction
    } else {
      // Nap: use learned nap length
      sleepDuration = learnerState.ewmaNapLengthMin;
      // Clamp to age-appropriate range
      sleepDuration = Math.max(baseline.napMin, Math.min(baseline.napMax, sleepDuration));
    }
    
    // Calculate confidence for this block
    // Higher confidence = more data + consistency
    const blockConfidence = Math.max(0.1, Math.min(1.0, 
      learnerState.confidence + confidenceAdjustment
    ));
    
    // Generate rationale
    let rationale = '';
    if (isBedtime) {
      rationale = `Bedtime based on ${learnerState.ewmaWakeWindowMin}m wake window and typical evening schedule`;
    } else {
      const baselineStr = baseline.wakeWindowTypical;
      const learnedDiff = learnerState.ewmaWakeWindowMin - baselineStr;
      const comparison = Math.abs(learnedDiff) < 15 ? 'aligned with' : 
                         learnedDiff > 0 ? 'adjusted above' : 'adjusted below';
      rationale = `Nap ${comparison} ${baselineStr}m baseline (${ageInMonths}mo)`;
    }
    
    // Add wind-down block (15 minutes before sleep for naps, 20 for bedtime)
    const windDownDuration = isBedtime ? 20 : 15;
    const windDownStart = addMinutes(nextSleepStart, -windDownDuration);
    
    if (isBefore(current, nextSleepStart) && isBefore(windDownStart, endOfTomorrow)) {
      schedule.push({
        id: uuidv4(),
        kind: 'windDown',
        startISO: windDownStart.toISOString(),
        endISO: nextSleepStart.toISOString(),
        confidence: blockConfidence,
        rationale: `${windDownDuration}m wind-down before ${kind}`,
      });
    }
    
    // Add sleep block
    const nextSleepEnd = addMinutes(nextSleepStart, sleepDuration);
    
    if (isBefore(current, nextSleepEnd) && isBefore(nextSleepStart, endOfTomorrow)) {
      schedule.push({
        id: uuidv4(),
        kind,
        startISO: nextSleepStart.toISOString(),
        endISO: nextSleepEnd.toISOString(),
        confidence: blockConfidence,
        rationale,
      });
    }
    
    // Advance simulation to end of sleep
    simulationTime = nextSleepEnd;
    
    // If bedtime, we've moved to next morning - reduce wake window for first morning nap
    if (isBedtime) {
      // First wake window of the day is often shorter
      simulationTime = addMinutes(simulationTime, -15);
    }
  }

  return schedule;
};

/**
 * Generate "what-if" schedule with adjusted wake window
 * @param adjustment - Minutes to add/subtract from wake window (-30 to +30)
 */
export const generateWhatIfSchedule = (
  learnerState: LearnerState,
  lastSession: SleepSession | null,
  activeProfile: BabyProfile | null,
  adjustment: number,
  now: Date | null = null
): ScheduleBlock[] => {
  // Create adjusted learner state
  const adjustedState: LearnerState = {
    ...learnerState,
    ewmaWakeWindowMin: learnerState.ewmaWakeWindowMin + adjustment,
    confidence: Math.max(0.1, learnerState.confidence - Math.abs(adjustment) / 100),
  };
  
  return generateSchedule(adjustedState, lastSession, activeProfile, now);
};

