import * as Haptics from 'expo-haptics';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';

import { colors, fonts, radius } from '../theme';
import { Corners } from './Corners';

interface Props {
  label: string;
  /** -1 (atrás a tope) a 1 (adelante a tope). Se llama en cada movimiento, sin renders. */
  onValue: (value: number) => void;
  /** El pulgar tocó el slider. */
  onGrab?: () => void;
  style?: StyleProp<ViewStyle>;
}

const THUMB_HEIGHT = 64;
const TICKS = [-0.75, -0.5, -0.25, 0.25, 0.5, 0.75];

function clampUnit(v: number) {
  return Math.max(-1, Math.min(1, v));
}

/**
 * Slider vertical "flotante": el cero es el punto donde se apoya el pulgar, así
 * no hace falta mirar para encontrar el centro. Arriba = adelante. Al soltar
 * vuelve a 0. Toda la columna es zona táctil.
 */
export function TankSlider({ label, onValue, onGrab, style }: Props) {
  const [value] = useState(() => new Animated.Value(0));
  const [trackHeight, setTrackHeight] = useState(0);
  const travel = useRef(120); // px de dedo para llegar al 100 %
  const handlers = useRef({ onValue, onGrab });
  useLayoutEffect(() => {
    handlers.current = { onValue, onGrab };
  });

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    setTrackHeight(h);
    travel.current = Math.max(80, Math.min(160, h * 0.42));
  };

  const config = useMemo(
    () => ({
      minDistance: 0,
      disableReanimated: true,
      runOnJS: true,
      shouldCancelWhenOutside: false,
      onBegin: () => {
        value.stopAnimation();
        value.setValue(0);
        handlers.current.onGrab?.();
        Haptics.selectionAsync().catch(() => {});
      },
      onUpdate: (e: { translationY: number }) => {
        const v = clampUnit(-e.translationY / travel.current);
        value.setValue(v);
        handlers.current.onValue(v);
      },
      onFinalize: () => {
        handlers.current.onValue(0);
        Animated.spring(value, { toValue: 0, useNativeDriver: true, speed: 30, bounciness: 3 }).start();
      },
    }),
    [value],
  );
  const gesture = usePanGesture(config);

  const half = Math.max(0, trackHeight / 2);
  const maxOffset = Math.max(0, half - THUMB_HEIGHT / 2 - 6);
  const thumbY = value.interpolate({ inputRange: [-1, 1], outputRange: [maxOffset, -maxOffset] });
  const forward = value.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const reverse = value.interpolate({ inputRange: [-1, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.column, style]}>
        <Text style={styles.arrow}>▲</Text>
        <View style={styles.track} onLayout={onTrackLayout}>
          <Corners color={colors.lineHi} />
          {TICKS.map((t) => (
            <View key={t} style={[styles.tick, { top: half - t * maxOffset }]} />
          ))}
          <Animated.View
            style={[styles.fill, styles.fillForward, { height: half, transform: [{ scaleY: forward }] }]}
          />
          <Animated.View
            style={[styles.fill, styles.fillReverse, { top: half, height: half, transform: [{ scaleY: reverse }] }]}
          />
          <View style={[styles.centerLine, { top: half - 1 }]} />
          <Animated.View
            style={[styles.thumb, { top: half - THUMB_HEIGHT / 2, transform: [{ translateY: thumbY }] }]}
          >
            <View style={styles.grip} />
            <View style={styles.grip} />
            <View style={styles.grip} />
          </Animated.View>
        </View>
        <Text style={styles.arrow}>▼</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  column: {
    alignItems: 'stretch',
    paddingHorizontal: 6,
  },
  arrow: {
    color: colors.textFaint,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 18,
  },
  track: {
    flex: 1,
    marginHorizontal: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  tick: {
    position: 'absolute',
    left: '30%',
    right: '30%',
    height: 2,
    backgroundColor: colors.line,
  },
  fill: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  fillForward: {
    top: 0,
    backgroundColor: colors.redSoft,
    borderTopWidth: 3,
    borderColor: colors.red,
    transformOrigin: 'bottom',
  },
  fillReverse: {
    backgroundColor: 'rgba(207, 203, 195, 0.12)',
    borderBottomWidth: 3,
    borderColor: colors.steel,
    transformOrigin: 'top',
  },
  centerLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.lineHi,
  },
  thumb: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: THUMB_HEIGHT,
    borderRadius: radius.md,
    backgroundColor: colors.red,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    boxShadow: '0 0 18px rgba(255, 43, 43, 0.55)',
  },
  grip: {
    width: '46%',
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  label: {
    marginTop: 2,
    textAlign: 'center',
    color: colors.textDim,
    fontFamily: fonts.heavy,
    fontSize: 18,
    letterSpacing: 3,
  },
});
