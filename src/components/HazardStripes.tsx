import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

interface Props {
  color: string;
  background: string;
  height?: number;
  stripe?: number;
  count?: number;
  style?: StyleProp<ViewStyle>;
}

/** Franja de peligro con rayas diagonales (como la cinta del borde de la arena). */
export function HazardStripes({ color, background, height = 10, stripe = 10, count = 40, style }: Props) {
  return (
    <View pointerEvents="none" style={[styles.band, { height, backgroundColor: background }, style]}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            width: stripe,
            marginRight: stripe,
            height: height * 2,
            marginTop: -height / 2,
            backgroundColor: color,
            transform: [{ skewX: '-35deg' }],
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
});
