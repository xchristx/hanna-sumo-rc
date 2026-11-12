import { PermissionsAndroid, Platform, type Permission } from 'react-native';

export type PermissionStatus = 'granted' | 'denied' | 'blocked';

function androidApiLevel(): number {
  return typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
}

/**
 * Android 12+ (API 31): BLUETOOTH_CONNECT para listar/conectar y BLUETOOTH_SCAN
 * porque la librería cancela el descubrimiento antes de conectar.
 * Android ≤ 11: los permisos de Bluetooth son de instalación, pero se necesita
 * ACCESS_FINE_LOCATION.
 */
function requiredPermissions(): Permission[] {
  if (androidApiLevel() >= 31) {
    return [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    ];
  }
  return [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
}

/** Pide los permisos que falten. Si ya están concedidos no muestra ningún diálogo. */
export async function ensureBluetoothPermissions(): Promise<PermissionStatus> {
  if (Platform.OS !== 'android') return 'granted';

  const permissions = requiredPermissions();
  const result = await PermissionsAndroid.requestMultiple(permissions);
  const statuses = permissions.map((p) => result[p]);

  if (statuses.every((s) => s === PermissionsAndroid.RESULTS.GRANTED)) return 'granted';
  if (statuses.some((s) => s === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)) return 'blocked';
  return 'denied';
}
