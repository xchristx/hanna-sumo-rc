This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Project layout (Hanna Sumo RC)

- Android-only, landscape, Bluetooth Classic (HC-05) robot controller. No Expo Router: `App.tsx` switches between three screens in `src/screens/` with plain state and handles the Android back button.
- `src/bluetooth/` service + protocol (`L,R\n` at 20 Hz, robot answers `OK\n`), `src/hooks/`, `src/components/`, `src/logic/` (pure drive math).
- Control-screen inputs must use `react-native-gesture-handler` (not `Pressable`) so sliders and buttons work simultaneously. Inputs are written to a ref (`useDriveInput`) and read by the 20 Hz loop (`useDriveLoop`); never drive the send loop from React state.
- Control modes (`ControlMode` in `src/logic/drive.ts`): `tank`, `joystick`, `dpad` (arrow buttons, digital, mixed with `arcadeMix`).
- Play Store: `production` EAS profile builds an AAB with remote `versionCode`; publishing steps in `docs/PLAY_STORE.md`, store graphics in `store/`. Never commit `google-play-service-account.json`.
- Firmware lives in `firmware/` (Arduino Nano, `arduino:avr:nano:cpu=atmega328old`); keep its comments in Spanish.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
