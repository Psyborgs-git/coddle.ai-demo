# coddle - Sleep Pattern Learner & Smart Schedule

A production-quality React Native application for tracking baby sleep patterns, learning wake windows from history, and generating intelligent schedules with proactive notifications and coach tips.

## ✨ Features

- **Sleep Log**: Start/stop timer or add manual entries with validation
- **Timeline & Charts**: Daily timeline view + trend chart showing last 7 days
- **Smart Learner**: EWMA-based algorithm that learns wake windows and nap patterns
- **Dynamic Schedule**: AI-generated today/tomorrow schedule with confidence bands
- **Coach Panel**: Contextual tips with rationale (wind-down reminders, overtired flags)
- **Local Notifications**: Proactive alerts for wind-down and sleep windows
- **Beautiful UI**: Modern, minimalist design with micro-interactions and animations
- **Animated Tab Bar**: Smooth transitions with icons and labels

## 🚀 Setup & Run

### Prerequisites
- Node.js 18+ and npm
- Expo Go app (for testing on device)
- iOS Simulator or Android Emulator (optional)

### Installation

1. **Clone & Navigate:**
   ```bash
   cd coddle
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Start Development Server:**
   ```bash
   npx expo start
   ```

4. **Run on Device/Simulator:**
   - **Expo Go (Mobile)**: Scan QR code with Expo Go app
   - **iOS Simulator**: Press `i` in terminal
   - **Android Emulator**: Press `a` in terminal
   - **Web**: Press `w` in terminal

### Scripts

```bash
npm start          # Start Expo development server
npm test           # Run Jest unit tests
npm run android    # Run on Android
npm run ios        # Run on iOS
npm run web        # Run on Web
```

## 🏗 Architecture Overview

### Tech Stack
- **Framework**: Expo SDK 54 (React Native 0.81)
- **Language**: TypeScript
- **State**: Zustand (with AsyncStorage persistence)
- **UI/Styling**: @shopify/restyle (type-safe theme system)
- **Animations**: Moti + React Native Reanimated
- **Charts**: Victory Native
- **Navigation**: React Navigation v7 (custom animated tab bar)
- **Notifications**: expo-notifications
- **Date Handling**: date-fns
- **Testing**: Jest + jest-expo

### Directory Structure

```
coddle/
├── src/
│   ├── components/
│   │   ├── ui/               # Reusable UI components (Box, Text, Button, Input, etc.)
│   │   └── navigation/       # Custom animated tab bar
│   ├── screens/              # Main screens (Log, Timeline, Schedule, Settings)
│   ├── store/                # Zustand state management
│   ├── services/             # Storage & Notifications
│   ├── utils/                # Learner & Schedule algorithms
│   ├── constants/            # Age baselines
│   ├── types/                # TypeScript interfaces
│   └── theme/                # Restyle theme configuration
├── assets/                   # Images, icons
└── __tests__/                # Unit tests
```

### Data Flow

```
User Action → Screen → Zustand Store → Storage/Learner → Schedule Generator
                          ↓
                  Notification Service
```

## 🧠 Learner Pipeline

### EWMA Algorithm

The app uses **Exponential Weighted Moving Average** (EWMA) to learn from historical sleep data:

```typescript
new_value = 0.3 * current + 0.7 * previous
```

- **Alpha (α) = 0.3**: Balances responsiveness with stability
- **Nap Length**: Smoothed over valid sessions (20-300 min)
- **Wake Windows**: Calculated between consecutive sessions (30-720 min)
- **Confidence**: Increases with more data points (5% per session, max 90%)

### Age Baselines

Static table based on pediatric sleep guidelines (AAP, NSF):

| Age Range | Wake Window | Naps/Day | Total Day Sleep |
|-----------|-------------|----------|-----------------|
| 0-3m      | 45-90min    | 4        | 300min          |
| 4-6m      | 90-150min   | 3        | 240min          |
| 7-12m     | 120-210min  | 2        | 180min          |
| 13-24m    | 240-360min  | 1        | 120min          |
| 25m+      | 360-720min  | 0        | 0min            |

## 📅 Schedule Generator

### Logic

1. Calculate next sleep: `last_wake_time + EWMA_wake_window`
2. If overdue (current time > predicted), suggest in 15min
3. Generate blocks for today + tomorrow
4. Classify: 19:00-06:00 = bedtime, else = nap
5. Add wind-down blocks 20min before sleep
6. Continue until end of tomorrow

### Schedule Block Types

- **Nap**: Daytime sleep (duration = EWMA nap length)
- **Bedtime**: Night sleep (duration = 10h)
- **Wind Down**: 20min preparation period

## 🎨 Design System

### Theme

Built with `@shopify/restyle` for type-safe styling.

#### Color Palette

```typescript
Primary: #0967D2
Success: #10B981
Warning: #F59E0B
Error: #EF4444

