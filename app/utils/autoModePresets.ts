export const AUTO_MODE_PRESETS = {
  best: {
    explore: 'gpt-4.1',
    plan: 'o3',
    execute: 'claude-4-sonnet',
    debug: 'o3'
  },
  cheaper: {
    explore: 'gemini-2.5-pro-preview-05-06',
    plan: 'o3',
    execute: 'z-ai/glm-4.5',
    debug: 'o3'
  }
} as const;

export type AutoModePresetKey = keyof typeof AUTO_MODE_PRESETS;