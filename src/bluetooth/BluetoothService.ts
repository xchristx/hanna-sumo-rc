import RNBluetoothClassic, {
  type BluetoothDevice,
  type BluetoothDeviceEvent,
  type BluetoothDeviceReadEvent,
  type BluetoothEventSubscription,
} from 'react-native-bluetooth-classic';

import { loadLastDevice, saveLastDevice, type PairedDevice } from './lastDevice';
import { ensureBluetoothPermissions, type PermissionStatus } from './permissions';
import { LINK_TIMEOUT_MS, OK_MESSAGE, clampPwm, formatCommand } from './protocol';

export type ConnectionPhase = 'idle' | 'connecting' | 'connected' | 'reconnecting';

export interface BluetoothState {
  phase: ConnectionPhase;
  /** Dispositivo conectado o al que se está intentando conectar. */
  device: PairedDevice | null;
  /** Último robot con el que se conectó (también entre sesiones de la app). */
  lastDevice: PairedDevice | null;
  /** true si llegó un "OK" del robot hace menos de LINK_TIMEOUT_MS. */
  linkAlive: boolean;
  /** Cuántas veces se cayó el enlace sin que el usuario desconectara (para avisar con vibración). */
  linkLosses: number;
  bluetoothEnabled: boolean | null;
  permission: PermissionStatus | null;
  /** Último error, en español, listo para mostrar. */
  error: string | null;
  /** Intentos de reconexión seguidos (0 = primer intento). */
  attempt: number;
}

export interface MotorCommand {
  left: number;
  right: number;
}

const INITIAL_STATE: BluetoothState = {
  phase: 'idle',
  device: null,
  lastDevice: null,
  linkAlive: false,
  linkLosses: 0,
  bluetoothEnabled: null,
  permission: null,
  error: null,
  attempt: 0,
};

/** Espera antes de cada reintento; el último valor se repite indefinidamente. */
const RETRY_DELAYS_MS = [400, 800, 1500, 2500];
const LINK_CHECK_MS = 100;

const CONNECT_OPTIONS = { delimiter: '\n', charset: 'ascii' };

class UserFacingError extends Error {}

function describeError(error: unknown): string {
  if (error instanceof UserFacingError) return error.message;
  const message = error instanceof Error ? error.message : String(error);
  if (/ALREADY_CONNECTING/i.test(message)) return 'Ya hay un intento de conexión en curso.';
  if (/NOT_ENABLED|not enabled/i.test(message)) return 'El Bluetooth del teléfono está apagado.';
  if (/read failed|socket|timeout|connect/i.test(message)) {
    return 'El robot no responde. ¿Está encendido y cerca?';
  }
  return `No se pudo conectar (${message}).`;
}

function noop() {}

class BluetoothService {
  private state: BluetoothState = INITIAL_STATE;
  private listeners = new Set<() => void>();

  private started = false;
  private permissionRequest: Promise<PermissionStatus> | null = null;
  private nativeSubscriptions: BluetoothEventSubscription[] = [];
  private linkTimer: ReturnType<typeof setInterval> | null = null;

  private device: BluetoothDevice | null = null;
  private readSubscription: BluetoothEventSubscription | null = null;
  /** A quién queremos estar conectados. null = el usuario desconectó a mano. */
  private target: PairedDevice | null = null;
  private autoReconnect = true;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  /** Se incrementa en cada intento para descartar resultados de intentos viejos. */
  private connectSeq = 0;

  private lastOkAt = 0;
  private lastSent: MotorCommand = { left: 0, right: 0 };
  private writing = false;
  private pendingLine: string | null = null;

  // ---------------------------------------------------------------- store

  getState = (): BluetoothState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private setState(patch: Partial<BluetoothState>): void {
    const next = { ...this.state, ...patch };
    const changed = (Object.keys(next) as (keyof BluetoothState)[]).some(
      (key) => next[key] !== this.state[key],
    );
    if (!changed) return;
    this.state = next;
    this.listeners.forEach((listener) => listener());
  }

  // ------------------------------------------------------------ lifecycle

