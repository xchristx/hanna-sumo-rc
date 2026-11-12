import { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { useBluetooth } from '../hooks/useBluetooth';
import { colors } from '../theme';

/**
 * Marco rojo que late alrededor de toda la pantalla mientras no hay enlace.
 * Se ve con el rabillo del ojo, sin tener que leer nada.
 */
export function LinkFrame() {
  const { linkAlive } = useBluetooth();
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (linkAlive) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 450, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [linkAlive, pulse]);

  return <Animated.View pointerEvents="none" style={[styles.frame, { opacity: pulse }]} />;
}

const styles = StyleSheet.create({
  frame: {
    ...StyleSheet.absoluteFill,
    borderWidth: 5,
    borderColor: colors.red,
  },
});
