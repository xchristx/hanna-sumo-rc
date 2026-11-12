import * as Haptics from 'expo-haptics';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';

import { colors, fonts, radius } from '../theme';

const HOLD_MS = 600;

interface Props {
  label: string;
  onTrigger: () => void;
}

/**
 * Botón de navegación de la pantalla de control: hay que mantenerlo 0,6 s
 * (se ve una barra llenándose). Así un toque accidental en plena pelea no
 * saca a Hanna del control.
 */
export function NavHoldButton({ label, onTrigger }: Props) {
  const [progress] = useState(() => new Animated.Value(0));
  const trigger = useRef(onTrigger);
  useLayoutEffect(() => {
    trigger.current = onTrigger;
  });

  const config = useMemo(
    () => ({
      minDistance: 0,
      disableReanimated: true,
      runOnJS: true,
      onBegin: () => {
        progress.setValue(0);
        Animated.timing(progress, {
          toValue: 1,
          duration: HOLD_MS,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (!finished) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          trigger.current();
        });
      },
      onFinalize: () => {
        progress.stopAnimation();
        progress.setValue(0);
      },
    }),
    [progress],
  );
  const gesture = usePanGesture(config);

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.button}>
        <Animated.View style={[styles.fill, { transform: [{ scaleX: progress }] }]} />
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.hint}>MANTENER</Text>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 46,
    minWidth: 104,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  fill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.lineHi,
    transformOrigin: 'left',
  },
  label: {
    color: colors.text,
    fontFamily: fonts.heavy,
    fontSize: 17,
    lineHeight: 19,
    letterSpacing: 2,
  },
  hint: {
    color: colors.textFaint,
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 12,
    letterSpacing: 2,
  },
});
