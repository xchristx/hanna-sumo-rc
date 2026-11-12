import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { bluetooth, type MotorCommand } from '../bluetooth/BluetoothService';
import { colors, fonts } from '../theme';

function format(v: number): string {
  if (v === 0) return '0';
  return v > 0 ? `+${v}` : `−${-v}`;
}

/**
 * Muestra el último "L,R" enviado. Se refresca solo él, 10 veces por segundo,
 * para no hacer re-render de toda la pantalla de control.
 */
export function OutputMeter() {
  const [cmd, setCmd] = useState<MotorCommand>(bluetooth.getLastSent());

  useEffect(() => {
    const id = setInterval(() => {
      const next = bluetooth.getLastSent();
      setCmd((prev) => (prev.left === next.left && prev.right === next.right ? prev : next));
    }, 100);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.row}>
      <Value label="L" value={cmd.left} />
      <Value label="R" value={cmd.right} />
    </View>
  );
}

function Value({ label, value }: { label: string; value: number }) {
  const color = value > 0 ? colors.red : value < 0 ? colors.steel : colors.textFaint;
  return (
    <View style={styles.cell}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]}>{format(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  cell: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    minWidth: 64,
  },
  label: {
    color: colors.textFaint,
    fontFamily: fonts.heavy,
    fontSize: 14,
  },
  value: {
    fontFamily: fonts.heavy,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
  },
});
