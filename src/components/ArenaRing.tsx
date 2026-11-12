import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '../theme';

interface Props {
  size: number;
  style?: StyleProp<ViewStyle>;
}

/** Dohyo de minisumo: disco negro, borde blanco y las dos líneas de salida. Decorativo. */
export function ArenaRing({ size, style }: Props) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.disc,
        { width: size, height: size, borderRadius: size / 2, borderWidth: Math.max(6, size * 0.035) },
        style,
      ]}
    >
      <View style={[styles.line, { width: size * 0.2, height: Math.max(4, size * 0.02), top: size * 0.4 }]} />
      <View style={[styles.line, { width: size * 0.2, height: Math.max(4, size * 0.02), bottom: size * 0.4 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    position: 'absolute',
    backgroundColor: '#050506',
    borderColor: colors.ring,
    alignItems: 'center',
  },
  line: {
    position: 'absolute',
    backgroundColor: '#6B4A2E',
  },
});
