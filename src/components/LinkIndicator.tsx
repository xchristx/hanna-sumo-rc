import { StyleSheet, Text, View } from 'react-native';

import { useBluetooth } from '../hooks/useBluetooth';
import { colors, fonts, radius } from '../theme';

/** Verde solo si el robot contestó "OK" hace menos de 1 s. Cualquier otra cosa es rojo. */
export function LinkIndicator() {
  const { linkAlive, phase, device, attempt } = useBluetooth();

  let title: string;
  if (linkAlive) title = 'ENLACE OK';
  else if (phase === 'connected') title = 'SIN RESPUESTA';
  else if (phase === 'connecting') title = 'CONECTANDO…';
  else if (phase === 'reconnecting') title = `RECONECTANDO ${attempt > 1 ? `· ${attempt}` : '…'}`;
  else title = 'SIN ENLACE';

  const tint = linkAlive ? colors.green : colors.red;

  return (
    <View style={[styles.pill, { borderColor: tint, backgroundColor: linkAlive ? colors.greenSoft : colors.redSoft }]}>
      <View style={[styles.led, { backgroundColor: tint, boxShadow: `0 0 12px ${tint}` }]} />
      <View style={styles.texts}>
        <Text style={[styles.title, { color: tint }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.device} numberOfLines={1}>
          {device?.name ?? 'Ningún robot'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 2,
    minWidth: 170,
  },
  led: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  texts: {
    flexShrink: 1,
  },
  title: {
    fontFamily: fonts.heavy,
    fontSize: 20,
    lineHeight: 22,
    letterSpacing: 2,
  },
  device: {
    color: colors.textDim,
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 15,
    letterSpacing: 1,
  },
});
