# Capacitor Android App Update Guide

This guide explains how to update and maintain the Android version of the repLog app using Capacitor.

## Prerequisites

- Node.js and npm installed
- Android Studio installed
- Capacitor CLI (installed as dev dependency)

## Project Configuration

- **App ID**: `repLog.app`
- **App Name**: `repLog`
- **Web Directory**: `dist/code/browser/`
- **Capacitor Version**: 8.1.0

## Standard Update Workflow

### 1. Build the Angular Application

First, build your Angular app to generate the web assets:

```bash
npm run build
```

This creates the production build in `dist/code/browser/`.

### 2. Sync Changes to Android

Copy web assets and update native dependencies:

```bash
npx cap sync android
```

**What this does:**

- Copies web assets from `dist/code/browser/` to `android/app/src/main/assets/public/`
- Updates Capacitor plugins
- Syncs `capacitor.config.ts` changes
- Updates native dependencies in gradle files

### 3. Open in Android Studio

Launch Android Studio to build and run the app:

```bash
npx cap open android
```

From Android Studio, you can:

- Build the APK
- Run on emulator or physical device
- Generate signed release builds
- Debug native code

## Quick Commands

### One-liner for Development

```bash
npm run build && npx cap sync android
```

### Copy Web Assets Only

If you only changed web code and don't need to update plugins:

```bash
npx cap copy android
```

This is faster than `sync` as it only copies web assets.

### Update Native Dependencies

```bash
npx cap update android
```

Updates Capacitor Android platform to the latest compatible version.

## Common Scenarios

### Scenario 1: Web Code Changes

You modified TypeScript, HTML, CSS, or other web assets.

```bash
npm run build
npx cap copy android
npx cap open android
```

### Scenario 2: Added Capacitor Plugin

You installed a new Capacitor plugin (e.g., Camera, Geolocation).

```bash
npm install @capacitor/camera
npm run build
npx cap sync android
npx cap open android
```

### Scenario 3: Updated capacitor.config.ts

You changed app configuration.

```bash
npm run build
npx cap sync android
```

### Scenario 4: Native Code Changes

You modified Android-specific code in Android Studio.

- Make changes directly in Android Studio
- Build and run from Android Studio
- No sync needed unless web assets changed

## Building for Production

### 1. Build Optimized Web App

```bash
npm run build
```

### 2. Sync to Android

```bash
npx cap sync android
```

### 3. Generate Signed APK/AAB

Open Android Studio:

```bash
npx cap open android
```

Then in Android Studio:

- Go to **Build > Generate Signed Bundle / APK**
- Select APK or Android App Bundle (AAB)
- Follow the signing wizard
- Choose release build variant

## Updating Capacitor

### Minor/Patch Updates

```bash
npm update @capacitor/core @capacitor/cli @capacitor/android
npx cap sync android
```

### Major Version Updates

Follow the [official migration guide](https://capacitorjs.com/docs/updating/):

```bash
npm install @capacitor/core@latest @capacitor/cli@latest @capacitor/android@latest
npx cap sync android
```

## Troubleshooting

### Issue: "Web asset directory not found"

**Solution**: Make sure you built the Angular app first:

```bash
npm run build
```

### Issue: Gradle sync failed

**Solution**: Open Android Studio and sync gradle manually, or try:

```bash
cd android
./gradlew clean
cd ..
npx cap sync android
```

### Issue: Changes not reflected in app

**Solution**:

1. Clear build cache: `npm run build`
2. Force sync: `npx cap sync android`
3. In Android Studio: **Build > Clean Project**, then **Build > Rebuild Project**

### Issue: Plugin not working after installation

**Solution**: Always sync after plugin installation:

```bash
npm install @capacitor/plugin-name
npx cap sync android
```

## Development Tips

### Live Reload

For faster development, use live reload:

1. Start Angular dev server:

   ```bash
   npm start
   ```

2. Update `capacitor.config.ts` to point to your dev server:

   ```typescript
   server: {
     url: 'http://YOUR_LOCAL_IP:4200',
     cleartext: true
   }
   ```

3. Sync and run:

   ```bash
   npx cap sync android
   npx cap open android
   ```

**Remember**: Remove server configuration before production builds!

### Useful npm Scripts

Add these to `package.json` for convenience:

```json
"scripts": {
  "cap:sync": "npm run build && npx cap sync android",
  "cap:open": "npx cap open android",
  "cap:build": "npm run build && npx cap sync android && npx cap open android"
}
```

Usage:

```bash
npm run cap:build
```

## Version History

- Capacitor 8.1.0 (Current)
- Angular 21.1.0

## Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Capacitor Android Documentation](https://capacitorjs.com/docs/android)
- [Angular Build Documentation](https://angular.dev/tools/cli/build)