  start(): void {
    if (this.started) return;
    this.started = true;
    try {
      this.nativeSubscriptions.push(
        RNBluetoothClassic.onDeviceDisconnected(this.handleDeviceDisconnected),
        RNBluetoothClassic.onBluetoothDisabled(this.handleBluetoothDisabled),
        RNBluetoothClassic.onBluetoothEnabled(this.handleBluetoothEnabled),
      );
    } catch {
      this.setState({
        error: 'Módulo Bluetooth no disponible: instala el build de la app (Expo Go no sirve).',
      });
    }
    this.linkTimer = setInterval(this.checkLink, LINK_CHECK_MS);
    void this.refreshAdapterState();
    void loadLastDevice().then((stored) => {
      if (stored && !this.state.lastDevice) this.setState({ lastDevice: stored });
    });
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.nativeSubscriptions.forEach((s) => s.remove());
    this.nativeSubscriptions = [];
    if (this.linkTimer) clearInterval(this.linkTimer);
    this.linkTimer = null;
    void this.disconnect();
  }

  // -------------------------------------------------------------- adapter

  async refreshAdapterState(): Promise<boolean> {
    try {
      const enabled = await RNBluetoothClassic.isBluetoothEnabled();
      this.setState({ bluetoothEnabled: enabled });
      return enabled;
    } catch {
      this.setState({ bluetoothEnabled: false });
      return false;
    }
  }

  /**
   * Android ignora una segunda solicitud de permisos mientras hay otra abierta
   * (la responde como denegada), así que las llamadas simultáneas comparten una.
   */
  requestPermissions(): Promise<PermissionStatus> {
    this.permissionRequest ??= ensureBluetoothPermissions()
      .catch((): PermissionStatus => 'denied')
      .then((status) => {
        this.permissionRequest = null;
        this.setState({ permission: status });
        return status;
      });
    return this.permissionRequest;
  }

  async requestEnable(): Promise<boolean> {
    if ((await this.requestPermissions()) !== 'granted') return false;
    try {
      await RNBluetoothClassic.requestBluetoothEnabled();
    } catch {
      // El usuario dijo que no.
    }
    return this.refreshAdapterState();
  }

  openSystemSettings(): void {
    try {
      RNBluetoothClassic.openBluetoothSettings();
    } catch {
      // Sin módulo nativo no hay nada que abrir.
    }
  }

  async getPairedDevices(): Promise<PairedDevice[]> {
    if ((await this.requestPermissions()) !== 'granted') return [];
    if (!(await this.refreshAdapterState())) return [];
    const bonded = await RNBluetoothClassic.getBondedDevices();
    const seen = new Set<string>();
    const result: PairedDevice[] = [];
    for (const d of bonded) {
      if (seen.has(d.address)) continue;
      seen.add(d.address);
      result.push({ name: d.name || d.address, address: d.address });
    }
    return result;
  }

  // ----------------------------------------------------------- connection

  setAutoReconnect(enabled: boolean): void {
    this.autoReconnect = enabled;
    if (!enabled && this.retryTimer) {
      this.clearRetry();
      this.setState({ phase: 'idle', attempt: 0 });
    }
  }

  /** Conexión pedida por el usuario (o la reconexión automática al abrir la app). */
  connect(device: PairedDevice): Promise<boolean> {
    this.target = device;
    this.clearRetry();
    this.setState({ attempt: 0 });
    return this.openConnection(device);
  }

  /** Desconexión manual: no se intenta reconectar. También sirve para cancelar. */
  async disconnect(): Promise<void> {
    this.target = null;
    this.connectSeq++;
    this.clearRetry();
    const device = this.device;
    if (device && this.state.phase === 'connected') {
      // Último 0,0 por cortesía; el failsafe del robot lo detiene igual.
      await device.write(formatCommand(0, 0), 'ascii').catch(noop);
    }
    this.closeLink();
    this.setState({ phase: 'idle', device: null, linkAlive: false, attempt: 0, error: null });
  }

  private async openConnection(device: PairedDevice): Promise<boolean> {
    const seq = ++this.connectSeq;

    if (this.device?.address === device.address && this.state.phase === 'connected') {
      return true;
    }
    this.closeLink();
    this.setState({
      phase: this.state.attempt > 0 ? 'reconnecting' : 'connecting',
      device,
      linkAlive: false,
    });

    try {
      if ((await this.requestPermissions()) !== 'granted') {
        throw new UserFacingError('Faltan los permisos de Bluetooth.');
      }
      if (!(await this.refreshAdapterState())) {
        throw new UserFacingError('El Bluetooth del teléfono está apagado.');
      }
      const connected = await RNBluetoothClassic.connectToDevice(device.address, CONNECT_OPTIONS);
      if (seq !== this.connectSeq) {
        // Mientras conectaba, el usuario canceló o eligió otro robot.
        connected.disconnect().catch(noop);
        return false;
      }
      this.attach(connected, device);
      return true;
    } catch (error) {
      if (seq !== this.connectSeq) return false;
      this.setState({ error: describeError(error) });
      this.scheduleRetry();
      return false;
    }
  }

