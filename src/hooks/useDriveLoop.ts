import { useEffect, useLayoutEffect, useRef } from 'react';

import { bluetooth } from '../bluetooth/BluetoothService';
import { SEND_INTERVAL_MS } from '../bluetooth/protocol';
import { computeMotorCommand, type DriveSettings } from '../logic/drive';
import { useDriveInput } from './useDriveInput';

/**
 * Lazo de envío a 20 Hz, independiente del render: el intervalo se crea una sola
 * vez y lee entradas y ajustes desde refs. Manda siempre, aunque sea "0,0",
 * porque el robot lo usa como heartbeat.
 */
export function useDriveLoop(settings: DriveSettings): void {
  const inputRef = useDriveInput();
  const settingsRef = useRef(settings);
  useLayoutEffect(() => {
    settingsRef.current = settings;
  });

  useEffect(() => {
    const id = setInterval(() => {
      const { left, right } = computeMotorCommand(inputRef.current, settingsRef.current);
      bluetooth.sendCommand(left, right);
    }, SEND_INTERVAL_MS);
    return () => clearInterval(id);
  }, [inputRef]);
}