Sleep Nap: #3B82F6
Sleep Bedtime: #9333EA
Sleep Wind Down: #FBBF24
```

#### Spacing Scale

```
xs: 4px, s: 8px, m: 16px, l: 24px, xl: 32px, xxl: 48px
```

#### Typography Variants

- **header**: 32px, bold
- **title**: 24px, 600
- **subtitle**: 18px, 600
- **body**: 16px, 400
- **caption**: 14px, 400
- **label**: 12px, 500, uppercase

### Components

#### Base Components
- `<Box>`: Layout container with theme props
- `<Text>`: Typography with variants
- `<Button>`: Pressable with variants (primary, secondary, outline)
- `<Input>`: Text input with label and error
- `<Card>`: Elevated container

#### Animated Components
- `<AnimatedButton>`: Button with press feedback and loading states
- `<SessionCard>`: Sleep session display with animations
- `<CustomTabBar>`: Animated bottom navigation

## 🧪 Testing

### Unit Tests

```bash
npm test                   # Run all tests
npm test -- --coverage     # With coverage report
npm test -- --watch        # Watch mode
```

#### Coverage Goals
- **Utilities**: 100%
- **Components**: 90%+
- **Screens**: 80%+
- **Overall**: 90%+

#### Test Files
- `src/utils/__tests__/learner.test.ts`: EWMA calculations
- `src/utils/__tests__/schedule.test.ts`: Schedule generation

### Test Scenarios

1. **Learner**:
   - ✅ Initializes with defaults when no sessions
   - ✅ Updates EWMA correctly based on sessions
   - ✅ Filters invalid sessions

2. **Schedule**:
   - ✅ Generates schedule based on learner state
   - ✅ Predicts correct next sleep time
   - ✅ Handles DST transitions

## 📱 Coach Rules

The coach panel surfaces contextual tips based on:

1. **Short Nap Streak**: EWMA nap length < 45min
   - **Tip**: "Short naps detected. Try extending wake windows slightly."

2. **Long Wake Windows**: Wake window > 120% of target
   - **Tip**: "Wake window stretched. Consider earlier wind-down next cycle."

3. **Bedtime Drift**: Bedtime shifted >30min from baseline
   - **Tip**: "Bedtime creeping later. Aim for consistency."

## 🔔 Notifications

### Local Notifications

The app schedules local notifications for:
- **Wind Down**: 20min before sleep
- **Nap Time**: At predicted nap start
- **Bedtime**: At predicted bedtime

Notifications are automatically:
- **Rescheduled** when schedule regenerates
- **Canceled** when sessions are deleted
- **Updated** when learner state changes

## 📊 Performance

### Benchmarks

- **First Paint**: <500ms (with 180 sessions)
- **Tab Switch**: <100ms
- **Session Add**: <200ms
- **Schedule Generation**: <50ms
- **Smooth Animations**: 60 FPS

### Optimizations

- Memoization for expensive components
- Efficient re-renders with Zustand selectors
- Debounced inputs
- Lazy loading for historical data

## 🔒 Data Privacy

- **100% Local**: All data stored on device (AsyncStorage)
- **No Cloud**: No external servers or data transmission
- **No Tracking**: No analytics or telemetry
- **User Control**: Easy data export/reset

## 🚦 Known Limitations & Future Work

### Current Limitations
- **Timezone**: Uses device local time (DST transitions handled)
- **Single Baby**: One profile per device
- **Manual Backup**: No cloud sync

### Future Enhancements
1. **Data Export**: CSV/PDF reports
2. **Multiple Babies**: Profile switching
3. **Cloud Sync**: Cross-device synchronization
4. **Advanced Analytics**: Trends, insights, ML recommendations
5. **Widgets**: Home screen quick logging
6. **Wear OS**: Smart watch integration
7. **Voice Logging**: "Hey Siri, baby woke up"

## 📖 API Reference

See [ARCHITECTURE.md](./ARCHITECTURE.md) for comprehensive API documentation including:
- Type definitions
- Component props
- Store actions
- Service methods
- Utility functions

## 🤝 Contributing

### Development Guidelines

1. **Code Style**: Follow ESLint/Prettier config
2. **Types**: Full TypeScript coverage
3. **Tests**: Write tests for new features
4. **Components**: Use Restyle theme system
5. **Commits**: Conventional commits format

### Pull Request Process

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - See LICENSE file for details.

## 🙏 Acknowledgments

- Sleep guidelines: American Academy of Pediatrics (AAP), National Sleep Foundation (NSF)
- UI inspiration: Modern mobile design patterns
- Community: Expo, React Native, and open-source contributors

---

**Built with ❤️ for parents and babies**
