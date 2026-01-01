# Quick Start Guide

## 🚀 Running the App

### Start Development Server
```bash
cd coddle-expo
npx expo start
```

Then press:
- `i` for iOS simulator
- `a` for Android emulator
- `w` for web browser

### Alternative: Direct Launch
```bash
# iOS
npx expo run:ios

# Android  
npx expo run:android
```

## ✅ Testing Checklist

### 1. Sleep Log Screen
- [ ] Tap "Start Sleep" - should show info toast and start timer
- [ ] Wait 11+ minutes, tap "Wake Up" - should show success toast
- [ ] Try to wake up before 10 minutes - should show error toast
- [ ] Try to start sleep within 5 minutes of waking - should show error toast
- [ ] Tap "Add Past Session" - modal should open with date/time pickers
- [ ] Try to add session with start > end - should show error
- [ ] Try to add session in future - should show error
- [ ] Add valid manual session - should show success toast
- [ ] Check recent sessions list displays correctly

### 2. Timeline Screen  
- [ ] Verify bar chart displays last 7 days
- [ ] Check empty state if no data
- [ ] Long press on session card - delete confirmation should appear
- [ ] Delete session - should show success toast and update chart
- [ ] Coach tips should display if any rules triggered

### 3. Schedule Screen
- [ ] Schedule blocks should display with times
- [ ] Each block shows confidence level
- [ ] What-if slider should adjust future blocks
- [ ] Coach widget displays relevant tips

### 4. Settings Screen
- [ ] View/edit baby profile
- [ ] Change birth date using picker
- [ ] Profile data persists after app restart

### 5. Theme Testing
- [ ] Change device to dark mode - app should update
- [ ] Change device to light mode - app should update
- [ ] All screens should be readable in both modes

### 6. Mock Data (FAB Button)
- [ ] Tap floating blue "+" button
- [ ] Mock sessions should be added
- [ ] Chart and timeline should update immediately
- [ ] Learner state should recalculate

## 🧪 Unit Tests

```bash
cd coddle-expo
npx jest
```

Expected output:
```
PASS  src/utils/__tests__/learner.test.ts
PASS  src/utils/__tests__/schedule.test.ts

Tests: 4 passed, 4 total
```

## 🎯 Key Features to Demo

### Validation Constraints
1. Start sleep timer
2. Stop before 10 minutes → Error: "Sleep session must be at least 10 minutes"
3. Wait 10+ minutes, stop → Success!

### Smart Learning
1. Add 3-4 manual sessions with similar durations (e.g., 1.5 hours each)
2. Go to Schedule screen
3. Notice confidence increases with more consistent data
4. Schedule blocks reflect learned patterns

### Coach Tips
1. Add several short naps (<30 min)
2. Go to Timeline → Coach widget shows "Short Nap Streak" warning
3. Add a long wake window (>3 hours for young baby)
4. Coach warns about overtired risk

### Interactive Charts
1. Log sessions over multiple days
2. Timeline screen shows bar chart with daily sleep totals
3. Chart updates immediately when sessions are added/deleted

## 🔧 Troubleshooting

### App won't start
```bash
# Clear cache
npx expo start --clear

# Reset node_modules
rm -rf node_modules
pnpm install
```

### TypeScript errors
```bash
npx tsc --noEmit
```

### Tests failing
```bash
npx jest --clearCache
npx jest --verbose
```

## 📱 Device Requirements

- iOS: 13.0+
- Android: 5.0+ (API 21)
- Node: 16+
- Expo SDK: 54

## 🎨 UI Notes

### Colors
- Primary: Blue (#0967D2)
- Sleep (Bedtime): Purple (#6B46C1)
- Wake: Yellow/Orange (#F59E0B)
- Success: Green (#10B981)
- Error: Red (#EF4444)

### Haptic Feedback
All button taps provide haptic feedback:
- Medium impact on press
- Success notification on completion
- Error notification on validation failure

### Toasts
- Top position
- Auto-dismiss after 3 seconds
- Icons indicate type (success/error/info)

---

**Ready to test!** 🎉

Report any issues with specific steps to reproduce.
