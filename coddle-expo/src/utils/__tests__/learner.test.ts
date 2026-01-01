import { updateLearnerState } from '../learner';
import { SleepSession } from '../../types';

describe('Learner Logic', () => {
  it('should initialize with default values if no sessions', () => {
    const state = updateLearnerState(null, [], 6);
    expect(state.ewmaNapLengthMin).toBe(60);
    expect(state.ewmaWakeWindowMin).toBe(90);
  });

  it('should update EWMA based on sessions', () => {
    const sessions: SleepSession[] = [
      { id: '1', startISO: '2023-01-01T10:00:00Z', endISO: '2023-01-01T11:00:00Z', source: 'manual', updatedAtISO: '' }, // 60m nap
      { id: '2', startISO: '2023-01-01T13:00:00Z', endISO: '2023-01-01T14:00:00Z', source: 'manual', updatedAtISO: '' }, // 60m nap, 120m wake
    ];
    
    const state = updateLearnerState(null, sessions, 6);
    // First nap: 60. Second nap: 60. EWMA Nap = 60.
    // First wake: 120 (11:00 to 13:00). EWMA Wake = 120.
    
    expect(state.ewmaNapLengthMin).toBe(60);
    expect(state.ewmaWakeWindowMin).toBe(120);
  });
});
