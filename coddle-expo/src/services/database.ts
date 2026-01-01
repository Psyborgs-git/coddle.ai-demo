import * as SQLite from 'expo-sqlite';
import { BabyProfile, SleepSession, LearnerState, ScheduleBlock } from '../types';

const DB_NAME = 'coddle.db';
const DB_VERSION = 1;

export class DatabaseService {
  private static instance: DatabaseService | null = null;
  private db: SQLite.SQLiteDatabase | null = null;

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync(DB_NAME);
      await this.runMigrations();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Get current version
    const versionResult = await this.db.getFirstAsync<{ user_version: number }>(
      'PRAGMA user_version'
    );
    const currentVersion = versionResult?.user_version || 0;

    if (currentVersion < 1) {
      await this.migrateToV1();
    }

    // Set version
    await this.db.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
  }

  private async migrateToV1(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        birthDateISO TEXT NOT NULL,
        avatarEmoji TEXT,
        avatarColor TEXT,
        createdAtISO TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        profileId TEXT,
        startISO TEXT NOT NULL,
        endISO TEXT NOT NULL,
        timezone TEXT NOT NULL,
        dstOffset INTEGER NOT NULL,
        quality INTEGER,
        notes TEXT,
        source TEXT NOT NULL,
        deleted INTEGER DEFAULT 0,
        updatedAtISO TEXT NOT NULL,
        FOREIGN KEY (profileId) REFERENCES profiles(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS learner_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        version INTEGER NOT NULL,
        ewmaNapLengthMin REAL NOT NULL,
        ewmaWakeWindowMin REAL NOT NULL,
        lastUpdatedISO TEXT NOT NULL,
        confidence REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS schedule_blocks (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        startISO TEXT NOT NULL,
        endISO TEXT NOT NULL,
        timezone TEXT NOT NULL,
        confidence REAL NOT NULL,
        rationale TEXT NOT NULL,
        createdAtISO TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notification_log (
        id TEXT PRIMARY KEY,
        scheduleBlockId TEXT,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        scheduledForISO TEXT NOT NULL,
        notificationId TEXT,
        status TEXT NOT NULL,
        createdAtISO TEXT NOT NULL,
        canceledAtISO TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_start ON sessions(startISO);
      CREATE INDEX IF NOT EXISTS idx_sessions_deleted ON sessions(deleted);
      CREATE INDEX IF NOT EXISTS idx_sessions_profile ON sessions(profileId);
      CREATE INDEX IF NOT EXISTS idx_schedule_blocks_start ON schedule_blocks(startISO);
      CREATE INDEX IF NOT EXISTS idx_notification_log_scheduled ON notification_log(scheduledForISO);
    `);
  }

  // Profile methods
  async saveProfile(profile: BabyProfile): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.runAsync(
      `INSERT OR REPLACE INTO profiles (id, name, birthDateISO, avatarEmoji, avatarColor, createdAtISO)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [profile.id, profile.name, profile.birthDateISO, profile.avatarEmoji || '', profile.avatarColor || '', new Date().toISOString()]
    );
  }

  async getProfiles(): Promise<BabyProfile[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const rows = await this.db.getAllAsync<any>('SELECT * FROM profiles');
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      birthDateISO: row.birthDateISO,
      avatarEmoji: row.avatarEmoji || undefined,
      avatarColor: row.avatarColor || undefined,
    }));
  }

  async deleteProfile(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM profiles WHERE id = ?', [id]);
  }

  // Session methods
  async saveSession(session: SleepSession, timezone: string, dstOffset: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.runAsync(
      `INSERT OR REPLACE INTO sessions 
       (id, profileId, startISO, endISO, timezone, dstOffset, quality, notes, source, deleted, updatedAtISO)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.id,
        session.profileId || null,
        session.startISO || '',
        session.endISO || '',
        timezone,
        dstOffset,
        session.quality || null,
        session.notes || null,
        session.source,
        session.deleted ? 1 : 0,
        session.updatedAtISO,
      ]
    );
  }

  async getSessions(): Promise<Array<SleepSession & { timezone: string; dstOffset: number }>> {
    if (!this.db) throw new Error('Database not initialized');
    
    const rows = await this.db.getAllAsync<any>('SELECT * FROM sessions WHERE deleted = 0 ORDER BY startISO DESC');
    return rows.map(row => ({
      id: row.id,
      profileId: row.profileId || undefined,
      startISO: row.startISO,
      endISO: row.endISO,
      timezone: row.timezone,
      dstOffset: row.dstOffset,
      quality: row.quality || undefined,
      notes: row.notes || undefined,
      source: row.source,
      deleted: row.deleted === 1,
      updatedAtISO: row.updatedAtISO,
    }));
  }

  async deleteSession(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(
      'UPDATE sessions SET deleted = 1, updatedAtISO = ? WHERE id = ?',
      [new Date().toISOString(), id]
    );
  }

  // Learner state methods
  async saveLearnerState(state: LearnerState): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.runAsync(
      `INSERT OR REPLACE INTO learner_state (id, version, ewmaNapLengthMin, ewmaWakeWindowMin, lastUpdatedISO, confidence)
       VALUES (1, ?, ?, ?, ?, ?)`,
      [state.version, state.ewmaNapLengthMin, state.ewmaWakeWindowMin, state.lastUpdatedISO, state.confidence]
    );
  }

  async getLearnerState(): Promise<LearnerState | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const row = await this.db.getFirstAsync<any>('SELECT * FROM learner_state WHERE id = 1');
    if (!row) return null;
    
    return {
      version: row.version,
      ewmaNapLengthMin: row.ewmaNapLengthMin,
      ewmaWakeWindowMin: row.ewmaWakeWindowMin,
      lastUpdatedISO: row.lastUpdatedISO,
      confidence: row.confidence,
    };
  }

  // Schedule blocks methods
  async saveScheduleBlock(block: ScheduleBlock, timezone: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.runAsync(
      `INSERT OR REPLACE INTO schedule_blocks (id, kind, startISO, endISO, timezone, confidence, rationale, createdAtISO)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [block.id, block.kind, block.startISO, block.endISO, timezone, block.confidence, block.rationale, new Date().toISOString()]
    );
  }

  async getScheduleBlocks(): Promise<Array<ScheduleBlock & { timezone: string }>> {
    if (!this.db) throw new Error('Database not initialized');
    
    const rows = await this.db.getAllAsync<any>('SELECT * FROM schedule_blocks ORDER BY startISO ASC');
    return rows.map(row => ({
      id: row.id,
      kind: row.kind,
      startISO: row.startISO,
      endISO: row.endISO,
      timezone: row.timezone,
      confidence: row.confidence,
      rationale: row.rationale,
    }));
  }

  async clearScheduleBlocks(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM schedule_blocks');
  }

  // Notification log methods
  async logNotification(log: {
    id: string;
    scheduleBlockId?: string;
    title: string;
    body: string;
    scheduledForISO: string;
    notificationId?: string;
    status: 'scheduled' | 'canceled' | 'delivered';
  }): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.runAsync(
      `INSERT OR REPLACE INTO notification_log 
       (id, scheduleBlockId, title, body, scheduledForISO, notificationId, status, createdAtISO, canceledAtISO)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        log.id,
        log.scheduleBlockId || null,
        log.title,
        log.body,
        log.scheduledForISO,
        log.notificationId || null,
        log.status,
        new Date().toISOString(),
        log.status === 'canceled' ? new Date().toISOString() : null,
      ]
    );
  }

  async getNotificationLogs(): Promise<Array<{
    id: string;
    scheduleBlockId?: string;
    title: string;
    body: string;
    scheduledForISO: string;
    notificationId?: string;
    status: string;
    createdAtISO: string;
    canceledAtISO?: string;
  }>> {
    if (!this.db) throw new Error('Database not initialized');
    
    const rows = await this.db.getAllAsync<any>('SELECT * FROM notification_log ORDER BY scheduledForISO DESC LIMIT 100');
    return rows.map(row => ({
      id: row.id,
      scheduleBlockId: row.scheduleBlockId || undefined,
      title: row.title,
      body: row.body,
      scheduledForISO: row.scheduledForISO,
      notificationId: row.notificationId || undefined,
      status: row.status,
      createdAtISO: row.createdAtISO,
      canceledAtISO: row.canceledAtISO || undefined,
    }));
  }

  async clearOldNotificationLogs(beforeISO: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM notification_log WHERE scheduledForISO < ?', [beforeISO]);
  }

  // Migration helper - export AsyncStorage data
  async importFromAsyncStorage(data: {
    profiles?: BabyProfile[];
    sessions?: SleepSession[];
    learnerState?: LearnerState;
  }): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Get current timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const dstOffset = new Date().getTimezoneOffset();

    // Import profiles
    if (data.profiles) {
      for (const profile of data.profiles) {
        await this.saveProfile(profile);
      }
    }

    // Import sessions
    if (data.sessions) {
      for (const session of data.sessions) {
        await this.saveSession(session, timezone, dstOffset);
      }
    }

    // Import learner state
    if (data.learnerState) {
      await this.saveLearnerState(data.learnerState);
    }
  }

  // Reset database (for error recovery)
  async reset(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    await this.db.execAsync(`
      DROP TABLE IF EXISTS profiles;
      DROP TABLE IF EXISTS sessions;
      DROP TABLE IF EXISTS learner_state;
      DROP TABLE IF EXISTS schedule_blocks;
      DROP TABLE IF EXISTS notification_log;
      PRAGMA user_version = 0;
    `);
    
    await this.runMigrations();
  }
}

export const db = DatabaseService.getInstance();
