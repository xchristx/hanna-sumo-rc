/**
 * Protocolo con el firmware (firmware/minisumo_rc/minisumo_rc.ino).
 *
 * App → robot:  "L,R\n" con L y R enteros en [-255, 255], a 20 Hz siempre
 *               (también "0,0": funciona como heartbeat).
 * Robot → app:  "OK\n" cada 500 ms mientras recibe comandos.
 */

export const SEND_INTERVAL_MS = 50; // 20 Hz
export const LINK_TIMEOUT_MS = 1000; // sin OK durante 1 s = enlace caído
export const PWM_MAX = 255;
export const OK_MESSAGE = 'OK';

export function clampPwm(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const rounded = Math.round(value);
  if (rounded > PWM_MAX) return PWM_MAX;
  if (rounded < -PWM_MAX) return -PWM_MAX;
  return rounded === 0 ? 0 : rounded; // evita "-0"
}

export function formatCommand(left: number, right: number): string {
  return `${clampPwm(left)},${clampPwm(right)}\n`;
}
