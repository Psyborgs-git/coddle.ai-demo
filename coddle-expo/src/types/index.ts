export interface BabyProfile {
  id: string;
  name: string;
  birthDateISO: string;                 // ISO date
  avatarEmoji?: string;                 // For visual distinction
  avatarColor?: string;                 // Color for avatar circle
  createdAtISO?: string;
}

export interface SleepSession {
  id: string;                           // UUID
  profileId?: string;                   // Links to BabyProfile
  startISO: string;                     // inclusive
  endISO: string;                       // exclusive
  quality?: 1|2|3|4|5;
  notes?: string;
  source: 'manual' | 'timer';           // provenance
  deleted?: boolean;                    // tombstone
  updatedAtISO: string;                 // audit
}

export interface LearnerState {
  version: number;                      // schema/migration
  profileId?: string;                   // Links to BabyProfile
  ewmaNapLengthMin: number;             // smoothed features
  ewmaWakeWindowMin: number;
  lastUpdatedISO: string;
  confidence: number;                   // 0..1
}

export interface ScheduleBlock {
  id: string;                           // UUID
  kind: 'nap' | 'bedtime' | 'windDown';
  startISO: string;
  endISO: string;
  confidence: number;                   // 0..1
  rationale: string;                    // brief explanation
}

export interface CoachTip {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'success';
  relatedSessionIds?: string[];
}
