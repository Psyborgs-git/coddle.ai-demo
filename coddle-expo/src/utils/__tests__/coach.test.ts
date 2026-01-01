import { generateCoachTips } from '../coach';
import { SleepSession, LearnerState, BabyProfile } from '../../types';
import { COACH_RULES } from '../../constants/baselines';

describe('Coach Tips Generator', () => {
  const baseLearnerState: LearnerState = {
    version: 1,
    ewmaNapLengthMin: 60,
    ewmaWakeWindowMin: 120,
    lastUpdatedISO: '2023-01-01T12:00:00Z',
    confidence: 0.7
  };

  // Calculate a birthdate that makes the baby 6 months old TODAY (not relative to test dates)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const mockProfile: BabyProfile = {
    id: '1',
    name: 'Test Baby',
    birthDateISO: sixMonthsAgo.toISOString().split('T')[0], // 6 months old
    avatarEmoji: '👶',
    createdAtISO: '2023-01-01T00:00:00Z'
  };

  it('should detect short nap streak', () => {
    const sessions: SleepSession[] = [
      {
        id: '1',
        startISO: '2023-01-01T10:00:00Z',
        endISO: '2023-01-01T10:25:00Z', // 25 min - short
        source: 'manual',
        updatedAtISO: '2023-01-01T10:25:00Z'
      },
      {
        id: '2',
        startISO: '2023-01-01T13:00:00Z',
        endISO: '2023-01-01T13:20:00Z', // 20 min - short
        source: 'manual',
        updatedAtISO: '2023-01-01T13:20:00Z'
      },
      {
        id: '3',
        startISO: '2023-01-01T16:00:00Z',
        endISO: '2023-01-01T16:15:00Z', // 15 min - short
        source: 'manual',
        updatedAtISO: '2023-01-01T16:15:00Z'
      },
    ];

    const tips = generateCoachTips(sessions, baseLearnerState, mockProfile);
    
    const shortNapTip = tips.find(t => t.id === 'short-nap-streak');
    expect(shortNapTip).toBeDefined();
    expect(shortNapTip?.type).toBe('warning');
    expect(shortNapTip?.relatedSessionIds?.length).toBeGreaterThan(0);
  });

  it('should detect long wake window', () => {
    const sessions: SleepSession[] = [
      {
        id: '1',
        startISO: '2023-01-01T10:00:00Z',
        endISO: '2023-01-01T11:00:00Z',
        source: 'manual',
        updatedAtISO: '2023-01-01T11:00:00Z'
      },
      {
        id: '2',
        startISO: '2023-01-01T15:00:00Z', // 4 hours later (240 min) - very long
        endISO: '2023-01-01T16:00:00Z',
        source: 'manual',
        updatedAtISO: '2023-01-01T16:00:00Z'
      },
    ];

    const tips = generateCoachTips(sessions, baseLearnerState, mockProfile);
    
    const overtiredTip = tips.find(t => t.id === 'overtired');
    expect(overtiredTip).toBeDefined();
    expect(overtiredTip?.type).toBe('warning');
  });

  it('should detect bedtime drift', () => {
    const sessions: SleepSession[] = [
      // Recent bedtime at 9 PM
      {
        id: '1',
        startISO: '2023-01-05T21:00:00Z',
        endISO: '2023-01-06T07:00:00Z',
        source: 'manual',
        updatedAtISO: '2023-01-06T07:00:00Z'
      },
      // Previous bedtimes at ~7 PM
      {
        id: '2',
        startISO: '2023-01-04T19:00:00Z',
        endISO: '2023-01-05T06:00:00Z',
        source: 'manual',
        updatedAtISO: '2023-01-05T06:00:00Z'
      },
      {
        id: '3',
        startISO: '2023-01-03T19:15:00Z',
        endISO: '2023-01-04T06:30:00Z',
        source: 'manual',
        updatedAtISO: '2023-01-04T06:30:00Z'
      },
      {
        id: '4',
        startISO: '2023-01-02T18:45:00Z',
        endISO: '2023-01-03T06:00:00Z',
        source: 'manual',
        updatedAtISO: '2023-01-03T06:00:00Z'
      },
    ];

    const tips = generateCoachTips(sessions, baseLearnerState, mockProfile);
    
    const bedtimeDriftTip = tips.find(t => t.id === 'bedtime-drift');
    expect(bedtimeDriftTip).toBeDefined();
  });

  it('should detect inconsistent patterns with low confidence', () => {
    const sessions: SleepSession[] = [
      { id: '1', startISO: '2023-01-01T10:00:00Z', endISO: '2023-01-01T10:30:00Z', source: 'manual', updatedAtISO: '' },
      { id: '2', startISO: '2023-01-01T13:00:00Z', endISO: '2023-01-01T14:30:00Z', source: 'manual', updatedAtISO: '' },
      { id: '3', startISO: '2023-01-01T16:00:00Z', endISO: '2023-01-01T16:45:00Z', source: 'manual', updatedAtISO: '' },
      { id: '4', startISO: '2023-01-02T10:00:00Z', endISO: '2023-01-02T11:45:00Z', source: 'manual', updatedAtISO: '' },
      { id: '5', startISO: '2023-01-02T13:00:00Z', endISO: '2023-01-02T13:20:00Z', source: 'manual', updatedAtISO: '' },
      { id: '6', startISO: '2023-01-02T16:00:00Z', endISO: '2023-01-02T17:30:00Z', source: 'manual', updatedAtISO: '' },
    ];

    const lowConfidenceState = { ...baseLearnerState, confidence: 0.4 };
    const tips = generateCoachTips(sessions, lowConfidenceState, mockProfile);
    
    const inconsistencyTip = tips.find(t => t.id === 'inconsistent-schedule');
    expect(inconsistencyTip).toBeDefined();
  });

  it('should show success message for high confidence', () => {
    const sessions: SleepSession[] = [
      { id: '1', startISO: '2023-01-01T10:00:00Z', endISO: '2023-01-01T11:00:00Z', source: 'manual', updatedAtISO: '' },
      { id: '2', startISO: '2023-01-01T13:00:00Z', endISO: '2023-01-01T14:00:00Z', source: 'manual', updatedAtISO: '' },
      { id: '3', startISO: '2023-01-01T16:00:00Z', endISO: '2023-01-01T17:00:00Z', source: 'manual', updatedAtISO: '' },
      { id: '4', startISO: '2023-01-02T10:00:00Z', endISO: '2023-01-02T11:00:00Z', source: 'manual', updatedAtISO: '' },
      { id: '5', startISO: '2023-01-02T13:00:00Z', endISO: '2023-01-02T14:00:00Z', source: 'manual', updatedAtISO: '' },
      { id: '6', startISO: '2023-01-02T16:00:00Z', endISO: '2023-01-02T17:00:00Z', source: 'manual', updatedAtISO: '' },
    ];

    const highConfidenceState = { ...baseLearnerState, confidence: 0.85 };
    const tips = generateCoachTips(sessions, highConfidenceState, mockProfile);
    
    const successTip = tips.find(t => t.id === 'high-confidence');
    expect(successTip).toBeDefined();
    expect(successTip?.type).toBe('success');
  });

  it('should show insufficient data message for few sessions', () => {
    const sessions: SleepSession[] = [
      { id: '1', startISO: '2023-01-01T10:00:00Z', endISO: '2023-01-01T11:00:00Z', source: 'manual', updatedAtISO: '' },
    ];

    const tips = generateCoachTips(sessions, baseLearnerState, mockProfile);
    
    const insufficientTip = tips.find(t => t.id === 'insufficient-data');
    expect(insufficientTip).toBeDefined();
    expect(insufficientTip?.type).toBe('info');
  });

  it('should not show contradictory tips', () => {
    const sessions: SleepSession[] = [
      { id: '1', startISO: '2023-01-01T10:00:00Z', endISO: '2023-01-01T11:00:00Z', source: 'manual', updatedAtISO: '' },
      { id: '2', startISO: '2023-01-01T13:00:00Z', endISO: '2023-01-01T14:00:00Z', source: 'manual', updatedAtISO: '' },
      { id: '3', startISO: '2023-01-01T16:00:00Z', endISO: '2023-01-01T17:00:00Z', source: 'manual', updatedAtISO: '' },
      { id: '4', startISO: '2023-01-02T10:00:00Z', endISO: '2023-01-02T11:00:00Z', source: 'manual', updatedAtISO: '' },
      { id: '5', startISO: '2023-01-02T13:00:00Z', endISO: '2023-01-02T14:00:00Z', source: 'manual', updatedAtISO: '' },
      { id: '6', startISO: '2023-01-02T16:00:00Z', endISO: '2023-01-02T17:00:00Z', source: 'manual', updatedAtISO: '' },
    ];

    const highConfidenceState = { ...baseLearnerState, confidence: 0.85 };
    const tips = generateCoachTips(sessions, highConfidenceState, mockProfile);
    
    // Should not have both high-confidence and insufficient-data tips
    const hasSuccessTip = tips.some(t => t.id === 'high-confidence');
    const hasInsufficientTip = tips.some(t => t.id === 'insufficient-data');
    
    expect(!(hasSuccessTip && hasInsufficientTip)).toBe(true);
  });
});
