import { PWM_MAX, clampPwm } from '../bluetooth/protocol';

export type ControlMode = 'tank' | 'joystick' | 'dpad';
export type PowerMode = 'precise' | 'normal';

export const POWER_LEVELS: Record<PowerMode | 'turbo', number> = {
  precise: 0.5,
  normal: 0.8,
  turbo: 1,
};

/** Lo que escriben los controles táctiles. Se lee desde un ref, nunca dispara renders. */
export interface DriveInput {
  /** true solo mientras la pantalla de control está visible y la app en primer plano. */
  armed: boolean;
  /** Sliders del modo tanque, -1 (atrás) a 1 (adelante). */
  left: number;
  right: number;
  /** Joystick: x positivo = derecha, y positivo = adelante. */
  stickX: number;
  stickY: number;
  /** Flechas: cada una es un botón digital (apretado o no). */
  dpadUp: boolean;
  dpadDown: boolean;
  dpadLeft: boolean;
  dpadRight: boolean;
  powerMode: PowerMode;
  turbo: boolean;
  /** STOP presionado ahora mismo. */
  stopHeld: boolean;
  /** STOP quedó "enganchado": se libera cuando el piloto vuelve a tocar un control. */
  stopLatched: boolean;
}

export interface DriveSettings {
  controlMode: ControlMode;
  /** -20 a 20. Positivo frena el motor derecho, negativo el izquierdo. */
  trimPct: number;
  /** 0 a 30. */
  deadzonePct: number;
  /** 20 a 100. Peso del giro: 100 = giro completo; menos = gira más lento y las diagonales hacen curvas. */
  turnPct: number;
  /** 0 a 100. Curva "expo": más alto = más precisión cerca del centro (a fondo sigue siendo 100 %). */
  expoPct: number;
  invertLeft: boolean;
  invertRight: boolean;
}

export function createDriveInput(): DriveInput {
  return {
    armed: false,
    left: 0,
    right: 0,
    stickX: 0,
    stickY: 0,
    dpadUp: false,
    dpadDown: false,
    dpadLeft: false,
    dpadRight: false,
    powerMode: 'normal',
    turbo: false,
    stopHeld: false,
    stopLatched: false,
  };
}

/** Suelta todos los controles (no toca powerMode). */
export function releaseControls(input: DriveInput): void {
  input.left = 0;
  input.right = 0;
  input.stickX = 0;
  input.stickY = 0;
  input.dpadUp = false;
  input.dpadDown = false;
  input.dpadLeft = false;
  input.dpadRight = false;
  input.turbo = false;
  input.stopHeld = false;
}

function clampUnit(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(-1, Math.min(1, v));
}

/** Zona muerta reescalada: fuera de la zona el valor vuelve a cubrir 0..1 sin saltos. */
export function applyDeadzone(value: number, deadzone: number): number {
  const v = clampUnit(value);
  const dz = Math.max(0, Math.min(0.9, deadzone));
  const magnitude = Math.abs(v);
  if (magnitude <= dz) return 0;
  return (Math.sign(v) * (magnitude - dz)) / (1 - dz);
}

/** Zona muerta circular para el joystick (no deforma las diagonales). */
export function applyRadialDeadzone(x: number, y: number, deadzone: number): { x: number; y: number } {
  let cx = clampUnit(x);
  let cy = clampUnit(y);
  let magnitude = Math.hypot(cx, cy);
  if (magnitude > 1) {
    cx /= magnitude;
    cy /= magnitude;
    magnitude = 1;
  }
  const scaled = applyDeadzone(magnitude, deadzone);
  if (scaled === 0) return { x: 0, y: 0 };
  return { x: (cx / magnitude) * scaled, y: (cy / magnitude) * scaled };
}

/** Curva "expo" de radiocontrol: suaviza los valores chicos sin cambiar el 0 ni el 100 %. */
export function applyExpo(value: number, expo: number): number {
  const v = clampUnit(value);
  const e = Math.max(0, Math.min(1, expo));
  return (1 - e) * v + e * v * v * v;
}

/** Arcade drive: avance (throttle) + giro (turn) → motor izquierdo y derecho. */
export function arcadeMix(throttle: number, turn: number): { left: number; right: number } {
  let left = throttle + turn;
  let right = throttle - turn;
  const biggest = Math.max(1, Math.abs(left), Math.abs(right));
  left /= biggest;
  right /= biggest;
  return { left, right };
}

/** Convierte lo que toca el piloto en el comando final "L,R" (-255..255). */
export function computeMotorCommand(
  input: DriveInput,
  settings: DriveSettings,
): { left: number; right: number } {
  if (!input.armed || input.stopHeld || input.stopLatched) return { left: 0, right: 0 };

  const deadzone = settings.deadzonePct / 100;
  const expo = settings.expoPct / 100;
  const turnScale = Math.max(0.2, Math.min(1, settings.turnPct / 100));
  let left: number;
  let right: number;

  if (settings.controlMode === 'tank') {
    const l = applyExpo(applyDeadzone(input.left, deadzone), expo);
    const r = applyExpo(applyDeadzone(input.right, deadzone), expo);
    // La diferencia entre los dos lados es el giro: se escala para que no sea tan brusco.
    const throttle = (l + r) / 2;
    const turn = ((l - r) / 2) * turnScale;
    left = throttle + turn;
    right = throttle - turn;
  } else if (settings.controlMode === 'dpad') {
    // Botones digitales: sin zona muerta ni expo (la rampa del firmware suaviza el
    // arranque). Solo ◀/▶ = gira en el lugar; junto con ▲ o ▼ hace una curva. La
    // trompa siempre gira hacia la flecha, igual que con el joystick.
    const throttle = Number(input.dpadUp) - Number(input.dpadDown);
    const turn = (Number(input.dpadRight) - Number(input.dpadLeft)) * turnScale;
    ({ left, right } = arcadeMix(throttle, turn));
  } else {
    // Con el giro escalado, la diagonal deja las dos ruedas avanzando (curva) en vez
    // de frenar una y pivotar sobre ella.
    const stick = applyRadialDeadzone(input.stickX, input.stickY, deadzone);
    ({ left, right } = arcadeMix(applyExpo(stick.y, expo), applyExpo(stick.x, expo) * turnScale));
  }

  const power = input.turbo ? POWER_LEVELS.turbo : POWER_LEVELS[input.powerMode];
  left *= power;
  right *= power;

  const trim = Math.max(-20, Math.min(20, settings.trimPct)) / 100;
  if (trim > 0) right *= 1 - trim;
  else if (trim < 0) left *= 1 + trim;

  if (settings.invertLeft) left = -left;
  if (settings.invertRight) right = -right;

  return { left: clampPwm(left * PWM_MAX), right: clampPwm(right * PWM_MAX) };
}
