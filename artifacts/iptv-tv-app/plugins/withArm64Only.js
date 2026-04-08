const { withAppBuildGradle } = require("@expo/config-plugins");

module.exports = (config) =>
  withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;

    // Append at the end — Gradle merges multiple android{} blocks
    // This forces arm64-v8a only and enables shrinking
    const arm64Block = `

// ── arm64-only + minification ──────────────────────
android {
    defaultConfig {
        ndk {
            abiFilters "arm64-v8a"
        }
    }
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
        }
    }
}
`;

    if (!gradle.includes("arm64-v8a")) {
      gradle += arm64Block;
    }

    cfg.modResults.contents = gradle;
    return cfg;
  });
