import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, radius } from '../theme';

// Piezas para las pantallas de Conexión y Ajustes (no se usan con los pulgares
// en los sliders, así que alcanza con Pressable).

type ButtonVariant = 'primary' | 'ghost' | 'danger';

interface BigButtonProps {
  label: string;
  caption?: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function BigButton({ label, caption, onPress, variant = 'primary', disabled, style }: BigButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
      {/* Sin adjustsFontSizeToFit: en Android ignora el letterSpacing y corta la última letra. */}
      <Text style={[styles.buttonLabel, variant === 'primary' && styles.buttonLabelPrimary]} numberOfLines={2}>
        {label}
      </Text>
      {caption ? (
        <Text style={[styles.buttonCaption, variant === 'primary' && styles.buttonCaptionPrimary]} numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

export function Card({ title, children, style }: { title?: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.card, style]}>
      {title ? <SectionLabel>{title}</SectionLabel> : null}
      {children}
    </View>
  );
}

interface ToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function Toggle({ label, value, onChange }: ToggleProps) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={({ pressed }) => [styles.toggle, pressed && styles.buttonPressed]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <Text style={styles.toggleLabel} numberOfLines={2}>
        {label}
      </Text>
      <View style={[styles.switchTrack, value && styles.switchTrackOn]}>
        <View style={[styles.switchKnob, value && styles.switchKnobOn]} />
        <Text style={[styles.switchText, value ? styles.switchTextOn : styles.switchTextOff]}>
          {value ? 'SÍ' : 'NO'}
        </Text>
      </View>
    </Pressable>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string; caption?: string }[];
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({ value, options, onChange }: SegmentedProps<T>) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={({ pressed }) => [styles.segment, active && styles.segmentActive, pressed && styles.buttonPressed]}
          >
            <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{o.label}</Text>
            {o.caption ? (
              <Text style={[styles.segmentCaption, active && styles.segmentLabelActive]}>{o.caption}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

interface StepperProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
  /** Dibujo opcional debajo del número (por ejemplo, la barra del trim). */
  children?: ReactNode;
}

export function Stepper({ value, min, max, step = 1, format, onChange, children }: StepperProps) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => set(value - step)}
        disabled={value <= min}
        style={({ pressed }) => [styles.stepButton, pressed && styles.buttonPressed, value <= min && styles.buttonDisabled]}
      >
        <Text style={styles.stepButtonText}>−</Text>
      </Pressable>
      <View style={styles.stepValue}>
        <Text style={styles.stepValueText}>{format(value)}</Text>
        {children}
      </View>
      <Pressable
        onPress={() => set(value + step)}
        disabled={value >= max}
        style={({ pressed }) => [styles.stepButton, pressed && styles.buttonPressed, value >= max && styles.buttonDisabled]}
      >
        <Text style={styles.stepButtonText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  buttonGhost: {
    backgroundColor: colors.panel,
    borderColor: colors.lineHi,
  },
  buttonDanger: {
    backgroundColor: 'transparent',
    borderColor: colors.red,
  },
  buttonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  buttonLabel: {
    color: colors.text,
    fontFamily: fonts.heavy,
    fontSize: 22,
    letterSpacing: 2,
    textAlign: 'center',
  },
  buttonLabelPrimary: {
    color: colors.black,
  },
  buttonCaption: {
    color: colors.textDim,
    fontFamily: fonts.semibold,
    fontSize: 13,
    letterSpacing: 1,
  },
  buttonCaptionPrimary: {
    color: 'rgba(0, 0, 0, 0.65)',
  },
  section: {
    color: colors.textDim,
    fontFamily: fonts.heavy,
    fontSize: 14,
    letterSpacing: 3,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
  },
  toggle: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleLabel: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 20,
    letterSpacing: 1,
  },
  switchTrack: {
    width: 92,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.lineHi,
    backgroundColor: colors.bg,
    justifyContent: 'center',
  },
  switchTrackOn: {
    borderColor: colors.red,
    backgroundColor: colors.redSoft,
  },
  switchKnob: {
    position: 'absolute',
    left: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.lineHi,
  },
  switchKnobOn: {
    left: 52,
    backgroundColor: colors.red,
  },
  switchText: {
    position: 'absolute',
    fontFamily: fonts.heavy,
    fontSize: 16,
    letterSpacing: 1,
  },
  switchTextOn: {
    left: 16,
    color: colors.red,
  },
  switchTextOff: {
    right: 16,
    color: colors.textFaint,
  },
  segmented: {
    flexDirection: 'row',
    gap: 10,
  },
  segment: {
    flex: 1,
    minHeight: 64,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.lineHi,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  segmentActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  segmentLabel: {
    color: colors.textDim,
    fontFamily: fonts.heavy,
    fontSize: 24,
    letterSpacing: 2,
  },
  segmentCaption: {
    color: colors.textFaint,
    fontFamily: fonts.semibold,
    fontSize: 13,
    letterSpacing: 1,
  },
  segmentLabelActive: {
    color: colors.black,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepButton: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.lineHi,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonText: {
    color: colors.text,
    fontFamily: fonts.heavy,
    fontSize: 36,
    lineHeight: 40,
  },
  stepValue: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  stepValueText: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: 34,
    lineHeight: 38,
    fontVariant: ['tabular-nums'],
  },
});
