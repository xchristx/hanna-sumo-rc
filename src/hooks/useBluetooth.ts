import { useSyncExternalStore } from 'react';

import { bluetooth, type BluetoothState } from '../bluetooth/BluetoothService';

/** Estado del servicio Bluetooth. Solo re-renderiza cuando algo cambia de verdad. */
export function useBluetooth(): BluetoothState {
  return useSyncExternalStore(bluetooth.subscribe, bluetooth.getState);
}
