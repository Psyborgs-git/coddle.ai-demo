# Take-Home Assignment: Sleep Pattern Learner & Smart Schedule (with Local “Coach”)

## Goal
Build a production-quality React Native (TypeScript) mini‑app that ingests baby sleep logs, learns wake windows from history + age, and generates a dynamic schedule with proactive local notifications and “coach” tips. This evaluates your modeling/heuristics, background work, time math, state machines, accessibility, and mobile UX craft.

## Timeline & Effort
- **Time limit:** 48 hours from when you receive this brief
- **Important:** We must be able to run your app and see a demo video of the working features.

## What You’ll Build (Scope)
A small RN app with:

- **Sleep Log:** Start/stop sleep sessions (or add manual ranges), quality (1–5), and optional notes.
- **Timeline & Chart:** Daily timeline view + trend chart (avg nap length, total daytime sleep).
- **Learner:** A lightweight model (e.g., EWMA + age baseline) that estimates current wake windows and recommended nap/bedtime.
- **Smart Schedule:** Generate today/tomorrow schedule blocks with confidence bands; update live as new data arrives.
- **Coach Panel:** Contextual tips (wind‑down reminders, overtired flags, split‑night warnings) with short justifications.

## Technical Requirements

- **Framework:** React Native (Expo or RN CLI). If Expo, pin SDK; include eas.json if applicable.
- **State & Storage:** Your choice (Context/Zustand/Redux Toolkit) + durable local storage (SQLite or AsyncStorage/MMKV). Include a schema version for migrations.
- **Time/Date:** Use dayjs or date‑fns; be explicit about timezones and DST.
- **Notifications:** Local only. Implement a scheduler that sets/clears notifications for upcoming windows. (If not using a device API, provide an in‑app “Notification Log” that mirrors what would be scheduled.)
- **Charts:** Any reputable RN charting lib (e.g., Victory Native). Label axes clearly for small screens.
- **Tests:** Jest unit tests for the learner (EWMA/baseline), schedule generation, and DST boundary handling.
- **Lint/Format:** ESLint + Prettier. Scripts: start, android, ios, test, lint, typecheck.

## Data Model (use or extend)

```typescript
export interface BabyProfile {
  id: string;
  name: string;
  birthDateISO: string;                 // ISO date
}

export interface SleepSession {
  id: string;                           // UUID
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
```

## Modeling Approach (Document & Implement)

- **Baseline by age:** Include a small static table for typical wake windows by age (e.g., buckets: 0–3m, 4–6m, etc.).
- **Personalization:** Update with an EWMA (or comparable) using recent valid sessions; clamp to safe min/max by age.
- **Confidence:** Increase with more recent, consistent data; decrease on high variance or sparse data.
- **Anomalies:** Flag short naps (<30m), long wake windows (>120% of target), or split nights; surface gentle guidance.

## Core Features (Acceptance Criteria)

### Logging & Timeline

- Start/stop timer and manual entry with validation (start < end, same day or cross‑midnight allowed).
- Timeline renders sessions for the selected day; supports delete/edit (with confirm) and tombstones.

### Learner & Schedule

- Learner updates on create/edit/delete; schedule for the rest of today and tomorrow regenerates immediately.
- Each block shows start/end, confidence, and a brief rationale (e.g., “EWMA + age baseline”).
- “What‑if” slider: adjust next wake window ±30m and preview the impact on upcoming blocks.

### Notifications

- Schedule local notifications for upcoming wind‑down and nap/bedtime starts; cancel/reschedule when data changes.
- Provide an in‑app Notification Log of scheduled/canceled items for verification.

### Coach Panel

- Surfaces tips when: short nap streak, overstretched wake window, or bedtime creeping earlier/later >30m vs. baseline.
- Each tip links to the underlying data point(s) (tap to highlight on timeline).

## Non‑Functional Requirements

- **Performance:** With 180+ sessions and 30+ schedule blocks, first timeline/chart paint < 500ms on a mid‑range simulator; interactions remain responsive.
- **Resilience:** Handle empty state, a single mega‑session (e.g., 12h night sleep), back‑dated entries, cross‑midnight, and DST transitions.
- **Determinism:** Same input → same schedule; edits roll back cleanly.
- **Migrations:** Corrupted storage triggers a safe reset dialog; preserve a minimal crash‑free path.

## Deliverables (What to Submit)

- **Code** (GitHub link) with clean structure; sensible components/hooks.
- **README.md** with:
  - Setup & run steps (Expo Go vs simulator).
  - Architecture overview (learner pipeline, schedule generator, notification scheduler).
  - Baseline table source and EWMA parameters (alpha) + rationale.
  - Coach rules list and thresholds.
  - Known trade‑offs & future improvements.
- **Demo Video (2–3 min):** Show logging, schedule generation, notifications, coach tips, and a what‑if adjustment.

## Test Plan (we will use to verify)

### Logging & Edits

- Create 5 sessions (including one cross‑midnight). Edit one, delete one → timeline and totals update correctly; tombstones respected.

### Learner & Schedule

- Seed sample data (we will provide via JSON import or follow README steps). Learner computes reasonable EWMA; schedule regenerates immediately after an edit.
- Confidence increases with more consistent naps (simulate by adding similar sessions).

### Notifications

- With device or in‑app log, verify that creating/editing a session reschedules upcoming notifications; cancel works when a block is removed.

### Coach Rules

- Enter a short‑nap streak → tip appears with clear rationale; tap highlights the relevant sessions.
- Over‑long wake window (>120% target) triggers a warning and suggests an earlier wind‑down next cycle.

### DST & Time Math

- Simulate a DST shift (or use a controlled test util) → sessions straddling the change render correctly; schedule times remain consistent.

### Performance & Resilience

- Seed 180 sessions → first paint < 500ms; scrolling and updates remain smooth.
- Corrupt stored learner state → safe reset dialog appears; app remains usable after reset.

