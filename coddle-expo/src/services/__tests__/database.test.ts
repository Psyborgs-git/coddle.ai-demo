import { DatabaseService } from '../../services/database';
import { BabyProfile, SleepSession, LearnerState, ScheduleBlock } from '../../types';

// Mock expo-sqlite to avoid actual database operations in tests
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() => Promise.resolve({
    getFirstAsync: jest.fn().mockResolvedValue(null),
    getAllAsync: jest.fn().mockResolvedValue([]),
    runAsync: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowId: 1 }),
    execAsync: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('DatabaseService', () => {
  describe('Initialization', () => {
    it('should create a singleton instance', () => {
      const instance1 = DatabaseService.getInstance();
      const instance2 = DatabaseService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Data Types', () => {
    it('should have correct profile structure', () => {
      const profile: BabyProfile = {
        id: '1',
        name: 'Test Baby',
        birthDateISO: '2023-01-01T00:00:00Z',
        avatarColor: '#8B5CF6',
      };

      expect(profile.id).toBeDefined();
      expect(profile.name).toBeDefined();
      expect(profile.birthDateISO).toBeDefined();
    });

    it('should have correct session structure with timezone', () => {
      const session: SleepSession = {
        id: '1',
        startISO: '2023-01-01T10:00:00Z',
        endISO: '2023-01-01T11:00:00Z',
        source: 'manual',
        updatedAtISO: '2023-01-01T11:00:00Z',
      };

      expect(session.id).toBeDefined();
      expect(session.startISO).toBeDefined();
      expect(session.endISO).toBeDefined();
      expect(session.source).toBe('manual');
    });

    it('should have correct learner state structure', () => {
      const state: LearnerState = {
        version: 1,
        ewmaNapLengthMin: 60,
        ewmaWakeWindowMin: 120,
        lastUpdatedISO: '2023-01-01T12:00:00Z',
        confidence: 0.7,
      };

      expect(state.version).toBe(1);
      expect(state.ewmaNapLengthMin).toBeGreaterThan(0);
      expect(state.ewmaWakeWindowMin).toBeGreaterThan(0);
      expect(state.confidence).toBeGreaterThanOrEqual(0);
      expect(state.confidence).toBeLessThanOrEqual(1);
    });

    it('should have correct schedule block structure', () => {
      const block: ScheduleBlock = {
        id: '1',
        kind: 'nap',
        startISO: '2023-01-01T13:00:00Z',
        endISO: '2023-01-01T14:00:00Z',
        confidence: 0.8,
        rationale: 'Based on wake window pattern',
      };

      expect(block.id).toBeDefined();
      expect(['nap', 'bedtime', 'windDown']).toContain(block.kind);
      expect(block.confidence).toBeGreaterThan(0);
      expect(block.rationale).toBeDefined();
    });
  });

  describe('Schema Validation', () => {
    it('should enforce required profile fields', () => {
      const validProfile: BabyProfile = {
        id: '1',
        name: 'Test',
        birthDateISO: '2023-01-01T00:00:00Z',
      };

      expect(validProfile.id).toBeDefined();
      expect(validProfile.name).toBeDefined();
      expect(validProfile.birthDateISO).toBeDefined();
    });

    it('should allow optional session fields', () => {
      const session: SleepSession = {
        id: '1',
        startISO: '2023-01-01T10:00:00Z',
        endISO: '2023-01-01T11:00:00Z',
        source: 'manual',
        updatedAtISO: '2023-01-01T11:00:00Z',
        quality: 4,
        notes: 'Good sleep',
        profileId: 'prof-1',
      };

      expect(session.quality).toBe(4);
      expect(session.notes).toBe('Good sleep');
      expect(session.profileId).toBe('prof-1');
    });

    it('should enforce session quality range', () => {
      const qualities: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];
      
      qualities.forEach(quality => {
        const session: SleepSession = {
          id: '1',
          startISO: '2023-01-01T10:00:00Z',
          endISO: '2023-01-01T11:00:00Z',
          source: 'manual',
          updatedAtISO: '2023-01-01T11:00:00Z',
          quality,
        };

        expect(session.quality).toBeGreaterThanOrEqual(1);
        expect(session.quality).toBeLessThanOrEqual(5);
      });
    });
  });
});

