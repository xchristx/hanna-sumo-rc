// Config plugin: react-native-bluetooth-classic usa BuildConfig.DEBUG, pero desde
// AGP 8 los módulos de librería ya no generan BuildConfig por defecto y el build
// falla con "cannot find symbol: BuildConfig". Se activa solo para esa librería,
// desde el build.gradle raíz, para que sobreviva a cada `expo prebuild`.
const { withProjectBuildGradle } = require('expo/config-plugins');

const MARKER = '// withBluetoothClassicBuildConfig';

const SNIPPET = `
${MARKER}
subprojects { subproject ->
  if (subproject.name == 'react-native-bluetooth-classic') {
    subproject.plugins.withId('com.android.library') {
      subproject.android.buildFeatures.buildConfig = true
    }
  }
}
`;

module.exports = function withBluetoothClassicBuildConfig(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('withBluetoothClassicBuildConfig: se esperaba android/build.gradle en Groovy');
    }
    if (!cfg.modResults.contents.includes(MARKER)) {
      cfg.modResults.contents += SNIPPET;
    }
    return cfg;
  });
};
