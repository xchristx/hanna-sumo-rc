import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, radius } from '../theme';
import { HoldZone } from './HoldZone';

interface Props {
  onPressIn: () => void;
  onPressOut: () => void;
  style?: StyleProp<ViewStyle>;
}

/** 100 % de potencia solo mientras se mantiene presionado. */
export function TurboButton({ onPressIn, onPressOut, style }: Props) {
  return (
    <HoldZone onPressIn={onPressIn} onPressOut={onPressOut} style={style}>
      {(pressed) => (
        <View style={[styles.body, pressed && styles.bodyPressed]}>
          <Text style={[styles.label, pressed && styles.labelPressed]} numberOfLines={1}>
            TURBO
          </Text>
          <View style={[styles.badge, pressed && styles.badgePressed]}>
            <Text style={[styles.badgeText, pressed && styles.badgeTextPressed]}>
              {pressed ? '100 %' : 'MANTENER'}
            </Text>
          </View>
        </View>
      )}
    </HoldZone>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.amber,
    backgroundColor: colors.amberSoft,
  },
  bodyPressed: {
    backgroundColor: colors.amber,
    boxShadow: '0 0 30px rgba(255, 179, 26, 0.7)',
    transform: [{ scale: 0.98 }],
  },
  label: {
    color: colors.amber,
    fontFamily: fonts.blackItalic,
    fontSize: 40,
    letterSpacing: 3,
    includeFontPadding: false,
  },
  labelPressed: {
    color: colors.black,
  },
  badge: {
    borderWidth: 2,
    borderColor: colors.amber,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgePressed: {
    borderColor: colors.black,
    backgroundColor: colors.black,
  },
  badgeText: {
    color: colors.amber,
    fontFamily: fonts.heavy,
    fontSize: 15,
    letterSpacing: 2,
  },
  badgeTextPressed: {
    color: colors.amber,
  },
});
