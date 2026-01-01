// Validation constraints for sleep tracking

export const VALIDATION_CONSTRAINTS = {
  // Minimum sleep session duration in minutes
  MIN_SLEEP_DURATION_MINUTES: 10,
  
  // Maximum sleep session duration in hours (to catch accidental timer runs)
  MAX_SLEEP_DURATION_HOURS: 16,
  
  // Minimum wake duration in minutes (prevents rapid toggling)
  MIN_WAKE_DURATION_MINUTES: 5,
  
  // Maximum age for baby in months (2 years)
  MAX_BABY_AGE_MONTHS: 24,
} as const;

export const VALIDATION_MESSAGES = {
  MIN_SLEEP: `Sleep session must be at least ${VALIDATION_CONSTRAINTS.MIN_SLEEP_DURATION_MINUTES} minutes`,
  MAX_SLEEP: `Sleep session cannot exceed ${VALIDATION_CONSTRAINTS.MAX_SLEEP_DURATION_HOURS} hours`,
  MIN_WAKE: `Wake time must be at least ${VALIDATION_CONSTRAINTS.MIN_WAKE_DURATION_MINUTES} minutes`,
  START_BEFORE_END: 'Start time must be before end time',
  FUTURE_DATE: 'Cannot log sleep sessions in the future',
} as const;
