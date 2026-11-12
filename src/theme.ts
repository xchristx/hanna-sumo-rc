/**
 * Identidad "arena de combate": negro de dohyo, rojo del robot como acento,
 * ámbar solo para TURBO y verde/rojo reservados para el estado del enlace.
 */
export const colors = {
  bg: '#0A0A0C',
  panel: '#141418',
  panelHi: '#1D1D23',
  line: '#2C2C34',
  lineHi: '#45454F',
  text: '#F3F0EA',
  textDim: '#9A97A0',
  textFaint: '#5E5C66',
  red: '#FF2B2B',
  redDeep: '#8E0F17',
  redSoft: 'rgba(255, 43, 43, 0.16)',
  amber: '#FFB31A',
  amberSoft: 'rgba(255, 179, 26, 0.14)',
  green: '#2EF07A',
  greenSoft: 'rgba(46, 240, 122, 0.14)',
  steel: '#CFCBC3',
  ring: '#EDEAE4',
  black: '#000000',
} as const;

/** Barlow Condensed, embebida por el plugin de expo-font (app.json): familia = nombre del archivo. */
export const fonts = {
  semibold: 'BarlowCondensed_600SemiBold',
  bold: 'BarlowCondensed_700Bold',
  heavy: 'BarlowCondensed_800ExtraBold',
  black: 'BarlowCondensed_900Black',
  blackItalic: 'BarlowCondensed_900Black_Italic',
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
} as const;
