import { LearnerState, SleepSession } from '../types';
import { AGE_BASELINES, DEFAULT_LEARNER_STATE } from '../constants/baselines';
import { differenceInMinutes, parseISO } from 'date-fns';

const ALPHA = 0.3; // Smoothing factor

export const getBaselineForAge = (ageMonths: number) => {
  return AGE_BASELINES.find(
    (b) => ageMonths >= b.minAgeMonths && ageMonths <= b.maxAgeMonths
  ) || AGE_BASELINES[AGE_BASELINES.length - 1];
};

export const updateLearnerState = (
  currentState: LearnerState | null | undefined = DEFAULT_LEARNER_STATE,
  sessions: SleepSession[] = [],
  ageMonths: number
): LearnerState => {
  // Accept null/undefined initial state
  const state = currentState || DEFAULT_LEARNER_STATE;  // Filter valid recent sessions (last 7 days)
  const now = new Date();
  const validSessions = sessions
    .filter((s) => !s.deleted && s.endISO)
    .sort((a, b) => a.startISO.localeCompare(b.startISO));

  if (validSessions.length === 0) return state;

  let ewmaNap = state.ewmaNapLengthMin;
  let ewmaWake = state.ewmaWakeWindowMin;
  let confidence = state.confidence;

  // Recalculate from scratch or update incrementally? 
  // For robustness, let's iterate through recent history to rebuild EWMA
  // This handles edits/deletes better than incremental updates
  
  // Reset to baseline for age
  const baseline = getBaselineForAge(ageMonths);
  ewmaNap = (baseline.napMin + baseline.napMax) / 2;
  ewmaWake = (baseline.wakeWindowMin + baseline.wakeWindowMax) / 2;
  
  let consistencyCount = 0;
  const initial = !currentState;
  let seededNap = false;
  let seededWake = false;

  validSessions.forEach((session, index) => {
    const start = parseISO(session.startISO);
    const end = parseISO(session.endISO!);
    const duration = differenceInMinutes(end, start);

    // Is this a nap or night sleep? 
    const isNap = duration < 240; 

    if (isNap) {
      // Clamp to reasonable limits
      const clampedDuration = Math.max(10, Math.min(duration, 180));
      if (initial && !seededNap) {
        ewmaNap = clampedDuration; // seed with first observed nap
        seededNap = true;
      } else {
        ewmaNap = ALPHA * clampedDuration + (1 - ALPHA) * ewmaNap;
      }
      consistencyCount++;
    }

    // Calculate Wake Window (time since previous sleep ended)
    if (index > 0) {
      const prevSession = validSessions[index - 1];
      const prevEnd = parseISO(prevSession.endISO!);
      const wakeWindow = differenceInMinutes(start, prevEnd);
      
      // Valid wake window? (e.g. < 12 hours)
      if (wakeWindow > 0 && wakeWindow < 720) {
         // Clamp
         const clampedWake = Math.max(30, Math.min(wakeWindow, 400));
         if (initial && !seededWake) {
           ewmaWake = clampedWake; // seed with first observed wake
           seededWake = true;
         } else {
           ewmaWake = ALPHA * clampedWake + (1 - ALPHA) * ewmaWake;
         }
         consistencyCount++;
      }
    }
  });

  // Confidence logic: more data points = higher confidence
  // Cap at 1.0
  confidence = Math.min(0.3 + (consistencyCount * 0.05), 1.0);

  return {
    version: state.version ?? 1,
    ewmaNapLengthMin: Math.round(ewmaNap),
    ewmaWakeWindowMin: Math.round(ewmaWake),
    lastUpdatedISO: new Date().toISOString(),
    confidence,
  };
};
