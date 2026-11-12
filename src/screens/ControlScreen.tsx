import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { bluetooth } from '../bluetooth/BluetoothService';
import { ArrowButton } from '../components/ArrowButton';
import { Joystick } from '../components/Joystick';
import { LinkFrame } from '../components/LinkFrame';
import { LinkIndicator } from '../components/LinkIndicator';
import { NavHoldButton } from '../components/NavHoldButton';
import { OutputMeter } from '../components/OutputMeter';
import { PowerSelector } from '../components/PowerSelector';
import { StopButton } from '../components/StopButton';
import { TankSlider } from '../components/TankSlider';
import { TurboButton } from '../components/TurboButton';
import { useDriveInput } from '../hooks/useDriveInput';
import { useSettings } from '../hooks/useSettings';
import { releaseControls, type PowerMode } from '../logic/drive';
import { colors, fonts } from '../theme';

interface Props {
  onOpenSettings: () => void;
  onOpenConnection: () => void;
}

export function ControlScreen({ onOpenSettings, onOpenConnection }: Props) {
  const { settings, update } = useSettings();
  const inputRef = useDriveInput();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [stopLatched, setStopLatched] = useState(false);

  // Mientras esta pantalla está visible los controles mandan; al salir o al pasar
  // la app a segundo plano se suelta todo y el lazo envía 0,0.
  useEffect(() => {
    const drive = inputRef.current;
    drive.armed = true;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') releaseControls(drive);
    });
    return () => {
      subscription.remove();
      releaseControls(drive);
      drive.armed = false;
      drive.stopLatched = false;
    };
  }, [inputRef]);

  useEffect(() => {
    inputRef.current.powerMode = settings.powerMode;
  }, [inputRef, settings.powerMode]);

  /** Tocar un slider o el joystick libera el STOP enganchado. */
  const onGrab = useCallback(() => {
    const drive = inputRef.current;
    if (drive.stopHeld || !drive.stopLatched) return;
    drive.stopLatched = false;
    setStopLatched(false);
  }, [inputRef]);

  const onStopIn = useCallback(() => {
    const drive = inputRef.current;
    drive.stopHeld = true;
    drive.stopLatched = true;
    bluetooth.sendCommand(0, 0); // inmediato, sin esperar al próximo ciclo de 50 ms
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setStopLatched(true);
  }, [inputRef]);

  const onStopOut = useCallback(() => {
    inputRef.current.stopHeld = false;
  }, [inputRef]);

  const onTurboIn = useCallback(() => {
    inputRef.current.turbo = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(() => {});
  }, [inputRef]);

  const onTurboOut = useCallback(() => {
    inputRef.current.turbo = false;
  }, [inputRef]);

  const onPowerChange = useCallback((powerMode: PowerMode) => update({ powerMode }), [update]);

  const setLeft = useCallback((v: number) => {
    inputRef.current.left = v;
  }, [inputRef]);
  const setRight = useCallback((v: number) => {
    inputRef.current.right = v;
  }, [inputRef]);
  const setStick = useCallback((x: number, y: number) => {
    inputRef.current.stickX = x;
    inputRef.current.stickY = y;
  }, [inputRef]);

  /** Handlers de una flecha: apretar la marca en el ref (y libera el STOP), soltar la borra. */
  const arrow = useCallback(
    (key: 'dpadUp' | 'dpadDown' | 'dpadLeft' | 'dpadRight') => ({
      onPressIn: () => {
        inputRef.current[key] = true;
        onGrab();
        Haptics.selectionAsync().catch(() => {});
      },
      onPressOut: () => {
        inputRef.current[key] = false;
      },
    }),
    [inputRef, onGrab],
  );

  const panel = (
    <View style={styles.panel}>
      <PowerSelector value={settings.powerMode} onChange={onPowerChange} style={styles.power} />
      <TurboButton onPressIn={onTurboIn} onPressOut={onTurboOut} style={styles.turbo} />
      <StopButton onPressIn={onStopIn} onPressOut={onStopOut} latched={stopLatched} style={styles.stop} />
    </View>
  );

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 10,
          paddingLeft: insets.left + 12,
          paddingRight: insets.right + 12,
        },
      ]}
    >
      <View style={styles.hud}>
        <NavHoldButton label="AJUSTES" onTrigger={onOpenSettings} />
        <View style={styles.hudCenter}>
          {width > 780 && (
            <Text style={styles.brand}>
              HANNA<Text style={styles.brandAccent}>·RC</Text>
            </Text>
          )}
          <LinkIndicator />
          <OutputMeter />
        </View>
        <NavHoldButton label="CONEXIÓN" onTrigger={onOpenConnection} />
      </View>

      {settings.controlMode === 'tank' ? (
        <View style={styles.main}>
          <TankSlider label="IZQ" onValue={setLeft} onGrab={onGrab} style={styles.slider} />
          {panel}
          <TankSlider label="DER" onValue={setRight} onGrab={onGrab} style={styles.slider} />
        </View>
      ) : settings.controlMode === 'dpad' ? (
        <View style={styles.main}>
          <View style={styles.dpadColumn}>
            <ArrowButton direction="up" {...arrow('dpadUp')} style={styles.arrow} />
            <ArrowButton direction="down" {...arrow('dpadDown')} style={styles.arrow} />
            <Text style={styles.dpadLabel}>AVANCE</Text>
          </View>
          {panel}
          <View style={styles.dpadColumn}>
            <View style={styles.dpadRow}>
              <ArrowButton direction="left" {...arrow('dpadLeft')} style={styles.arrow} />
              <ArrowButton direction="right" {...arrow('dpadRight')} style={styles.arrow} />
            </View>
            <Text style={styles.dpadLabel}>GIRO</Text>
          </View>
        </View>
      ) : (
        <View style={styles.main}>
          <Joystick onValue={setStick} onGrab={onGrab} style={styles.joystick} />
          {panel}
        </View>
      )}

      <LinkFrame />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  hud: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  hudCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  brand: {
    color: colors.text,
    fontFamily: fonts.blackItalic,
    fontSize: 26,
    letterSpacing: 2,
  },
  brandAccent: {
    color: colors.red,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  slider: {
    flex: 27,
  },
  joystick: {
    flex: 54,
  },
  dpadColumn: {
    flex: 27,
    gap: 10,
  },
  dpadRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  arrow: {
    flex: 1,
  },
  dpadLabel: {
    textAlign: 'center',
    color: colors.textDim,
    fontFamily: fonts.heavy,
    fontSize: 18,
    letterSpacing: 3,
  },
  panel: {
    flex: 46,
    gap: 10,
  },
  power: {
    flex: 0.8,
  },
  turbo: {
    flex: 0.95,
  },
  stop: {
    flex: 1.45,
  },
});
