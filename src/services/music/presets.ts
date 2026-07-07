export interface AudioPreset {
  id: string;
  label: string;
  /** FFmpeg -af filter chain, or null for no processing */
  filter: string | null;
}

export const AUDIO_PRESETS: AudioPreset[] = [
  { id: 'off', label: 'Off', filter: null },
  { id: 'flat', label: 'Flat', filter: null },
  { id: 'boost', label: 'Bass Boost', filter: 'bass=g=8' },
  { id: 'soft', label: 'Soft', filter: 'lowpass=f=3200' },
  { id: 'nightcore', label: 'Nightcore', filter: 'asetrate=60000,aresample=48000,atempo=1.25' },
  { id: 'vaporwave', label: 'Vaporwave', filter: 'asetrate=38000,aresample=48000,atempo=0.85' },
  { id: 'chipmunk', label: 'Chipmunk', filter: 'asetrate=65000,aresample=48000' },
  { id: 'karaoke', label: 'Karaoke', filter: 'pan=stereo|c0=c0-c1|c1=c1-c0' },
  { id: 'metal', label: 'Metal', filter: 'bass=g=6,treble=g=8' },
  { id: 'piano', label: 'Piano', filter: 'equalizer=f=800:width_type=o:width=2:g=4' },
  { id: 'vibrato', label: 'Vibrato', filter: 'vibrato=f=5' },
  { id: '8d', label: '8D Audio', filter: 'apulsator=mode=in:amount=1:hz=0.125' },
];

const PRESET_MAP = new Map(AUDIO_PRESETS.map((p) => [p.id, p]));

export function normalizePresetId(input: string): string | null {
  const key = input.toLowerCase().trim().replace(/\s+/g, '');
  if (key === 'default' || key === 'none' || key === 'clear') return 'off';
  return PRESET_MAP.has(key) ? key : null;
}

export function getPreset(id: string): AudioPreset {
  return PRESET_MAP.get(id) ?? PRESET_MAP.get('off')!;
}

export function getPresetFilter(id: string): string | null {
  const preset = getPreset(id);
  return preset.filter;
}

export function listPresetLines(activeId?: string): string {
  return AUDIO_PRESETS.filter((p) => p.id !== 'off')
    .map((p) => {
      const marker = p.id === activeId ? ' **← active**' : '';
      return `\`${p.id}\` — ${p.label}${marker}`;
    })
    .join('\n');
}
