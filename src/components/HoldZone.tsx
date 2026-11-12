import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';

interface Props {
  onPressIn?: () => void;
  onPressOut?: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode | ((pressed: boolean) => ReactNode);
}

/**
 * Zona "de mantener" construida con Gesture Handler. A diferencia de Pressable
 * (que usa el responder de JS, uno solo a la vez), funciona en simultáneo con los
 * sliders y avisa en el instante en que el dedo toca y cuando se levanta.
 */
export function HoldZone({ onPressIn, onPressOut, style, children }: Props) {
  const [pressed, setPressed] = useState(false);
  const handlers = useRef({ onPressIn, onPressOut });
  useLayoutEffect(() => {
    handlers.current = { onPressIn, onPressOut };
  });

  // Config memoizada: los re-renders (por ejemplo, el resaltado) no tocan el gesto activo.
  const config = useMemo(
    () => ({
      minDistance: 0,
      disableReanimated: true,
      runOnJS: true,
      shouldCancelWhenOutside: false,
      onBegin: () => {
        setPressed(true);
        handlers.current.onPressIn?.();
      },
      onFinalize: () => {
        setPressed(false);
        handlers.current.onPressOut?.();
      },
    }),
    [],
  );
  const gesture = usePanGesture(config);

  return (
    <GestureDetector gesture={gesture}>
      <View style={style}>{typeof children === 'function' ? children(pressed) : children}</View>
    </GestureDetector>
  );
}
