// Fixed order of algorithms. Chart colour slots follow this order so that each algorithm
// keeps the same colour on every page, whatever is filtered.
export const ALGORITHM_ORDER = ['PRESENT', 'SIMON', 'SPECK', 'XTEA'];

// Categorical palette (validated for colour-vision deficiency in light and dark mode).
export const SERIES_COLORS = {
  light: { PRESENT: '#2a78d6', SIMON: '#eb6834', SPECK: '#1baf7a', XTEA: '#eda100' },
  dark: { PRESENT: '#3987e5', SIMON: '#d95926', SPECK: '#199e70', XTEA: '#c98500' },
};

export const CHART_CHROME = {
  light: { grid: '#e5e5e5', axis: '#d4d4d4', tick: '#737373', label: '#404040', surface: '#ffffff', cursor: 'rgba(0,0,0,0.04)' },
  dark: { grid: '#262626', axis: '#404040', tick: '#a3a3a3', label: '#d4d4d4', surface: '#171717', cursor: 'rgba(255,255,255,0.05)' },
};

export const MESSAGE_SIZE_PRESETS = [16, 64, 256, 1024, 4096, 16384, 65536, 262144];

export const MODE_LABELS = {
  CBC: 'CBC',
  CTR: 'CTR',
  ECB: 'ECB (insecure)',
};

export const HISTORY_STORAGE_KEY = 'lca-benchmark-history';
export const HISTORY_LIMIT = 20;

// Weighting presets for the comparison recommendation (0-100 per criterion).
export const WEIGHT_PRESETS = {
  balanced: { label: 'Balanced', weights: { encryption: 35, decryption: 35, keySetup: 10, ciphertextSize: 10, roundKeyMemory: 10 } },
  speed: { label: 'Speed', weights: { encryption: 50, decryption: 50, keySetup: 0, ciphertextSize: 0, roundKeyMemory: 0 } },
  memory: { label: 'Low memory', weights: { encryption: 20, decryption: 20, keySetup: 0, ciphertextSize: 0, roundKeyMemory: 60 } },
  bandwidth: { label: 'Low bandwidth', weights: { encryption: 20, decryption: 20, keySetup: 0, ciphertextSize: 60, roundKeyMemory: 0 } },
};
