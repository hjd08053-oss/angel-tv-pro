const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

// Copy banner image into Android res/drawable-xhdpi
const withTvBannerAsset = (config) => {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const src = path.join(__dirname, "../assets/images/banner.png");
      const destDir = path.join(cfg.modRequest.platformProjectRoot, "app/src/main/res/drawable-xhdpi");
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(src, path.join(destDir, "tv_banner.png"));
      return cfg;
    },
  ]);
};

// Add android:banner and LEANBACK_LAUNCHER to the manifest
const withTvManifest = (config) => {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const app = manifest.manifest.application[0];

    // Set android:banner on <application>
    app.$["android:banner"] = "@drawable/tv_banner";

    // Find main activity
    const activities = app.activity || [];
    const mainActivity = activities.find(
      (a) => a.$["android:name"] === ".MainActivity"
    ) || activities[0];

    if (mainActivity) {
      // Ensure android:banner on the activity too
      mainActivity.$["android:banner"] = "@drawable/tv_banner";

      // Ensure LEANBACK_LAUNCHER intent filter exists
      const intentFilters = mainActivity["intent-filter"] || [];
      const hasLeanback = intentFilters.some((f) => {
        const cats = f.category || [];
        return cats.some(
          (c) => c.$["android:name"] === "android.intent.category.LEANBACK_LAUNCHER"
        );
      });

      if (!hasLeanback) {
        intentFilters.push({
          action: [{ $: { "android:name": "android.intent.action.MAIN" } }],
          category: [
            { $: { "android:name": "android.intent.category.LEANBACK_LAUNCHER" } },
          ],
        });
        mainActivity["intent-filter"] = intentFilters;
      }
    }

    // Ensure leanback feature declared
    const uses = manifest.manifest["uses-feature"] || [];
    const hasLeanbackFeature = uses.some(
      (f) => f.$["android:name"] === "android.software.leanback"
    );
    if (!hasLeanbackFeature) {
      uses.push({
        $: {
          "android:name": "android.software.leanback",
          "android:required": "true",
        },
      });
    }
    manifest.manifest["uses-feature"] = uses;

    return cfg;
  });
};

module.exports = (config) => {
  config = withTvBannerAsset(config);
  config = withTvManifest(config);
  return config;
};
