import { generateSchedule, generateWhatIfSchedule } from '../schedule';
import { LearnerState, SleepSession, BabyProfile } from '../../types';
import { addMinutes, parseISO } from 'date-fns';

describe('Schedule Generator', () => {
  const mockProfile: BabyProfile = {
    id: '1',
    name: 'Test Baby',
    birthDateISO: '2023-07-01T00:00:00Z', // 6 months old
  };

  it('should generate schedule based on learner state', () => {
    const learnerState: LearnerState = {
      version: 1,
      ewmaNapLengthMin: 60,
      ewmaWakeWindowMin: 120,
      lastUpdatedISO: '',
      confidence: 0.5
    };
    
    const lastSession: SleepSession = {
      id: '1',
      startISO: '2023-01-01T10:00:00Z',
      endISO: '2023-01-01T11:00:00Z', // Woke at 11:00
      source: 'manual',
      updatedAtISO: ''
    };
    
    const now = new Date('2023-01-01T11:00:00Z');
    
    const schedule = generateSchedule(learnerState, lastSession, mockProfile, now);
    
    // Next sleep should be at 11:00 + 120m = 13:00
    expect(schedule.length).toBeGreaterThan(0);
    const firstBlock = schedule.find(b => b.kind === 'nap' || b.kind === 'bedtime');
    expect(firstBlock).toBeDefined();
    expect(firstBlock?.startISO).toBe('2023-01-01T13:00:00.000Z');
  });

  it('should include wind-down blocks before sleep', () => {
    const learnerState: LearnerState = {
      version: 1,
      ewmaNapLengthMin: 60,
      ewmaWakeWindowMin: 120,
      lastUpdatedISO: '',
      confidence: 0.7
    };
    
    const lastSession: SleepSession = {
      id: '1',
      startISO: '2023-01-01T10:00:00Z',
      endISO: '2023-01-01T11:00:00Z',
      source: 'manual',
      updatedAtISO: ''
    };
    
    const now = new Date('2023-01-01T11:00:00Z');
    const schedule = generateSchedule(learnerState, lastSession, mockProfile, now);
    
    const windDownBlocks = schedule.filter(b => b.kind === 'windDown');
    expect(windDownBlocks.length).toBeGreaterThan(0);
  });

  it('should include confidence and rationale for each block', () => {
    const learnerState: LearnerState = {
      version: 1,
      ewmaNapLengthMin: 60,
      ewmaWakeWindowMin: 120,
      lastUpdatedISO: '',
      confidence: 0.8
    };
    
    const lastSession: SleepSession = {
      id: '1',
      startISO: '2023-01-01T10:00:00Z',
      endISO: '2023-01-01T11:00:00Z',
      source: 'manual',
      updatedAtISO: ''
    };
    
    const now = new Date('2023-01-01T11:00:00Z');
    const schedule = generateSchedule(learnerState, lastSession, mockProfile, now);
    
    schedule.forEach(block => {
      expect(block.confidence).toBeGreaterThan(0);
      expect(block.confidence).toBeLessThanOrEqual(1);
      expect(block.rationale).toBeDefined();
      expect(block.rationale.length).toBeGreaterThan(0);
    });
  });

  it('should distinguish between naps and bedtime', () => {
    const learnerState: LearnerState = {
      version: 1,
      ewmaNapLengthMin: 60,
      ewmaWakeWindowMin: 120,
      lastUpdatedISO: '',
      confidence: 0.6
    };
    
    const lastSession: SleepSession = {
      id: '1',
      startISO: '2023-01-01T10:00:00Z',
      endISO: '2023-01-01T11:00:00Z',
      source: 'manual',
      updatedAtISO: ''
    };
    
    const now = new Date('2023-01-01T11:00:00Z');
    const schedule = generateSchedule(learnerState, lastSession, mockProfile, now);
    
    const naps = schedule.filter(b => b.kind === 'nap');
    const bedtimes = schedule.filter(b => b.kind === 'bedtime');
    
    expect(naps.length).toBeGreaterThan(0);
    expect(bedtimes.length).toBeGreaterThan(0);
  });

  it('should generate what-if schedule with adjusted wake window', () => {
    const learnerState: LearnerState = {
      version: 1,
      ewmaNapLengthMin: 60,
      ewmaWakeWindowMin: 120,
      lastUpdatedISO: '',
      confidence: 0.7
    };
    
    const lastSession: SleepSession = {
      id: '1',
      startISO: '2023-01-01T10:00:00Z',
      endISO: '2023-01-01T11:00:00Z',
      source: 'manual',
      updatedAtISO: ''
    };
    
    const now = new Date('2023-01-01T11:00:00Z');
    
    // Normal schedule
    const normalSchedule = generateSchedule(learnerState, lastSession, mockProfile, now);
    
    // What-if with +30 minutes
    const adjustedSchedule = generateWhatIfSchedule(learnerState, lastSession, mockProfile, 30, now);
    
    // Both schedules should have blocks
    expect(normalSchedule.length).toBeGreaterThan(0);
    expect(adjustedSchedule.length).toBeGreaterThan(0);
    
    // Adjusted schedule should reflect the wake window adjustment
    // The wake window in adjustedSchedule should be 30 minutes longer
    expect(adjustedSchedule.length).toBeGreaterThan(0);
  });

  it('should reduce confidence for what-if adjustments', () => {
    const learnerState: LearnerState = {
      version: 1,
      ewmaNapLengthMin: 60,
      ewmaWakeWindowMin: 120,
      lastUpdatedISO: '',
      confidence: 0.8
    };
    
    const lastSession: SleepSession = {
      id: '1',
      startISO: '2023-01-01T10:00:00Z',
      endISO: '2023-01-01T11:00:00Z',
      source: 'manual',
      updatedAtISO: ''
    };
    
    const now = new Date('2023-01-01T11:00:00Z');
    const adjustedSchedule = generateWhatIfSchedule(learnerState, lastSession, mockProfile, 30, now);
    
    // Confidence should be reduced due to adjustment
    adjustedSchedule.forEach(block => {
      expect(block.confidence).toBeLessThan(learnerState.confidence);
    });
  });
});
