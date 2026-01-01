import AsyncStorage from '@react-native-async-storage/async-storage';
import { BabyProfile, SleepSession, LearnerState } from '../types';

const KEYS = {
  PROFILE: 'baby_profile',
  PROFILES: 'baby_profiles',
  ACTIVE_PROFILE_ID: 'active_profile_id',
  SESSIONS: 'sleep_sessions',
  LEARNER: 'learner_state',
  THEME_MODE: 'theme_mode',
};

const CURRENT_VERSION = 1;

export const StorageService = {
  // Legacy single profile (for migration)
  async saveProfile(profile: BabyProfile) {
    await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  },

  async getProfile(): Promise<BabyProfile | null> {
    const data = await AsyncStorage.getItem(KEYS.PROFILE);
    return data ? JSON.parse(data) : null;
  },

  // Multi-profile support
  async saveProfiles(profiles: BabyProfile[]) {
    await AsyncStorage.setItem(KEYS.PROFILES, JSON.stringify(profiles));
  },

  async getProfiles(): Promise<BabyProfile[]> {
    const data = await AsyncStorage.getItem(KEYS.PROFILES);
    return data ? JSON.parse(data) : [];
  },

  async saveActiveProfileId(id: string) {
    await AsyncStorage.setItem(KEYS.ACTIVE_PROFILE_ID, id);
  },

  async getActiveProfileId(): Promise<string | null> {
    return await AsyncStorage.getItem(KEYS.ACTIVE_PROFILE_ID);
  },

  async saveThemeMode(mode: 'system' | 'light' | 'dark') {
    await AsyncStorage.setItem(KEYS.THEME_MODE, mode);
  },

  async getThemeMode(): Promise<'system' | 'light' | 'dark' | null> {
    const v = await AsyncStorage.getItem(KEYS.THEME_MODE);
    return (v === 'system' || v === 'light' || v === 'dark') ? v : null;
  },

  async saveSessions(sessions: SleepSession[]) {
    await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
  },

  async getSessions(): Promise<SleepSession[]> {
    const data = await AsyncStorage.getItem(KEYS.SESSIONS);
    return data ? JSON.parse(data) : [];
  },

  async saveLearnerState(state: LearnerState) {
    await AsyncStorage.setItem(KEYS.LEARNER, JSON.stringify(state));
  },

  async getLearnerState(): Promise<LearnerState | null> {
    const data = await AsyncStorage.getItem(KEYS.LEARNER);
    return data ? JSON.parse(data) : null;
  },

  async clearAll() {
    await AsyncStorage.clear();
  },
  
  async initialize() {
     // Check for migrations here if needed
     const state = await this.getLearnerState();
     if (state && state.version < CURRENT_VERSION) {
         // Migrate data to current version
         await this.saveLearnerState({ ...state, version: CURRENT_VERSION });
     }
  }
};
