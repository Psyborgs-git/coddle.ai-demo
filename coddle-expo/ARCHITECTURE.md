# coddle - Architecture Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Design System](#design-system)
4. [Components](#components)
5. [State Management](#state-management)
6. [API Reference](#api-reference)
7. [Testing](#testing)

## Overview

coddle is a production-quality React Native application built with Expo, TypeScript, and modern UI libraries. It tracks baby sleep patterns, learns from historical data, and generates intelligent schedules with proactive notifications.

### Tech Stack
- **Framework**: Expo SDK 54 (React Native)
- **Language**: TypeScript
- **State Management**: Zustand
- **Storage**: AsyncStorage
- **UI/Styling**: @shopify/restyle
- **Animations**: Moti + React Native Reanimated
- **Charts**: Victory Native
- **Navigation**: React Navigation v7
- **Notifications**: expo-notifications
- **Date Handling**: date-fns
- **Testing**: Jest + jest-expo

## Architecture

### Directory Structure
```
coddle/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # Base UI components (Box, Text, Button, etc.)
│   │   └── navigation/   # Navigation components (CustomTabBar)
│   ├── screens/          # Screen components
│   ├── store/            # Zustand store
│   ├── services/         # External services (Storage, Notifications)
│   ├── utils/            # Utility functions (Learner, Schedule)
│   ├── constants/        # Static data (Age baselines)
│   ├── types/            # TypeScript interfaces
│   └── theme/            # Restyle theme configuration
├── assets/               # Images, fonts, icons
└── __tests__/            # Test files
```

### Data Flow

```
User Action → Screen Component → Zustand Store → Storage/Learner → State Update → UI Re-render
                                       ↓
                                 Notification Service
```

## Design System

### Theme

The app uses @shopify/restyle for a type-safe, theme-based design system.

#### Colors

**Primary Palette**
- `primary`: #0967D2 (Main brand color)
- `primaryLight`: #BAE0FF (Light variant)
- `primaryDark`: #03449E (Dark variant)

**Neutrals**
- `white`: #FFFFFF
- `gray50-900`: Grayscale from lightest to darkest
- `black`: #000000

**Semantic**
- `success`: #10B981 (Green)
- `warning`: #F59E0B (Yellow)
- `error`: #EF4444 (Red)
- `info`: #3B82F6 (Blue)

**Sleep-specific**
- `sleepNap`: #3B82F6 (Blue)
- `sleepBedtime`: #9333EA (Purple)
- `sleepWindDown`: #FBBF24 (Yellow)

#### Spacing Scale
- `xs`: 4px
- `s`: 8px
- `m`: 16px
- `l`: 24px
- `xl`: 32px
- `xxl`: 48px

#### Border Radii
- `xs`: 4px
- `s`: 8px
- `m`: 12px
- `l`: 16px
- `xl`: 24px
- `round`: 9999px

#### Typography Variants
- `header`: 32px, bold
- `title`: 24px, 600
- `subtitle`: 18px, 600
- `body`: 16px, 400
- `caption`: 14px, 400
- `label`: 12px, 500, uppercase

### Components

#### Base Components

##### Box
The foundational layout component with full theme support.

```tsx
import { Box } from '@/components/ui';

<Box 
  padding="m" 
  backgroundColor="cardBackground"
  borderRadius="m"
  flexDirection="row"
>
  {children}
</Box>
```

**Props**: All standard View props + theme props (spacing, colors, layout)

##### Text
Typography component with variant support.

```tsx
import { Text } from '@/components/ui';

<Text variant="title" color="primary">
  Hello World
</Text>
```

**Variants**: header, title, subtitle, body, caption, label

##### Button
Basic button component with variant support.

```tsx
import { Button } from '@/components/ui';

<Button variant="primary" onPress={handlePress}>
  Click Me
</Button>
```

**Variants**: primary, secondary, outline

##### AnimatedButton
Enhanced button with micro-interactions and loading states.

```tsx
import { AnimatedButton } from '@/components/ui/AnimatedButton';

<AnimatedButton
  variant="primary"
  size="medium"
  icon="save"
  loading={isLoading}
  onPress={handleSave}
>
  Save
</AnimatedButton>
```

**Props**:
- `variant`: 'primary' | 'secondary' | 'outline' | 'ghost'
- `size`: 'small' | 'medium' | 'large'
- `icon`: Ionicons name
- `loading`: boolean
- `disabled`: boolean

**Animations**:
- Press: Scale down to 0.95
- Loading: Rotating sync icon

##### Input
Form input component with label and error support.

```tsx
import { Input } from '@/components/ui/Input';

<Input
  label="Baby Name"
  value={name}
  onChangeText={setName}
  error={nameError}
  placeholder="Enter name"
/>
```

**Props**: All TextInput props + label, error

##### Card
Container component with elevation variants.

```tsx
import { Card } from '@/components/ui';

<Card variant="elevated">
  {content}
</Card>
```

**Variants**: defaults, elevated

##### SessionCard
Specialized card for displaying sleep sessions.

```tsx
import { SessionCard } from '@/components/ui/SessionCard';

<SessionCard
  session={sleepSession}
  onPress={handlePress}
  onLongPress={handleDelete}
/>
```

**Features**:
- Animated entrance/exit
- Press feedback
- Auto-formatted dates and duration
- Source badge
- Notes display

#### Navigation Components

##### CustomTabBar
Animated bottom tab navigation with icons and labels.

**Features**:
- Smooth icon transitions
- Scale and translate animations
- Active state highlighting
- Label appears on active tab
- Spring physics for natural feel

```tsx
// Automatically used by AppNavigator
<Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />}>
```

## State Management

### Zustand Store

Location: `src/store/useStore.ts`

#### State Shape

```typescript
{
  profile: BabyProfile | null;
  sessions: SleepSession[];
  learnerState: LearnerState | null;
  schedule: ScheduleBlock[];
}
```

#### Actions

##### setProfile
```typescript
setProfile: (profile: BabyProfile) => Promise<void>
```
Saves baby profile to storage.

##### loadData
```typescript
loadData: () => Promise<void>
```
Initializes app by loading all data from storage.

##### addSession
```typescript
addSession: (session: SleepSession) => Promise<void>
```
Adds a new sleep session, updates learner, regenerates schedule, and reschedules notifications.

##### updateSession
```typescript
updateSession: (session: SleepSession) => Promise<void>
```
Updates an existing session and triggers learner/schedule updates.

##### deleteSession
```typescript
deleteSession: (id: string) => Promise<void>
```
Soft-deletes a session (sets `deleted: true`) and updates dependent state.

##### refreshSchedule
```typescript
refreshSchedule: () => void
```
Regenerates the schedule based on current learner state and reschedules notifications.

### Usage Example

```tsx
import { useStore } from '@/store/useStore';

function MyComponent() {
  const sessions = useStore(state => state.sessions);
  const addSession = useStore(state => state.addSession);
  
  const handleAdd = async () => {
    await addSession(newSession);
  };
  
  return <SessionList sessions={sessions} />;
}
```

## Services

### StorageService

Location: `src/services/storage.ts`

Handles persistent storage using AsyncStorage.

#### Methods

##### saveProfile / getProfile
```typescript
saveProfile(profile: BabyProfile): Promise<void>
getProfile(): Promise<BabyProfile | null>
```

##### saveSessions / getSessions
```typescript
saveSessions(sessions: SleepSession[]): Promise<void>
getSessions(): Promise<SleepSession[]>
```

##### saveLearnerState / getLearnerState
```typescript
saveLearnerState(state: LearnerState): Promise<void>
getLearnerState(): Promise<LearnerState | null>
```

##### initialize
```typescript
initialize(): Promise<void>
```
Checks for schema migrations and updates if needed.

##### clearAll
```typescript
clearAll(): Promise<void>
```
Clears all stored data (use for reset).

### NotificationService

Location: `src/services/notifications.ts`

Manages local push notifications.

#### Methods

##### requestPermissions
```typescript
requestPermissions(): Promise<boolean>
```
Requests notification permissions from the user.

##### scheduleNotifications
```typescript
scheduleNotifications(schedule: ScheduleBlock[]): Promise<void>
```
Cancels existing notifications and schedules new ones based on the schedule.

##### getScheduledNotifications
```typescript
getScheduledNotifications(): Promise<Notification[]>
```
Returns all currently scheduled notifications.

## Utilities

### Learner

Location: `src/utils/learner.ts`

Implements the EWMA-based learning algorithm.

#### calculateEWMA
```typescript
calculateEWMA(current: number, previous: number): number
```
Applies Exponential Weighted Moving Average with α=0.3.

**Formula**: `new_value = 0.3 * current + 0.7 * previous`

#### updateLearnerState
```typescript
updateLearnerState(
  currentState: LearnerState | null,
  sessions: SleepSession[],
  ageMonths: number
): LearnerState
```

**Algorithm**:
1. Filter valid sessions (not deleted, reasonable duration)
2. Sort chronologically
3. Calculate EWMA for nap lengths (20-300 min)
4. Calculate EWMA for wake windows (30-720 min)
5. Compute confidence based on data points (5% per session, max 90%)

**Returns**: Updated LearnerState

### Schedule Generator

Location: `src/utils/schedule.ts`

Generates predictive sleep schedules.

#### generateSchedule
```typescript
generateSchedule(
  learnerState: LearnerState,
  lastSession: SleepSession | null,
  now: Date = new Date()
): ScheduleBlock[]
```

**Logic**:
1. Calculate next sleep time: `last wake + EWMA wake window`
2. If overdue, suggest sleep in 15 min
3. Generate blocks for today + tomorrow
4. Classify as nap or bedtime based on hour (19:00-06:00 = bedtime)
5. Add wind-down blocks 20 min before sleep
6. Continue until end of tomorrow

**Returns**: Array of ScheduleBlock

### Age Baselines

Location: `src/constants/baselines.ts`

Static table of age-appropriate sleep parameters.

```typescript
const AGE_BASELINES: AgeBaseline[] = [
  { minAgeMonth: 0, maxAgeMonth: 3, wakeWindowMin: 45, wakeWindowMax: 90, napsPerDay: 4, totalDaySleepMin: 300 },
  { minAgeMonth: 4, maxAgeMonth: 6, wakeWindowMin: 90, wakeWindowMax: 150, napsPerDay: 3, totalDaySleepMin: 240 },
  { minAgeMonth: 7, maxAgeMonth: 12, wakeWindowMin: 120, wakeWindowMax: 210, napsPerDay: 2, totalDaySleepMin: 180 },
  { minAgeMonth: 13, maxAgeMonth: 24, wakeWindowMin: 240, wakeWindowMax: 360, napsPerDay: 1, totalDaySleepMin: 120 },
  { minAgeMonth: 25, maxAgeMonth: 100, wakeWindowMin: 360, wakeWindowMax: 720, napsPerDay: 0, totalDaySleepMin: 0 },
];
```

**Source**: Pediatric sleep guidelines (AAP, NSF)

## Testing

### Unit Tests

Location: `src/utils/__tests__/`

#### Learner Tests
- Initializes with defaults when no sessions
- Updates EWMA correctly based on sessions
- Filters invalid sessions

#### Schedule Tests
- Generates schedule based on learner state
- Predicts correct next sleep time
- Handles DST transitions

### Running Tests

```bash
npm test                 # Run all tests
npm test -- --coverage   # With coverage report
npm test -- --watch      # Watch mode
```

### Test Coverage Goals
- Utilities: 100%
- Components: 90%+
- Screens: 80%+
- Overall: 90%+

## API Reference

### Type Definitions

#### BabyProfile
```typescript
interface BabyProfile {
  id: string;
  name: string;
  birthDateISO: string; // ISO date
}
```

#### SleepSession
```typescript
interface SleepSession {
  id: string;
  startISO: string;
  endISO: string;
  quality?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  source: 'manual' | 'timer';
  deleted?: boolean;
  updatedAtISO: string;
}
```

#### LearnerState
```typescript
interface LearnerState {
  version: number;
  ewmaNapLengthMin: number;
  ewmaWakeWindowMin: number;
  lastUpdatedISO: string;
  confidence: number; // 0..1
}
```

#### ScheduleBlock
```typescript
interface ScheduleBlock {
  id: string;
  kind: 'nap' | 'bedtime' | 'windDown';
  startISO: string;
  endISO: string;
  confidence: number; // 0..1
  rationale: string;
}
```

## Performance Considerations

### Optimizations
- **Memoization**: Use React.memo for expensive components
- **Virtual Lists**: For long session lists (180+ items)
- **Lazy Loading**: Load historical data on-demand
- **Debouncing**: Input validation and search
- **Image Optimization**: Use optimized assets

### Benchmarks
- First paint: <500ms (with 180 sessions)
- Tab switch: <100ms
- Session add: <200ms
- Schedule generation: <50ms

## Future Enhancements

1. **Offline Support**: Full offline-first architecture
2. **Data Export**: CSV/PDF reports
3. **Multiple Babies**: Profile switching
4. **Advanced Analytics**: Trends, insights, recommendations
5. **Cloud Sync**: Cross-device synchronization
6. **Accessibility**: Full screen reader support, haptic feedback
7. **Widgets**: Home screen widgets for quick logging
8. **Wear OS**: Smart watch integration

## Contributing

See CONTRIBUTING.md for development guidelines.

## License

MIT License - See LICENSE file for details.
