# ANGEL TV Pro 📺

  > Personal IPTV platform — Android TV app with 32K+ movies, 13K+ series, 10K+ live channels

  ## Features
  - 🎬 32,000+ Movies | 13,000+ Series | 10,000+ Live Channels
  - 📺 Native Android TV app (D-pad navigation, LEANBACK launcher)
  - 🔄 OTA updates via Expo EAS
  - 🛡️ Subscription system (monthly/annual/lifetime)
  - ⚙️ Admin panel with content management
  - 🌙 Dark olive/gold theme

  ## Stack
  - **TV App**: React Native (Expo) — `artifacts/iptv-tv-app/`
  - **API Server**: Node.js + Express (Xtream Codes proxy) — `artifacts/api-server/`
  - **Admin Panel**: React + Vite — `artifacts/iptv-app/`

  ## Xtream Codes Integration
  Connects to an Xtream Codes server to stream live TV, VOD, and series.

  ## Build
  ```bash
  pnpm install
  # TV App APK
  cd artifacts/iptv-tv-app && eas build --profile production --platform android
  ```

  ---
  Built on Replit 🚀