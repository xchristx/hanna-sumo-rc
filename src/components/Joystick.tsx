import * as Haptics from 'expo-haptics';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';

import { colors, fonts, radius } from '../theme';
import { Corners } from './Corners';

interface Props {
  /** x: -1 izquierda … 1 derecha; y: -1 atrás … 1 adelante. */
  onValue: (x: number, y: number) => void;
  onGrab?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Joystick "flotante": el centro es donde se apoya el pulgar (en cualquier parte
 * del recuadro). El dibujo muestra el desplazamiento sobre una base fija.
 */
export function Joystick({ onValue, onGrab, style }: Props) {
  const [offset] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));
  const [size, setSize] = useState({ width: 0, height: 0 });
  const radiusRef = useRef(100);
  const handlers = useRef({ onValue, onGrab });
  useLayoutEffect(() => {
    handlers.current = { onValue, onGrab };
  });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
    radiusRef.current = Math.max(60, Math.min(width, height) * 0.36);
  };

  const config = useMemo(
    () => ({
      minDistance: 0,
      disableReanimated: true,
      runOnJS: true,
      shouldCancelWhenOutside: false,
      onBegin: () => {
        offset.stopAnimation();
        offset.setValue({ x: 0, y: 0 });
        handlers.current.onGrab?.();
        Haptics.selectionAsync().catch(() => {});
      },
      onUpdate: (e: { translationX: number; translationY: number }) => {
        const r = radiusRef.current;
        let dx = e.translationX;
        let dy = e.translationY;
        const distance = Math.hypot(dx, dy);
        if (distance > r) {
          dx = (dx / distance) * r;
          dy = (dy / distance) * r;
        }
        offset.setValue({ x: dx, y: dy });
        handlers.current.onValue(dx / r, -dy / r);
      },
      onFinalize: () => {
        handlers.current.onValue(0, 0);
        Animated.spring(offset, { toValue: { x: 0, y: 0 }, useNativeDriver: true, speed: 30, bounciness: 3 }).start();
      },
    }),
    [offset],
  );
  const gesture = usePanGesture(config);

  const baseRadius = Math.max(60, Math.min(size.width, size.height) * 0.36);
  const knob = baseRadius * 0.82;
  const cx = size.width / 2;
  const cy = size.height / 2;

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.area, style]} onLayout={onLayout}>
        <Corners color={colors.lineHi} size={18} />
        {size.width > 0 && (
          <>
            <View
              style={[
                styles.base,
                { left: cx - baseRadius, top: cy - baseRadius, width: baseRadius * 2, height: baseRadius * 2, borderRadius: baseRadius },
              ]}
            >
              <View style={styles.crossH} />
              <View style={styles.crossV} />
              <View style={[styles.shikiri, { top: '30%' }]} />
              <View style={[styles.shikiri, { bottom: '30%' }]} />
            </View>
            <Text style={[styles.hint, { top: cy - baseRadius - 28 }]}>ADELANTE</Text>
            <Text style={[styles.hint, { top: cy + baseRadius + 6 }]}>ATRÁS</Text>
            <Animated.View
              style={[
                styles.knob,
                {
                  left: cx - knob / 2,
                  top: cy - knob / 2,
                  width: knob,
                  height: knob,
                  borderRadius: knob / 2,
                  transform: offset.getTranslateTransform(),
                },
              ]}
            >
              <View style={styles.knobCore} />
            </Animated.View>
          </>
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  area: {
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  base: {
    position: 'absolute',
    borderWidth: 5,
    borderColor: colors.ring,
    backgroundColor: '#050506',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  crossH: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 1,
    backgroundColor: colors.line,
  },
  crossV: {
    position: 'absolute',
    top: 12,
    bottom: 12,
    width: 1,
    backgroundColor: colors.line,
  },
  shikiri: {
    position: 'absolute',
    width: '26%',
    height: 4,
    backgroundColor: '#6B4A2E',
  },
  hint: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: colors.textFaint,
    fontFamily: fonts.heavy,
    fontSize: 15,
    letterSpacing: 3,
  },
  knob: {
    position: 'absolute',
    backgroundColor: colors.red,
    borderWidth: 3,
    borderColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 26px rgba(255, 43, 43, 0.6)',
  },
  knobCore: {
    width: '38%',
    height: '38%',
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
});
