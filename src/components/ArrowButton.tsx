import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '../theme';
import { Corners } from './Corners';
import { HoldZone } from './HoldZone';

export type ArrowDirection = 'up' | 'down' | 'left' | 'right';

interface Props {
  direction: ArrowDirection;
  onPressIn: () => void;
  onPressOut: () => void;
  style?: StyleProp<ViewStyle>;
}

const ROTATION: Record<ArrowDirection, string> = {
  up: '0deg',
  right: '90deg',
  down: '180deg',
  left: '270deg',
};

/** Flecha digital: vale 1 mientras el dedo está apoyado y 0 al soltar. */
export function ArrowButton({ direction, onPressIn, onPressOut, style }: Props) {
  return (
    <HoldZone onPressIn={onPressIn} onPressOut={onPressOut} style={style}>
      {(pressed) => (
        <View style={[styles.body, pressed && styles.bodyPressed]}>
          <Corners color={pressed ? colors.red : colors.lineHi} size={14} />
          <View style={[styles.triangle, pressed && styles.trianglePressed, { transform: [{ rotate: ROTATION[direction] }] }]} />
        </View>
      )}
    </HoldZone>
  );
}

const SIZE = 30;

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    overflow: 'hidden',
  },
  bodyPressed: {
    borderColor: colors.red,
    backgroundColor: colors.redSoft,
    boxShadow: '0 0 22px rgba(255, 43, 43, 0.45)',
    transform: [{ scale: 0.97 }],
  },
  // Triángulo hecho con bordes: nítido en cualquier densidad y sin depender de la fuente.
  triangle: {
    width: 0,
    height: 0,
    borderLeftWidth: SIZE * 0.85,
    borderRightWidth: SIZE * 0.85,
    borderBottomWidth: SIZE * 1.3,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.textDim,
  },
  trianglePressed: {
    borderBottomColor: colors.red,
  },
});
