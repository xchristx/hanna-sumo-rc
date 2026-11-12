import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BigButton, Card, Segmented, Stepper, Toggle } from '../components/ui';
import { DEADZONE_MAX, TRIM_LIMIT, TURN_MIN, useSettings } from '../hooks/useSettings';
import type { ControlMode } from '../logic/drive';
import { colors, fonts, radius } from '../theme';

interface Props {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: Props) {
  const { settings, update, reset } = useSettings();
  const insets = useSafeAreaInsets();

  const leftPct = settings.trimPct < 0 ? 100 + settings.trimPct : 100;
  const rightPct = settings.trimPct > 0 ? 100 - settings.trimPct : 100;

  const confirmReset = () =>
    Alert.alert('¿Volver a los valores de fábrica?', 'Se restablecen todos los ajustes (modo, trim, giro, suavidad, zona muerta e inversión).', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Restablecer', style: 'destructive', onPress: reset },
    ]);

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + 12,
          paddingLeft: insets.left + 18,
          paddingRight: insets.right + 18,
        },
      ]}
    >
      <View style={styles.header}>
        <BigButton label="◀ VOLVER AL CONTROL" onPress={onBack} style={styles.back} />
        <Text style={styles.title}>AJUSTES</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 18 }]}>
        <Card title="MODO DE CONTROL" style={styles.cell}>
          <Segmented<ControlMode>
            value={settings.controlMode}
            onChange={(controlMode) => update({ controlMode })}
            options={[
              { value: 'tank', label: 'TANQUE', caption: 'Slider por rueda' },
              { value: 'joystick', label: 'JOYSTICK', caption: 'Avance + giro' },
              { value: 'dpad', label: 'FLECHAS', caption: '▲▼ avance · ◀▶ giro' },
            ]}
          />
        </Card>

        <Card title="TRIM · COMPENSAR MOTORES" style={styles.cell}>
          <Stepper
            value={settings.trimPct}
            min={-TRIM_LIMIT}
            max={TRIM_LIMIT}
            format={(v) => (v === 0 ? '0 %' : v > 0 ? `DER −${v} %` : `IZQ −${-v} %`)}
            onChange={(trimPct) => update({ trimPct })}
          >
            <TrimBar trim={settings.trimPct} />
          </Stepper>
          <Text style={styles.help}>
            IZQ {leftPct} % · DER {rightPct} %. Si el robot se desvía a la izquierda yendo recto, toca +; si se desvía
            a la derecha, toca −.
          </Text>
        </Card>

        <Card title="SENSIBILIDAD DE GIRO" style={styles.cell}>
          <Stepper
            value={settings.turnPct}
            min={TURN_MIN}
            max={100}
            step={10}
            format={(v) => `${v} %`}
            onChange={(turnPct) => update({ turnPct })}
          />
          <Text style={styles.help}>
            Bájala si gira demasiado rápido. Con menos de 100 %, la diagonal hace una curva en vez de pivotar sobre una
            rueda.
          </Text>
        </Card>

        <Card title="SUAVIDAD" style={styles.cell}>
          <Stepper
            value={settings.expoPct}
            min={0}
            max={100}
            step={10}
            format={(v) => `${v} %`}
            onChange={(expoPct) => update({ expoPct })}
          />
          <Text style={styles.help}>
            Más alto = el pulgar cerca del centro mueve el robot más despacio, para maniobras finas. A fondo sigue siendo
            100 %.
          </Text>
        </Card>

        <Card title="ZONA MUERTA" style={styles.cell}>
          <Stepper
            value={settings.deadzonePct}
            min={0}
            max={DEADZONE_MAX}
            format={(v) => `${v} %`}
            onChange={(deadzonePct) => update({ deadzonePct })}
          />
          <Text style={styles.help}>
            Recorrido del pulgar que se ignora cerca del centro. Súbela si el robot se mueve solo al apoyar el dedo.
          </Text>
        </Card>

        <Card title="INVERTIR MOTORES" style={styles.cell}>
          <Toggle label="Invertir motor izquierdo" value={settings.invertLeft} onChange={(invertLeft) => update({ invertLeft })} />
          <Toggle
            label="Invertir motor derecho"
            value={settings.invertRight}
            onChange={(invertRight) => update({ invertRight })}
          />
        </Card>

        <Card title="CONEXIÓN" style={styles.cell}>
          <Toggle
            label="Reconexión automática"
            value={settings.autoReconnect}
            onChange={(autoReconnect) => update({ autoReconnect })}
          />
          <Text style={styles.help}>Al abrir la app y si se corta el Bluetooth, vuelve a conectar sola al último robot.</Text>
        </Card>

        <Card title="RESTABLECER" style={styles.cell}>
          <BigButton label="VALORES DE FÁBRICA" variant="danger" onPress={confirmReset} />
        </Card>
      </ScrollView>
    </View>
  );
}

/** Barra horizontal: el bloque rojo se corre hacia el motor que se frena. */
function TrimBar({ trim }: { trim: number }) {
  const ratio = trim / TRIM_LIMIT; // -1 a 1
  return (
    <View style={styles.trimBar}>
      <View style={styles.trimCenter} />
      <View
        style={[
          styles.trimFill,
          ratio >= 0 ? { left: '50%', width: `${ratio * 50}%` } : { right: '50%', width: `${-ratio * 50}%` },
        ]}
      />
      <Text style={[styles.trimSide, { left: 6 }]}>IZQ</Text>
      <Text style={[styles.trimSide, { right: 6 }]}>DER</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 12,
  },
  back: {
    minWidth: 260,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.blackItalic,
    fontSize: 44,
    letterSpacing: 3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cell: {
    flexBasis: '48%',
    flexGrow: 1,
    gap: 6,
  },
  help: {
    color: colors.textDim,
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 19,
    marginTop: 6,
  },
  trimBar: {
    alignSelf: 'stretch',
    height: 18,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  trimCenter: {
    position: 'absolute',
    left: '50%',
    width: 2,
    marginLeft: -1,
    top: 0,
    bottom: 0,
    backgroundColor: colors.lineHi,
  },
  trimFill: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    backgroundColor: colors.red,
  },
  trimSide: {
    position: 'absolute',
    color: colors.textFaint,
    fontFamily: fonts.heavy,
    fontSize: 11,
    letterSpacing: 1,
  },
});
