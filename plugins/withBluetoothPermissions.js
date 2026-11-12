// Config plugin: permisos de Bluetooth clásico para el HC-05.
//
// - Android 12+ (API 31): BLUETOOTH_CONNECT (listar emparejados y conectar) y
//   BLUETOOTH_SCAN marcado "neverForLocation" (la librería cancela el descubrimiento
//   antes de conectar). No se pide ubicación.
// - Android 11 o anterior: BLUETOOTH / BLUETOOTH_ADMIN y ACCESS_FINE_LOCATION,
//   limitados con maxSdkVersion=30.
//
// react-native-bluetooth-classic declara ACCESS_FINE_LOCATION sin límite de versión;
// tools:node="replace" hace que gane esta declaración al fusionar los manifests.
const { withAndroidManifest } = require('expo/config-plugins');

const PERMISSIONS = [
  { name: 'android.permission.BLUETOOTH_CONNECT' },
  { name: 'android.permission.BLUETOOTH_SCAN', attrs: { 'android:usesPermissionFlags': 'neverForLocation' } },
  { name: 'android.permission.BLUETOOTH', attrs: { 'android:maxSdkVersion': '30' } },
  { name: 'android.permission.BLUETOOTH_ADMIN', attrs: { 'android:maxSdkVersion': '30' } },
  { name: 'android.permission.ACCESS_FINE_LOCATION', attrs: { 'android:maxSdkVersion': '30' } },
];

module.exports = function withBluetoothPermissions(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$ = { ...manifest.$, 'xmlns:tools': 'http://schemas.android.com/tools' };

    const permissions = (manifest['uses-permission'] ??= []);
    for (const { name, attrs } of PERMISSIONS) {
      for (let i = permissions.length - 1; i >= 0; i--) {
        if (permissions[i].$?.['android:name'] === name) permissions.splice(i, 1);
      }
      permissions.push({ $: { 'android:name': name, ...attrs, 'tools:node': 'replace' } });
    }

    const features = (manifest['uses-feature'] ??= []);
    if (!features.some((f) => f.$?.['android:name'] === 'android.hardware.bluetooth')) {
      features.push({ $: { 'android:name': 'android.hardware.bluetooth', 'android:required': 'true' } });
    }
    return cfg;
  });
};
