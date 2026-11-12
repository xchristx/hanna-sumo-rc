import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { POWER_LEVELS, type PowerMode } from '../logic/drive';
import { colors, fonts, radius } from '../theme';
import { HoldZone } from './HoldZone';

interface Props {
  value: PowerMode;
  onChange: (mode: PowerMode) => void;
  style?: StyleProp<ViewStyle>;
}

const OPTIONS: { mode: PowerMode; label: string }[] = [
  { mode: 'precise', label: 'PRECISO' },
  { mode: 'normal', label: 'NORMAL' },
];

/** Se selecciona al tocar (no al soltar): responde al instante, incluso con nervios. */
export function PowerSelector({ value, onChange, style }: Props) {
  return (
    <View style={[styles.row, style]}>
      {OPTIONS.map(({ mode, label }) => {
        const active = value === mode;
        return (
          <HoldZone
            key={mode}
            style={styles.cell}
            onPressIn={() => {
              if (mode !== value) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                onChange(mode);
              }
            }}
          >
            {(pressed) => (
              <View style={[styles.option, active && styles.optionActive, pressed && styles.optionPressed]}>
                <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
                  {label}
                </Text>
                <Text style={[styles.percent, active && styles.labelActive]}>
                  {Math.round(POWER_LEVELS[mode] * 100)}%
                </Text>
              </View>
            )}
          </HoldZone>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  cell: {
    flex: 1,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.lineHi,
    backgroundColor: colors.panel,
  },
  optionActive: {
    borderColor: colors.text,
    backgroundColor: colors.text,
  },
  optionPressed: {
    transform: [{ scale: 0.97 }],
  },
  label: {
    color: colors.textDim,
    fontFamily: fonts.heavy,
    fontSize: 22,
    letterSpacing: 2,
  },
  percent: {
    color: colors.textFaint,
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  labelActive: {
    color: colors.black,
  },
});
