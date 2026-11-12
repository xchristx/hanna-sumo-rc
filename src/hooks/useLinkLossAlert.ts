import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';

import { useBluetooth } from './useBluetooth';

/**
 * Vibra cada vez que el enlace se cae sin que el piloto haya desconectado:
 * socket cerrado, Bluetooth apagado o el robot dejó de contestar "OK"
 * (por ejemplo, si el Arduino se reinició por una caída de batería).
 */
export function useLinkLossAlert(): void {
  const { linkLosses } = useBluetooth();
  const seen = useRef(linkLosses);

  useEffect(() => {
    if (linkLosses <= seen.current) return;
    seen.current = linkLosses;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }, 350);
  }, [linkLosses]);
}
