// Config plugin: en Windows, el C++ que genera la New Architecture produce rutas de
// más de 260 caracteres. El ninja de CMake 3.22 (el que AGP usa por defecto) no las
// soporta; el de CMake 3.31 sí, siempre que Windows tenga LongPathsEnabled=1 (ver
// README). Solo se activa al compilar en Windows, así EAS (Linux) no cambia.
// AGP no descarga CMake solo: hay que instalar "cmake;3.31.6" en el Android SDK.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// withWindowsCMake';
const CMAKE_VERSION = '3.31.6';

const SNIPPET = `
${MARKER}
if (System.getProperty('os.name').toLowerCase().contains('windows')) {
  android.externalNativeBuild.cmake.version = '${CMAKE_VERSION}'
}
`;

module.exports = function withWindowsCMake(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('withWindowsCMake: se esperaba android/app/build.gradle en Groovy');
    }
    if (!cfg.modResults.contents.includes(MARKER)) {
      cfg.modResults.contents += SNIPPET;
    }
    return cfg;
  });
};
