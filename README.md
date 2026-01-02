# Coddle (Expo app)

A small Expo React Native app for sleep coaching. This README explains how to install dependencies and run the app locally with Expo Go.

## Prerequisites

- Node.js (16+ recommended)
- pnpm (https://pnpm.io/)
- Expo CLI (optional) — you can use `npx expo` if you don't have it installed
- Expo Go app on your physical iOS/Android device for quick testing

> Note: For push notifications and certain native features, you may need a development build (EAS) or a device-specific build. Local (in-app) notifications usually work in Expo Go.

## Quickstart (Expo Go)

1. Clone the repository:

   git clone <your-repo-url>
   cd coddle-expo

2. Install dependencies:

   pnpm install

3. Start the dev server:

   pnpm start

   This runs `expo start` (Metro). A browser tab will open with the Expo dev tools.

4. Open the app on your device:

   - Scan the QR code shown by Expo Dev Tools using the Expo Go app, or
   - Press `a` / `i` in the terminal to open an Android / iOS simulator (if available)

## Running tests

From the `coddle-expo` directory run:

   pnpm test

## Notes

- If you need to test push notifications or other native-only features, create a development build with EAS: https://docs.expo.dev/development/introduction/
- If you want CI or additional setup instructions added to this README, tell me which CI provider and I can add a sample workflow.

---

If you'd like the README updated with your repo URL, owner name, or screenshots, say so and I'll update it.