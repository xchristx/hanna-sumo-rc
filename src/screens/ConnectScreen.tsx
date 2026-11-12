import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { bluetooth } from '../bluetooth/BluetoothService';
import type { PairedDevice } from '../bluetooth/lastDevice';
import { ArenaRing } from '../components/ArenaRing';
import { BigButton, Card, SectionLabel, Toggle } from '../components/ui';
import { useBluetooth } from '../hooks/useBluetooth';
import { useSettings } from '../hooks/useSettings';
import { colors, fonts, radius } from '../theme';

interface Props {
  onGoToControl: () => void;
}

/** Nombres típicos del módulo del robot: se muestran primero en la lista. */
const ROBOT_NAME = /HANNA|SUMO|HC-0[56]/i;

export function ConnectScreen({ onGoToControl }: Props) {
  const bt = useBluetooth();
  const { settings, update } = useSettings();
  const insets = useSafeAreaInsets();
  const lastDevice = bt.lastDevice;

  // La lista se vuelve a leer al tocar ACTUALIZAR y cuando cambian el Bluetooth o
  // los permisos. "Cargando" = la última lectura no corresponde a la clave actual.
  const [refreshCount, setRefreshCount] = useState(0);
  const listKey = `${refreshCount}|${bt.bluetoothEnabled}|${bt.permission}`;
  const [listing, setListing] = useState<{ key: string; devices: PairedDevice[] } | null>(null);
  const loading = listing?.key !== listKey;

  useEffect(() => {
    let cancelled = false;
    bluetooth
      .getPairedDevices()
      .catch((): PairedDevice[] => [])
      .then((found) => {
        if (!cancelled) setListing({ key: listKey, devices: found });
      });
    return () => {
      cancelled = true;
    };
  }, [listKey]);

  const refresh = useCallback(() => setRefreshCount((n) => n + 1), []);

  const sorted = useMemo(() => {
    const score = (d: PairedDevice) =>
      (d.address === lastDevice?.address ? 0 : 2) + (ROBOT_NAME.test(d.name) ? 0 : 1);
    return [...(listing?.devices ?? [])].sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name));
  }, [listing, lastDevice]);

  const busy = bt.phase === 'connecting' || bt.phase === 'reconnecting';

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + 14,
          paddingBottom: insets.bottom + 14,
          paddingLeft: insets.left + 18,
          paddingRight: insets.right + 18,
        },
      ]}
    >
      <ArenaRing size={520} style={styles.ring} />

      <ScrollView style={styles.left} contentContainerStyle={styles.leftContent} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={styles.brand}>
            HANNA<Text style={styles.brandAccent}>·RC</Text>
          </Text>
          <Text style={styles.subtitle}>MINISUMO · FROBOT 2026 · AMATEUR</Text>
        </View>

        <StatusCard
          phase={bt.phase}
          deviceName={bt.device?.name ?? null}
          error={bt.error}
          attempt={bt.attempt}
          linkAlive={bt.linkAlive}
        />

        {bt.phase === 'connected' ? (
          <View style={styles.row}>
            <BigButton label="IR AL CONTROL ▶" onPress={onGoToControl} style={styles.flex} />
            <BigButton label="DESCONECTAR" variant="ghost" onPress={() => void bluetooth.disconnect()} />
          </View>
        ) : busy ? (
          <BigButton label="CANCELAR" variant="danger" onPress={() => void bluetooth.disconnect()} />
        ) : lastDevice ? (
          <BigButton
            label={`RECONECTAR A ${lastDevice.name.toUpperCase()}`}
            caption={lastDevice.address}
            onPress={() => void bluetooth.connect(lastDevice)}
          />
        ) : null}

        <Toggle
          label="Reconexión automática"
          value={settings.autoReconnect}
          onChange={(autoReconnect) => update({ autoReconnect })}
        />

        {bt.phase !== 'connected' && (
          <BigButton label="PRACTICAR SIN ROBOT" variant="ghost" caption="Abre el control sin conexión" onPress={onGoToControl} />
        )}
      </ScrollView>

      <View style={styles.right}>
        <DevicePanel
          permission={bt.permission}
          bluetoothEnabled={bt.bluetoothEnabled}
          devices={sorted}
          loading={loading}
          connectedAddress={bt.phase === 'connected' ? bt.device?.address ?? null : null}
          busyAddress={busy ? bt.device?.address ?? null : null}
          lastAddress={lastDevice?.address ?? null}
          onRefresh={refresh}
        />
      </View>
    </View>
  );
}

