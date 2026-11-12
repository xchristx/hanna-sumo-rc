import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { ControlMode, DriveSettings, PowerMode } from '../logic/drive';

export interface Settings extends DriveSettings {
  powerMode: PowerMode;
  autoReconnect: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  controlMode: 'tank',
  trimPct: 0,
  deadzonePct: 8,
  turnPct: 60,
  expoPct: 40,
  invertLeft: false,
  invertRight: false,
  powerMode: 'normal',
  autoReconnect: true,
};

export const TRIM_LIMIT = 20;
export const DEADZONE_MAX = 30;
export const TURN_MIN = 20;

const KEY = 'hanna-sumo/settings/v1';
const CONTROL_MODES: readonly ControlMode[] = ['tank', 'joystick', 'dpad'];

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function sanitize(raw: unknown): Settings {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Record<keyof Settings, unknown>>;
  const d = DEFAULT_SETTINGS;
  return {
    controlMode: CONTROL_MODES.includes(r.controlMode as ControlMode) ? (r.controlMode as ControlMode) : d.controlMode,
    trimPct: clampInt(r.trimPct, -TRIM_LIMIT, TRIM_LIMIT, d.trimPct),
    deadzonePct: clampInt(r.deadzonePct, 0, DEADZONE_MAX, d.deadzonePct),
    turnPct: clampInt(r.turnPct, TURN_MIN, 100, d.turnPct),
    expoPct: clampInt(r.expoPct, 0, 100, d.expoPct),
    invertLeft: typeof r.invertLeft === 'boolean' ? r.invertLeft : d.invertLeft,
    invertRight: typeof r.invertRight === 'boolean' ? r.invertRight : d.invertRight,
    powerMode: r.powerMode === 'precise' || r.powerMode === 'normal' ? (r.powerMode as PowerMode) : d.powerMode,
    autoReconnect: typeof r.autoReconnect === 'boolean' ? r.autoReconnect : d.autoReconnect,
  };
}

interface SettingsContextValue {
  settings: Settings;
  loaded: boolean;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!cancelled && raw) setSettings(sanitize(JSON.parse(raw)));
      })
      .catch(() => {
        // Ajustes corruptos o storage no disponible: se usan los de fábrica.
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(KEY, JSON.stringify(settings)).catch(() => {});
  }, [settings, loaded]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => sanitize({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const value = useMemo(() => ({ settings, loaded, update, reset }), [settings, loaded, update, reset]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings debe usarse dentro de <SettingsProvider>');
  return ctx;
}
