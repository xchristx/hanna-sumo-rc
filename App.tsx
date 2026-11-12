import { useKeepAwake } from 'expo-keep-awake';
import { NavigationBar } from 'expo-navigation-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, StyleSheet, ToastAndroid, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { bluetooth } from './src/bluetooth/BluetoothService';
import { loadLastDevice } from './src/bluetooth/lastDevice';
import { useBluetooth } from './src/hooks/useBluetooth';
import { DriveInputProvider } from './src/hooks/useDriveInput';
import { useDriveLoop } from './src/hooks/useDriveLoop';
import { useLinkLossAlert } from './src/hooks/useLinkLossAlert';
import { SettingsProvider, useSettings } from './src/hooks/useSettings';
import { ConnectScreen } from './src/screens/ConnectScreen';
import { ControlScreen } from './src/screens/ControlScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { colors } from './src/theme';

type Screen = 'connect' | 'control' | 'settings';

// Las fuentes (Barlow Condensed) se embeben en el build con el plugin de expo-font
// (ver app.json), así que están disponibles desde el primer frame.
export default function App() {
  useKeepAwake();

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar hidden style="light" />
        <NavigationBar hidden style="light" />
        <SettingsProvider>
          <DriveInputProvider>
            <Main />
          </DriveInputProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Main() {
  const { settings, loaded } = useSettings();
  const { phase } = useBluetooth();
  const [screen, setScreen] = useState<Screen>('connect');

  useEffect(() => {
    bluetooth.start();
    return () => bluetooth.stop();
  }, []);

  useEffect(() => {
    bluetooth.setAutoReconnect(settings.autoReconnect);
  }, [settings.autoReconnect]);

  // Siempre montados: el heartbeat a 20 Hz y la vibración por pérdida de enlace.
  useDriveLoop(settings);
  useLinkLossAlert();

  // Al abrir la app, reconectar solo con el último robot.
  const startupDone = useRef(false);
  useEffect(() => {
    if (!loaded || startupDone.current) return;
    startupDone.current = true;
    if (!settings.autoReconnect) return;
    void loadLastDevice().then((device) => {
      if (device && bluetooth.getState().phase === 'idle') void bluetooth.connect(device);
    });
  }, [loaded, settings.autoReconnect]);

  // Si se conecta estando en la pantalla de conexión, pasar directo al control.
  const previousPhase = useRef(phase);
  useEffect(() => {
    if (phase === 'connected' && previousPhase.current !== 'connected' && screen === 'connect') {
      setScreen('control');
    }
    previousPhase.current = phase;
  }, [phase, screen]);

  // Botón "atrás" de Android: nunca saca del control por accidente.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'settings') {
        setScreen('control');
        return true;
      }
      if (screen === 'control') {
        ToastAndroid.show('Mantén AJUSTES o CONEXIÓN para salir del control', ToastAndroid.SHORT);
        return true;
      }
      if (phase === 'connected') {
        setScreen('control');
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [screen, phase]);

  if (!loaded) return <View style={styles.root} />;

  switch (screen) {
    case 'control':
      return <ControlScreen onOpenSettings={() => setScreen('settings')} onOpenConnection={() => setScreen('connect')} />;
    case 'settings':
      return <SettingsScreen onBack={() => setScreen('control')} />;
    default:
      return <ConnectScreen onGoToControl={() => setScreen('control')} />;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