function StatusCard({
  phase,
  deviceName,
  error,
  attempt,
  linkAlive,
}: {
  phase: string;
  deviceName: string | null;
  error: string | null;
  attempt: number;
  linkAlive: boolean;
}) {
  let title = 'SIN CONEXIÓN';
  let tint: string = colors.textDim;
  if (phase === 'connected') {
    title = linkAlive ? 'CONECTADO' : 'CONECTADO · ESPERANDO OK';
    tint = linkAlive ? colors.green : colors.amber;
  } else if (phase === 'connecting') {
    title = 'CONECTANDO…';
    tint = colors.amber;
  } else if (phase === 'reconnecting') {
    title = `RECONECTANDO… (${attempt})`;
    tint = colors.amber;
  }

  return (
    <View style={[styles.status, { borderColor: tint }]}>
      <View style={styles.statusRow}>
        {(phase === 'connecting' || phase === 'reconnecting') && <ActivityIndicator color={tint} />}
        <Text style={[styles.statusTitle, { color: tint }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {deviceName ? <Text style={styles.statusDevice}>{deviceName}</Text> : null}
      {error && phase !== 'connected' ? <Text style={styles.statusError}>{error}</Text> : null}
    </View>
  );
}

function DevicePanel({
  permission,
  bluetoothEnabled,
  devices,
  loading,
  connectedAddress,
  busyAddress,
  lastAddress,
  onRefresh,
}: {
  permission: string | null;
  bluetoothEnabled: boolean | null;
  devices: PairedDevice[];
  loading: boolean;
  connectedAddress: string | null;
  busyAddress: string | null;
  lastAddress: string | null;
  onRefresh: () => void;
}) {
  if (permission === 'denied' || permission === 'blocked') {
    return (
      <Card title="PERMISOS">
        <Text style={styles.help}>
          La app necesita permiso de “Dispositivos cercanos” para hablar con el robot por Bluetooth.
        </Text>
        {permission === 'blocked' ? (
          <BigButton label="ABRIR AJUSTES DE LA APP" onPress={() => void Linking.openSettings()} />
        ) : (
          <BigButton label="DAR PERMISOS" onPress={onRefresh} />
        )}
      </Card>
    );
  }

  if (bluetoothEnabled === false) {
    return (
      <Card title="BLUETOOTH APAGADO">
        <Text style={styles.help}>Enciende el Bluetooth del teléfono para ver el robot.</Text>
        <BigButton label="ACTIVAR BLUETOOTH" onPress={() => void bluetooth.requestEnable()} />
      </Card>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.listHeader}>
        <SectionLabel>DISPOSITIVOS EMPAREJADOS</SectionLabel>
        <Pressable onPress={onRefresh} hitSlop={12} style={({ pressed }) => [styles.refresh, pressed && { opacity: 0.6 }]}>
          {loading ? <ActivityIndicator color={colors.textDim} size="small" /> : <Text style={styles.refreshText}>ACTUALIZAR</Text>}
        </Pressable>
      </View>
      <FlatList
        data={devices}
        keyExtractor={(d) => d.address}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <DeviceRow
            device={item}
            connected={item.address === connectedAddress}
            busy={item.address === busyAddress}
            last={item.address === lastAddress}
          />
        )}
        ListEmptyComponent={
          loading ? undefined : (
            <Card>
              <Text style={styles.help}>
                No hay dispositivos emparejados. Empareja el HC-05 desde los ajustes de Bluetooth de Android (PIN
                1234) y vuelve aquí.
              </Text>
              <BigButton label="ABRIR AJUSTES BLUETOOTH" variant="ghost" onPress={() => bluetooth.openSystemSettings()} />
            </Card>
          )
        }
        ListFooterComponent={
          devices.length > 0 ? (
            <Pressable onPress={() => bluetooth.openSystemSettings()} style={styles.footerLink}>
              <Text style={styles.footerText}>¿No aparece? Emparejar en Ajustes de Android →</Text>
            </Pressable>
          ) : undefined
        }
      />
    </View>
  );
}

function DeviceRow({
  device,
  connected,
  busy,
  last,
}: {
  device: PairedDevice;
  connected: boolean;
  busy: boolean;
  last: boolean;
}) {
  const likelyRobot = ROBOT_NAME.test(device.name);
  return (
    <Pressable
      onPress={() => {
        if (!connected) void bluetooth.connect(device);
      }}
      style={({ pressed }) => [
        styles.device,
        likelyRobot && styles.deviceRobot,
        connected && styles.deviceConnected,
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.flex}>
        <Text style={styles.deviceName} numberOfLines={1}>
          {device.name}
        </Text>
        <Text style={styles.deviceAddress}>{device.address}</Text>
      </View>
      {busy ? (
        <ActivityIndicator color={colors.amber} />
      ) : (
        <Text style={[styles.deviceTag, connected && { color: colors.green }]}>
          {connected ? 'CONECTADO' : last ? 'ÚLTIMO ▶' : 'CONECTAR ▶'}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    gap: 18,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  ring: {
    left: -200,
    bottom: -260,
    opacity: 0.18,
  },
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  left: {
    flex: 1,
  },
  leftContent: {
    gap: 12,
    paddingBottom: 8,
  },
  right: {
    flex: 1.05,
  },
  brand: {
    color: colors.text,
    fontFamily: fonts.blackItalic,
    fontSize: 58,
    lineHeight: 60,
    letterSpacing: 2,
  },
  brandAccent: {
    color: colors.red,
  },
  subtitle: {
    color: colors.textDim,
    fontFamily: fonts.heavy,
    fontSize: 15,
    letterSpacing: 3,
  },
  status: {
    borderLeftWidth: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.panel,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusTitle: {
    fontFamily: fonts.black,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: 2,
  },
  statusDevice: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 18,
    letterSpacing: 1,
  },
  statusError: {
    color: colors.textDim,
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refresh: {
    minWidth: 96,
    height: 32,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  refreshText: {
    color: colors.text,
    fontFamily: fonts.heavy,
    fontSize: 15,
    letterSpacing: 2,
  },
  list: {
    gap: 8,
    paddingBottom: 8,
  },
  device: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.panel,
  },
  deviceRobot: {
    borderColor: colors.lineHi,
  },
  deviceConnected: {
    borderColor: colors.green,
    backgroundColor: colors.greenSoft,
  },
  deviceName: {
    color: colors.text,
    fontFamily: fonts.heavy,
    fontSize: 24,
    letterSpacing: 1,
  },
  deviceAddress: {
    color: colors.textFaint,
    fontFamily: fonts.semibold,
    fontSize: 13,
    letterSpacing: 1,
  },
  deviceTag: {
    color: colors.red,
    fontFamily: fonts.heavy,
    fontSize: 16,
    letterSpacing: 2,
  },
  help: {
    color: colors.textDim,
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 22,
    marginBottom: 12,
  },
  footerLink: {
    paddingVertical: 10,
  },
  footerText: {
    color: colors.textDim,
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
});
