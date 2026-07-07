'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ChannelKind, GuildChannel } from '@/lib/discord-guild';
import { channelOptions } from '@/lib/discord-guild';

interface GuildChannelsState {
  channels: GuildChannel[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const GuildChannelsContext = createContext<GuildChannelsState | null>(null);

export function GuildChannelsProvider({ guildId, children }: { guildId: string; children: ReactNode }) {
  const [channels, setChannels] = useState<GuildChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/guilds/${guildId}/channels`);
      const data = (await res.json()) as { channels?: GuildChannel[]; error?: string };
      if (!res.ok) {
        setChannels([]);
        setError(data.error ?? 'Failed to load channels');
        return;
      }
      setChannels(data.channels ?? []);
    } catch {
      setChannels([]);
      setError('Failed to load channels');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo(
    () => ({ channels, loading, error, refresh: load }),
    [channels, loading, error, load],
  );

  return <GuildChannelsContext.Provider value={value}>{children}</GuildChannelsContext.Provider>;
}

function useGuildChannels() {
  const ctx = useContext(GuildChannelsContext);
  if (!ctx) throw new Error('useGuildChannels must be used within GuildChannelsProvider');
  return ctx;
}

function ManualChannelInput({
  value,
  onChange,
  hint,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      {hint && <p className="text-xs text-amber-400/90">{hint}</p>}
      <input
        className="input font-mono text-sm"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder="Channel ID"
      />
    </div>
  );
}

export function ChannelSelect({
  value,
  onChange,
  kinds = ['text'],
  allowNone = true,
  noneLabel = '— None —',
  placeholder = 'Select a channel',
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  kinds?: ChannelKind[];
  allowNone?: boolean;
  noneLabel?: string;
  placeholder?: string;
}) {
  const { channels, loading, error } = useGuildChannels();
  const options = useMemo(() => channelOptions(channels, kinds), [channels, kinds]);

  if (error) {
    return (
      <ManualChannelInput
        value={value}
        onChange={onChange}
        hint={`${error} Enter a channel ID manually, or invite Deelo to this server.`}
      />
    );
  }

  if (loading) {
    return (
      <select className="input text-sm text-muted" disabled>
        <option>Loading channels…</option>
      </select>
    );
  }

  if (!options.length) {
    return (
      <ManualChannelInput
        value={value}
        onChange={onChange}
        hint="No matching channels found. Create one in Discord or enter an ID manually."
      />
    );
  }

  const hasValue = value && options.some((o) => o.value === value);

  return (
    <select
      className="input text-sm"
      value={hasValue ? value! : ''}
      onChange={(e) => onChange(e.target.value || null)}
    >
      {allowNone && <option value="">{noneLabel}</option>}
      {!hasValue && value && (
        <option value={value}>Unknown channel ({value})</option>
      )}
      {!options.length && !allowNone && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function MiniChannelSelect({
  label,
  value,
  onChange,
  kinds = ['text'],
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  kinds?: ChannelKind[];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted">{label}</label>
      <ChannelSelect
        value={value || null}
        onChange={(v) => onChange(v ?? '')}
        kinds={kinds}
        allowNone={false}
        placeholder="Select channel"
        noneLabel="Select channel"
      />
    </div>
  );
}