  private attach(connected: BluetoothDevice, device: PairedDevice): void {
    this.device = connected;
    this.lastOkAt = 0;
    this.writing = false;
    this.pendingLine = null;
    try {
      this.readSubscription = connected.onDataReceived(this.handleData);
    } catch {
      this.readSubscription = null;
    }
    const info = { name: connected.name || device.name, address: device.address };
    this.setState({ phase: 'connected', device: info, lastDevice: info, error: null, attempt: 0, linkAlive: false });
    void saveLastDevice(info);
  }

  /** Cierra el socket y limpia; no toca el estado público. */
  private closeLink(): void {
    this.readSubscription?.remove();
    this.readSubscription = null;
    const device = this.device;
    this.device = null;
    this.writing = false;
    this.pendingLine = null;
    this.lastOkAt = 0;
    if (device) device.disconnect().catch(noop);
  }

  private connectionLost(message: string): void {
    this.closeLink();
    this.setState({ error: message, ...this.linkDownPatch() });
    this.scheduleRetry();
  }

  /** Enlace caído sin desconexión manual: cuenta la pérdida si estaba vivo. */
  private linkDownPatch(): Partial<BluetoothState> {
    return this.state.linkAlive
      ? { linkAlive: false, linkLosses: this.state.linkLosses + 1 }
      : { linkAlive: false };
  }

  private scheduleRetry(): void {
    this.clearRetry();
    const target = this.target;
    if (!target || !this.autoReconnect || this.state.bluetoothEnabled === false) {
      this.setState({ phase: 'idle', attempt: 0 });
      return;
    }
    const attempt = this.state.attempt + 1;
    const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length) - 1];
    this.setState({ phase: 'reconnecting', device: target, attempt });
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.openConnection(target);
    }, delay);
  }

  private clearRetry(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  // -------------------------------------------------------------- sending

  /**
   * Envía "L,R\n". Si todavía se está escribiendo el comando anterior, se guarda
   * solo el más nuevo: nunca se acumula una cola de comandos viejos.
   */
  sendCommand(left: number, right: number): void {
    this.lastSent = { left: clampPwm(left), right: clampPwm(right) };
    if (!this.device || this.state.phase !== 'connected') return;
    this.writeLine(formatCommand(this.lastSent.left, this.lastSent.right));
  }

  getLastSent(): MotorCommand {
    return this.lastSent;
  }

  getLastOkAt(): number {
    return this.lastOkAt;
  }

  private writeLine(line: string): void {
    const device = this.device;
    if (!device) return;
    if (this.writing) {
      this.pendingLine = line;
      return;
    }
    this.writing = true;
    device.write(line, 'ascii').then(
      () => {
        if (this.device !== device) return;
        this.writing = false;
        const next = this.pendingLine;
        this.pendingLine = null;
        if (next) this.writeLine(next);
      },
      () => {
        if (this.device !== device) return;
        this.connectionLost('No se pudo enviar al robot.');
      },
    );
  }

  // --------------------------------------------------------------- events

  private handleData = (event: BluetoothDeviceReadEvent): void => {
    if (typeof event.data === 'string' && event.data.trim() === OK_MESSAGE) {
      this.lastOkAt = Date.now();
      if (!this.state.linkAlive) this.checkLink();
    }
  };

  private checkLink = (): void => {
    const alive =
      this.state.phase === 'connected' &&
      this.lastOkAt > 0 &&
      Date.now() - this.lastOkAt < LINK_TIMEOUT_MS;
    if (alive === this.state.linkAlive) return;
    this.setState(alive ? { linkAlive: true } : this.linkDownPatch());
  };

  private handleDeviceDisconnected = (event: BluetoothDeviceEvent): void => {
    if (!this.device || event.device?.address !== this.device.address) return;
    this.connectionLost('Se perdió la conexión con el robot.');
  };

  private handleBluetoothDisabled = (): void => {
    this.clearRetry();
    this.closeLink();
    this.setState({ bluetoothEnabled: false, ...this.linkDownPatch() });
    if (this.state.phase !== 'idle') {
      this.setState({ phase: 'idle', attempt: 0, error: 'El Bluetooth del teléfono se apagó.' });
    }
  };

  private handleBluetoothEnabled = (): void => {
    this.setState({ bluetoothEnabled: true });
    if (this.target && this.autoReconnect && this.state.phase === 'idle') {
      void this.connect(this.target);
    }
  };
}

export const bluetooth = new BluetoothService();
export type { PairedDevice };
