import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PairedDevice {
  name: string;
  address: string;
}

const KEY = 'hanna-sumo/last-device/v1';

export async function loadLastDevice(): Promise<PairedDevice | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as PairedDevice).address === 'string' &&
      typeof (parsed as PairedDevice).name === 'string'
    ) {
      return { name: (parsed as PairedDevice).name, address: (parsed as PairedDevice).address };
    }
  } catch {
    // Dato corrupto o storage no disponible: se comporta como si no hubiera ninguno.
  }
  return null;
}

export async function saveLastDevice(device: PairedDevice): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(device));
  } catch {
    // No es crítico: solo se pierde el "recordar".
  }
}
