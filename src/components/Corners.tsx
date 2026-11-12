import { StyleSheet, View } from 'react-native';

import { colors } from '../theme';

interface Props {
  color?: string;
  size?: number;
  thickness?: number;
  inset?: number;
}

/** Esquinas tipo "mira" que enmarcan una zona de control. Solo decorativo. */
export function Corners({ color = colors.lineHi, size = 14, thickness = 2, inset = 0 }: Props) {
  const base = { position: 'absolute' as const, width: size, height: size, borderColor: color };
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[base, { top: inset, left: inset, borderTopWidth: thickness, borderLeftWidth: thickness }]} />
      <View style={[base, { top: inset, right: inset, borderTopWidth: thickness, borderRightWidth: thickness }]} />
      <View style={[base, { bottom: inset, left: inset, borderBottomWidth: thickness, borderLeftWidth: thickness }]} />
      <View style={[base, { bottom: inset, right: inset, borderBottomWidth: thickness, borderRightWidth: thickness }]} />
    </View>
  );
}
