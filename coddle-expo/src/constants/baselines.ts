/**
 * Age-based baseline wake windows and sleep patterns
 * Based on research and standard sleep recommendations for babies
 * 
 * EWMA Alpha Parameter: 0.3
 * - Gives more weight to recent data while still considering history
 * - Balance between responsiveness and stability
 * - Formula: newValue = alpha * observed + (1 - alpha) * oldValue
 */

export interface AgeBaseline {
  minAgeMonths: number;
  maxAgeMonths: number;
  wakeWindowMin: number;
  wakeWindowTypical: number;
  wakeWindowMax: number;
  napMin: number;
  napTypical: number;
  napMax: number;
  totalDaySleepMin: number;
  totalDaySleepMax: number;
  napsPerDay: number;
  description: string;
}

export const AGE_BASELINES: AgeBaseline[] = [
  { 
    minAgeMonths: 0, 
    maxAgeMonths: 3, 
    wakeWindowMin: 30,
    wakeWindowTypical: 60,
    wakeWindowMax: 90, 
    napMin: 30,
    napTypical: 45,
    napMax: 120, 
    totalDaySleepMin: 240, 
    totalDaySleepMax: 480,
    napsPerDay: 5,
    description: 'Newborn (0-3 months)',
  },
  { 
    minAgeMonths: 4, 
    maxAgeMonths: 6, 
    wakeWindowMin: 75,
    wakeWindowTypical: 105,
    wakeWindowMax: 150, 
    napMin: 45,
    napTypical: 60,
    napMax: 120, 
    totalDaySleepMin: 180, 
    totalDaySleepMax: 240,
    napsPerDay: 4,
    description: 'Infant (4-6 months)',
  },
  { 
    minAgeMonths: 7, 
    maxAgeMonths: 12, 
    wakeWindowMin: 120,
    wakeWindowTypical: 150,
    wakeWindowMax: 210, 
    napMin: 45,
    napTypical: 75,
    napMax: 120, 
    totalDaySleepMin: 120, 
    totalDaySleepMax: 180,
    napsPerDay: 3,
    description: 'Baby (7-12 months)',
  },
  { 
    minAgeMonths: 13, 
    maxAgeMonths: 18,
    wakeWindowMin: 180,
    wakeWindowTypical: 210,
    wakeWindowMax: 270, 
    napMin: 60,
    napTypical: 90,
    napMax: 150, 
    totalDaySleepMin: 90, 
    totalDaySleepMax: 150,
    napsPerDay: 2,
    description: 'Toddler (13-18 months)',
  },
  { 
    minAgeMonths: 19, 
    maxAgeMonths: 36,
    wakeWindowMin: 240,
    wakeWindowTypical: 300,
    wakeWindowMax: 360, 
    napMin: 60,
    napTypical: 120,
    napMax: 180, 
    totalDaySleepMin: 60, 
    totalDaySleepMax: 150,
    napsPerDay: 1,
    description: 'Toddler (19-36 months)',
  },
];

export const DEFAULT_LEARNER_STATE = {
  version: 1,
  ewmaNapLengthMin: 60,
  ewmaWakeWindowMin: 90,
  lastUpdatedISO: new Date().toISOString(),
  confidence: 0.5,
};

/**
 * EWMA Alpha parameter for learning algorithm
 * Higher alpha = more weight to recent observations
 * Lower alpha = more weight to historical average
 */
export const EWMA_ALPHA = 0.3;

/**
 * Coach rules and thresholds
 */
export const COACH_RULES = {
  SHORT_NAP_THRESHOLD: 30, // minutes - flag naps shorter than this
  SHORT_NAP_STREAK: 3, // consecutive short naps to trigger tip
  LONG_WAKE_THRESHOLD_RATIO: 1.2, // 120% of target wake window
  BEDTIME_VARIANCE_THRESHOLD: 30, // minutes - variance from typical bedtime
  MIN_SESSIONS_FOR_CONFIDENCE: 5, // minimum sessions needed for high confidence
  HIGH_CONFIDENCE_THRESHOLD: 0.75, // confidence level considered "high"
  SPLIT_NIGHT_MIN_WAKE: 60, // minutes - wake during night considered "split night"
};

export const getBaselineForAge = (ageMonths: number): AgeBaseline => {
  return AGE_BASELINES.find(b => ageMonths >= b.minAgeMonths && ageMonths <= b.maxAgeMonths) || AGE_BASELINES[AGE_BASELINES.length - 1];
};

/**
 * Calculate age in months from birthdate
 */
export const calculateAgeInMonths = (birthDateISO: string): number => {
  const birthDate = new Date(birthDateISO);
  const now = new Date();
  
  const years = now.getFullYear() - birthDate.getFullYear();
  const months = now.getMonth() - birthDate.getMonth();
  const days = now.getDate() - birthDate.getDate();
  
  let totalMonths = years * 12 + months;
  if (days < 0) {
    totalMonths -= 1;
  }
  
  return Math.max(0, totalMonths);
};

/**
 * Clamp value to safe min/max based on age
 */
export const clampToAgeBaseline = (
  value: number,
  ageInMonths: number,
  type: 'wakeWindow' | 'napLength'
): number => {
  const baseline = getBaselineForAge(ageInMonths);
  const min = type === 'wakeWindow' ? baseline.wakeWindowMin : baseline.napMin;
  const max = type === 'wakeWindow' ? baseline.wakeWindowMax : baseline.napMax;
  
  return Math.max(min, Math.min(max, value));
};

