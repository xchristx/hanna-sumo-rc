import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, radius } from '../theme';
import { HazardStripes } from './HazardStripes';
import { HoldZone } from './HoldZone';

interface Props {
  onPressIn: () => void;
  onPressOut: () => void;
  /** STOP quedó enganchado: el robot sigue quieto hasta tocar otro control. */
  latched: boolean;
  style?: StyleProp<ViewStyle>;
}

export function StopButton({ onPressIn, onPressOut, latched, style }: Props) {
  return (
    <HoldZone onPressIn={onPressIn} onPressOut={onPressOut} style={style}>
      {(pressed) => (
        <View style={[styles.body, pressed && styles.bodyPressed]}>
          <HazardStripes
            color={pressed ? colors.red : colors.black}
            background={pressed ? colors.text : colors.red}
            height={9}
          />
          <View style={styles.center}>
            <Text style={[styles.label, pressed && styles.labelPressed]}>STOP</Text>
            <Text style={[styles.caption, pressed && styles.captionPressed]} numberOfLines={1}>
              {latched ? 'DETENIDO · TOCA UN CONTROL PARA SEGUIR' : 'MOTORES A CERO'}
            </Text>
          </View>
          <HazardStripes
            color={pressed ? colors.red : colors.black}
            background={pressed ? colors.text : colors.red}
            height={9}
          />
        </View>
      )}
    </HoldZone>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.red,
    borderWidth: 3,
    borderColor: colors.red,
    boxShadow: '0 0 22px rgba(255, 43, 43, 0.35)',
  },
  bodyPressed: {
    backgroundColor: colors.text,
    borderColor: colors.text,
    transform: [{ scale: 0.97 }],
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  label: {
    color: colors.black,
    fontFamily: fonts.blackItalic,
    fontSize: 64,
    lineHeight: 66,
    letterSpacing: 4,
    includeFontPadding: false,
    // Ocupa todo el ancho: si Android mide el texto justo, la itálica con letterSpacing
    // no entra y la última letra salta a una segunda línea invisible ("STO").
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  labelPressed: {
    color: colors.red,
  },
  caption: {
    color: 'rgba(0, 0, 0, 0.7)',
    fontFamily: fonts.heavy,
    fontSize: 13,
    letterSpacing: 2,
  },
  captionPressed: {
    color: colors.redDeep,
  },
});
