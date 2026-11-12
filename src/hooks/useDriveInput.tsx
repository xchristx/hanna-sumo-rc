import { createContext, useContext, useRef, type ReactNode, type RefObject } from 'react';

import { createDriveInput, type DriveInput } from '../logic/drive';

const DriveInputContext = createContext<RefObject<DriveInput> | null>(null);

/**
 * Comparte un único ref mutable entre los controles táctiles (que escriben) y el
 * lazo de envío a 20 Hz (que lee). Escribir en él no provoca renders.
 */
export function DriveInputProvider({ children }: { children: ReactNode }) {
  const ref = useRef<DriveInput>(createDriveInput());
  return <DriveInputContext.Provider value={ref}>{children}</DriveInputContext.Provider>;
}

export function useDriveInput(): RefObject<DriveInput> {
  const ref = useContext(DriveInputContext);
  if (!ref) throw new Error('useDriveInput debe usarse dentro de <DriveInputProvider>');
  return ref;
}
