# Screen Capture (Foreground)

This module provides a foreground-only screenshot capture flow for React Native (Android + iOS).

What it does
- Fetches news images from a configured Redbox API endpoint
- Renders the images into a dedicated view
- Captures that view every 2 minutes and uploads the screenshot to a configured endpoint

Important: This is foreground-only. Background capture (when the app is closed) is not implemented.

Installation
1. Install dependencies

```bash
npm install
npm install react-native-view-shot axios
```

2. Link native dependencies (if needed)

```bash
npx pod-install
```

Usage
Import and render the component somewhere in your app:

```tsx
import React from 'react';
import {ForegroundCaptureComponent} from './src/screenCapture';

export default function App() {
  return <ForegroundCaptureComponent />;
}
```

Configuration
Edit `src/screenCapture/config.ts` or set environment variables:
- REDBOX_NEWS_API
- SCREENSHOT_UPLOAD_API
- SCREENSHOT_UPLOAD_TOKEN

Notes
- The module uses placeholders by default: `https://api.redboxnews.example.com/news` and `https://httpbin.org/post` for upload.
- Make sure you have user consent to capture and upload screenshots.

Android background (MediaProjection)
----------------------------------
This project includes a native Android foreground service using MediaProjection to capture the screen. Important notes:

- The service requests system MediaProjection permission via a system dialog (user must tap Allow).
- A persistent notification is shown while the service runs.
- You must run the app on a real device and accept the MediaProjection dialog when requested.
- To start the background capture from JS, use the `requestPermissionAndStart()` function exported from `src/screenCapture/androidBridge.ts`.

Example JS usage:

```ts
import {requestPermissionAndStart, stopBackgroundService} from './src/screenCapture/androidBridge';

async function startBackground() {
  const res = await requestPermissionAndStart();
  console.log('start background', res);
}

function stopBackground() {
  stopBackgroundService();
}
```

Security & policy
-----------------
- Background screen capture is privacy-sensitive. Do not publish this behavior to public app stores without ensuring policy compliance and explicit user consent. Prefer enterprise/MDM distribution if required.

