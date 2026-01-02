import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { BabyProfile, SleepSession, LearnerState, ScheduleBlock, CoachTip } from '../types';
import { StorageService } from '../services/storage';
import { db } from '../services/database';
import { NotificationService } from '../services/notifications';
import { updateLearnerState } from '../utils/learner';
import { generateSchedule } from '../utils/schedule';
import { generateCoachTips } from '../utils/coach';
import { DEFAULT_LEARNER_STATE } from '../constants/baselines';
import { getCurrentTimezone, getDSTOffset } from '../utils/date';
import { differenceInMonths, parseISO, subDays, addMinutes, startOfDay } from 'date-fns';

// Avatar colors for profiles
export const PROFILE_COLORS = [
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

interface StoreState {
  // Multi-profile support
  profiles: BabyProfile[];
  activeProfileId: string | null;
  profile: BabyProfile | null; // Current active profile (computed)
  
  sessions: SleepSession[];
  learnerState: LearnerState;
  schedule: ScheduleBlock[];
  scheduleBlocks: ScheduleBlock[];
  coachTips: CoachTip[];
  isTimerRunning: boolean;
  currentSessionStartISO: string | null;
  timezone: string;
  dstOverride: 'auto' | 'on' | 'off';
  isInitialized: boolean;

  // Profile management
  setProfile: (profile: BabyProfile) => Promise<void>;
  addProfile: (profile: BabyProfile) => Promise<void>;
  updateProfile: (profile: BabyProfile) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  switchProfile: (id: string) => Promise<void>;

  // Theme
  themeMode: 'system' | 'light' | 'dark';
  setThemeMode: (mode: 'system' | 'light' | 'dark') => Promise<void>;
  
  // Timezone & DST override
  setTimezoneWithDst: (timezone: string, dstOverride: 'auto' | 'on' | 'off') => Promise<void>;
  
  loadData: () => Promise<void>;
  
  // Timer Actions
  startTimer: () => void;
  stopTimer: () => Promise<void>;
  
  // CRUD
  addSession: (session: SleepSession) => Promise<void>;
  updateSession: (session: SleepSession) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  
  // Utils
  generateMockData: () => Promise<void>;
  reset: () => Promise<void>;
  refreshDerivedState: () => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  profiles: [],
  activeProfileId: null,
  profile: null,
  sessions: [],
  learnerState: DEFAULT_LEARNER_STATE,
  schedule: [],
  scheduleBlocks: [],
  coachTips: [],
  isTimerRunning: false,
  currentSessionStartISO: null,
  timezone: getCurrentTimezone(),
  dstOverride: 'auto' as 'auto' | 'on' | 'off',
  isInitialized: false,
  themeMode: 'system',

  // Legacy setProfile - now adds or updates profile
  setProfile: async (profile) => {
    const { profiles } = get();
    const existing = profiles.find(p => p.id === profile.id);
    
    if (existing) {
      await get().updateProfile(profile);
    } else {
      await get().addProfile(profile);
    }
    await get().switchProfile(profile.id);
  },

  // Timezone + DST setter
  setTimezoneWithDst: async (timezone, dstOverride) => {
    try {
      await db.saveSetting('timezone', timezone);
      await db.saveSetting('dstOverride', dstOverride);
      set({ timezone, dstOverride });
    } catch (e) {
      console.error('Failed to save timezone/dst settings:', e);
      throw e;
    }
  },

  addProfile: async (profile) => {
    const { profiles } = get();
    const newProfile = {
      ...profile,
      avatarColor: profile.avatarColor || PROFILE_COLORS[profiles.length % PROFILE_COLORS.length],
      createdAtISO: profile.createdAtISO || new Date().toISOString(),
    };
    
    // Save to database
    await db.saveProfile(newProfile);
    
    const newProfiles = [...profiles, newProfile];
    await StorageService.saveProfiles(newProfiles);
    await StorageService.saveActiveProfileId(newProfile.id);
    
    set({ 
      profiles: newProfiles,
      activeProfileId: newProfile.id,
      profile: newProfile
    });
  },

  updateProfile: async (profile) => {
    const { profiles, activeProfileId } = get();
    const newProfiles = profiles.map(p => p.id === profile.id ? profile : p);
    
    // Save to database
    await db.saveProfile(profile);
    await StorageService.saveProfiles(newProfiles);
    
    // Update current profile if it's the active one
    const newActive = profile.id === activeProfileId ? profile : get().profile;
    set({ profiles: newProfiles, profile: newActive });
    await get().refreshDerivedState();
  },

  deleteProfile: async (id) => {
    const { profiles, activeProfileId, sessions } = get();
    const newProfiles = profiles.filter(p => p.id !== id);
    
    // Delete from database
    await db.deleteProfile(id);
    await StorageService.saveProfiles(newProfiles);
    
    // Also soft-delete associated sessions
    const timezone = getCurrentTimezone();
    const dstOffset = getDSTOffset();
    
    const newSessions = sessions.map(s => 
      s.profileId === id ? { ...s, deleted: true, updatedAtISO: new Date().toISOString() } : s
    );
    
    // Update sessions in database
    for (const session of newSessions.filter(s => s.profileId === id && s.deleted)) {
      await db.saveSession(session, timezone, dstOffset);
    }
    await StorageService.saveSessions(newSessions);
    
    // Switch to another profile if active was deleted
    let newActiveId = activeProfileId;
    let newActiveProfile = get().profile;
    
    if (activeProfileId === id) {
      newActiveId = newProfiles.length > 0 ? newProfiles[0].id : null;
      newActiveProfile = newProfiles.length > 0 ? newProfiles[0] : null;
      if (newActiveId) {
        await StorageService.saveActiveProfileId(newActiveId);
      }
    }
    
    set({ 
      profiles: newProfiles, 
      sessions: newSessions,
      activeProfileId: newActiveId,
      profile: newActiveProfile
    });
    
    await get().refreshDerivedState();
  },

  switchProfile: async (id) => {
    const { profiles } = get();
    const profile = profiles.find(p => p.id === id);
    if (!profile) return;
    
    await StorageService.saveActiveProfileId(id);
    set({ activeProfileId: id, profile });
    await get().refreshDerivedState();
  },

  loadData: async () => {
    try {
      // Initialize database
      await db.initialize();
      await StorageService.initialize();
      
      // Read saved timezone & DST override if present
      const savedTz = await db.getSetting('timezone');
      const savedDst = await db.getSetting('dstOverride');
      const timezone = savedTz || getCurrentTimezone();
      const dstOverride = (savedDst as any) || 'auto';
      set({ timezone, dstOverride, isInitialized: true });
      
      // Try loading from database first
      let profiles = await db.getProfiles();
      let sessions = await db.getSessions();
      let learnerState = await db.getLearnerState();
      
      // Migration: if database is empty, try AsyncStorage
      if (profiles.length === 0) {
        const asyncProfiles = await StorageService.getProfiles();
        const asyncSessions = await StorageService.getSessions();
        const asyncLearnerState = await StorageService.getLearnerState();
        
        // Migrate legacy single profile
        const legacyProfile = await StorageService.getProfile();
        if (legacyProfile && asyncProfiles.length === 0) {
          asyncProfiles.push({
            ...legacyProfile,
            createdAtISO: new Date().toISOString(),
          });
        }
        
        // Import to database
        if (asyncProfiles.length > 0 || asyncSessions.length > 0 || asyncLearnerState) {
          await db.importFromAsyncStorage({
            profiles: asyncProfiles,
            sessions: asyncSessions,
            learnerState: asyncLearnerState || undefined,
          });
          
          // Reload from database
          profiles = await db.getProfiles();
          sessions = await db.getSessions();
          learnerState = await db.getLearnerState();
        }
      }
      
      // Get active profile
      let activeProfileId = await StorageService.getActiveProfileId();
      if (!activeProfileId && profiles.length > 0) {
        activeProfileId = profiles[0].id;
        await StorageService.saveActiveProfileId(activeProfileId);
      }
      const profile = profiles.find(p => p.id === activeProfileId) || null;
      
      const themeMode = (await StorageService.getThemeMode()) || 'system';
      
      // Convert database sessions to app format (without timezone/dstOffset fields)
      const appSessions = sessions.map(({ timezone: _, dstOffset: __, ...session }) => session);

      set({ 
        profiles, 
        activeProfileId, 
        profile, 
        sessions: appSessions, 
        learnerState: learnerState || DEFAULT_LEARNER_STATE, 
        themeMode 
      });
      
      await get().refreshDerivedState();
    } catch (error) {
      console.error('Failed to load data:', error);
      // Try to recover by resetting database
      try {
        await db.reset();
        set({ 
          profiles: [], 
          activeProfileId: null, 
          profile: null, 
          sessions: [], 
          learnerState: DEFAULT_LEARNER_STATE, 
          isInitialized: true 
        });
      } catch (resetError) {
        console.error('Failed to reset database:', resetError);
      }
    }
  },

  startTimer: () => {
    set({ isTimerRunning: true, currentSessionStartISO: new Date().toISOString() });
  },

  stopTimer: async () => {
    const { currentSessionStartISO, addSession, activeProfileId } = get();
    if (!currentSessionStartISO) return;

    const newSession: SleepSession = {
      id: uuidv4(),
      profileId: activeProfileId || undefined,
      startISO: currentSessionStartISO,
      endISO: new Date().toISOString(),
      source: 'timer',
      updatedAtISO: new Date().toISOString(),
    };

    await addSession(newSession);
    set({ isTimerRunning: false, currentSessionStartISO: null });
  },

  addSession: async (session) => {
    const { sessions, activeProfileId, timezone } = get();
    const sessionWithProfile = {
      ...session,
      profileId: session.profileId || activeProfileId || undefined,
    };
    
    // Save to database with timezone
    const dstOffset = getDSTOffset();
    await db.saveSession(sessionWithProfile, timezone, dstOffset);
    
    const newSessions = [sessionWithProfile, ...sessions];
    await StorageService.saveSessions(newSessions);
    set({ sessions: newSessions });
    await get().refreshDerivedState();
  },

  updateSession: async (session) => {
    const { sessions, timezone } = get();
    const updatedSession = { ...session, updatedAtISO: new Date().toISOString() };
    
    // Save to database with timezone
    const dstOffset = getDSTOffset();
    await db.saveSession(updatedSession, timezone, dstOffset);
    
    const newSessions = sessions.map(s => s.id === session.id ? updatedSession : s);
    await StorageService.saveSessions(newSessions);
    set({ sessions: newSessions });
    await get().refreshDerivedState();
  },

  deleteSession: async (id) => {
    const { sessions } = get();
    
    // Mark as deleted in database
    await db.deleteSession(id);
    
    const newSessions = sessions.map(s => s.id === id ? { ...s, deleted: true, updatedAtISO: new Date().toISOString() } : s);
    await StorageService.saveSessions(newSessions);
    set({ sessions: newSessions });
    await get().refreshDerivedState();
  },

  refreshDerivedState: async () => {
    const { sessions, profile, learnerState, activeProfileId, timezone } = get();
    
    // Filter sessions for active profile
    const profileSessions = activeProfileId 
      ? sessions.filter(s => !s.deleted && (!s.profileId || s.profileId === activeProfileId))
      : sessions.filter(s => !s.deleted);
    
    const birth = profile ? parseISO(profile.birthDateISO) : null;
    const ageMonths = birth ? differenceInMonths(new Date(), birth) : 6;

    const newLearnerState = updateLearnerState(learnerState, profileSessions, ageMonths);
    
    // Save to database
    await db.saveLearnerState(newLearnerState);
    await StorageService.saveLearnerState(newLearnerState);

    // Find last valid session for schedule generation
    const validSessions = profileSessions.filter(s => s.endISO).sort((a, b) => a.endISO!.localeCompare(b.endISO!));
    const lastSession = validSessions.length > 0 ? validSessions[validSessions.length - 1] : null;

    // Generate schedule with active profile
    const schedule = generateSchedule(newLearnerState, lastSession, profile);
    const coachTips = generateCoachTips(profileSessions, newLearnerState, profile);

    // Save schedule blocks to database
    await db.clearScheduleBlocks();
    for (const block of schedule) {
      await db.saveScheduleBlock(block, timezone);
    }

    // Schedule notifications
    try {
      await NotificationService.scheduleNotifications(schedule);
    } catch (error) {
      console.warn('Failed to schedule notifications:', error);
    }

    set({ learnerState: newLearnerState, schedule, scheduleBlocks: schedule, coachTips });
  },

  generateMockData: async () => {
      const { activeProfileId, timezone } = get();
      const sessions: SleepSession[] = [];
      const now = new Date();
      const dstOffset = getDSTOffset();
      
      // Generate 30 days of data with realistic baby sleep patterns
      // Baby sleep totals: 12-15 hours/day (newborn), decreasing with age
      for (let i = 0; i < 30; i++) {
          const dayStart = startOfDay(subDays(now, i));
          const dayOfWeek = dayStart.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          
          // Realistic baby sleep pattern (3-4 naps + night sleep = 12-15h total)
          const napCount = isWeekend ? (2 + Math.floor(Math.random() * 2)) : 3;
          
          // Morning nap: 9am-10:30am (1-1.5h)
          if (napCount >= 1) {
              const napStart = addMinutes(dayStart, 540 + (Math.random() * 30)); // 9am ±15min
              const napDuration = 60 + (Math.random() * 30); // 60-90min
              const napEnd = addMinutes(napStart, napDuration);
              
              sessions.push({
                  id: uuidv4(),
                  profileId: activeProfileId || undefined,
                  startISO: napStart.toISOString(),
                  endISO: napEnd.toISOString(),
                  source: 'manual' as const,
                  quality: (3 + Math.floor(Math.random() * 3)) as (1 | 2 | 3 | 4 | 5),
                  updatedAtISO: new Date().toISOString()
              });
          }
          
          // Midday nap: 12:30pm-2pm (1-1.5h)
          if (napCount >= 2) {
              const napStart = addMinutes(dayStart, 750 + (Math.random() * 30)); // 12:30pm ±15min
              const napDuration = 60 + (Math.random() * 30); // 60-90min
              const napEnd = addMinutes(napStart, napDuration);
              
              sessions.push({
                  id: uuidv4(),
                  profileId: activeProfileId || undefined,
                  startISO: napStart.toISOString(),
                  endISO: napEnd.toISOString(),
                  source: 'manual' as const,
                  quality: (3 + Math.floor(Math.random() * 3)) as (1 | 2 | 3 | 4 | 5),
                  updatedAtISO: new Date().toISOString()
              });
          }
          
          // Afternoon nap: 3:30pm-5pm (0.5-1.5h, often shorter)
          if (napCount >= 3) {
              const napStart = addMinutes(dayStart, 930 + (Math.random() * 30)); // 3:30pm ±15min
              const napDuration = 30 + (Math.random() * 60); // 30-90min (variable)
              const napEnd = addMinutes(napStart, napDuration);
              
              sessions.push({
                  id: uuidv4(),
                  profileId: activeProfileId || undefined,
                  startISO: napStart.toISOString(),
                  endISO: napEnd.toISOString(),
                  source: 'manual' as const,
                  quality: (2 + Math.floor(Math.random() * 3)) as (1 | 2 | 3 | 4 | 5),
                  updatedAtISO: new Date().toISOString()
              });
          }
          
          // Late afternoon catnap: 5pm-5:30pm (only on some days, 20-40min)
          if (napCount >= 4 && Math.random() > 0.5) {
              const napStart = addMinutes(dayStart, 1020 + (Math.random() * 20)); // 5pm ±10min
              const napDuration = 20 + (Math.random() * 20); // 20-40min
              const napEnd = addMinutes(napStart, napDuration);
              
              sessions.push({
                  id: uuidv4(),
                  profileId: activeProfileId || undefined,
                  startISO: napStart.toISOString(),
                  endISO: napEnd.toISOString(),
                  source: 'manual' as const,
                  quality: (2 + Math.floor(Math.random() * 2)) as (1 | 2 | 3 | 4 | 5),
                  updatedAtISO: new Date().toISOString()
              });
          }
          
          // Night sleep: 7pm-6am (10-11 hours with some variance)
          const nightVariance = Math.random() * 60 - 30; // ±30min
          const nightStart = addMinutes(dayStart, 1140 + nightVariance); // ~7pm ±30min
          const nightDuration = 600 + (Math.random() * 60); // 10-11 hours
          const nightEnd = addMinutes(nightStart, nightDuration);
          
          sessions.push({
              id: uuidv4(),
              profileId: activeProfileId || undefined,
              startISO: nightStart.toISOString(),
              endISO: nightEnd.toISOString(),
              source: 'manual' as const,
              quality: (4 + Math.floor(Math.random() * 2)) as (1 | 2 | 3 | 4 | 5),
              updatedAtISO: new Date().toISOString()
          });
      }
      
      // Save all sessions to database and store
      for (const session of sessions) {
          await db.saveSession(session, timezone, dstOffset);
      }
      
      const { addSession } = get();
      for (const s of sessions) {
          await addSession(s);
      }
  },

  setThemeMode: async (mode) => {
    await StorageService.saveThemeMode(mode);
    set({ themeMode: mode });
  },

  reset: async () => {
      await db.reset();
      await StorageService.clearAll();
      set({ 
        profiles: [], 
        activeProfileId: null, 
        profile: null, 
        sessions: [], 
        learnerState: DEFAULT_LEARNER_STATE, 
        schedule: [], 
        scheduleBlocks: [],
        coachTips: [], 
        themeMode: 'system' 
      });
  }
}));
