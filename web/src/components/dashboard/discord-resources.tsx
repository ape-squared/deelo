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
import type { ChannelKind, GuildChannel } from '@/lib/discord-channels';
import { channelOptions } from '@/lib/discord-channels';
import type { GuildRole } from '@/lib/discord-roles';
import { roleOptions } from '@/lib/discord-roles';

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
  optional = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  kinds?: ChannelKind[];
  optional?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted">{label}</label>
      <ChannelSelect
        value={value || null}
        onChange={(v) => onChange(v ?? '')}
        kinds={kinds}
        allowNone={optional}
        placeholder="Select channel"
        noneLabel={optional ? '— None —' : 'Select channel'}
      />
    </div>
  );
}

interface GuildRolesState {
  roles: GuildRole[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const GuildRolesContext = createContext<GuildRolesState | null>(null);

export function GuildRolesProvider({ guildId, children }: { guildId: string; children: ReactNode }) {
  const [roles, setRoles] = useState<GuildRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/guilds/${guildId}/roles`);
      const data = (await res.json()) as { roles?: GuildRole[]; error?: string };
      if (!res.ok) {
        setRoles([]);
        setError(data.error ?? 'Failed to load roles');
        return;
      }
      setRoles(data.roles ?? []);
    } catch {
      setRoles([]);
      setError('Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo(() => ({ roles, loading, error, refresh: load }), [roles, loading, error, load]);

  return <GuildRolesContext.Provider value={value}>{children}</GuildRolesContext.Provider>;
}

function useGuildRoles() {
  const ctx = useContext(GuildRolesContext);
  if (!ctx) throw new Error('useGuildRoles must be used within GuildRolesProvider');
  return ctx;
}

function ManualRoleInput({ value, onChange, hint }: { value: string | null; onChange: (v: string | null) => void; hint?: string }) {
  return (
    <div className="space-y-2">
      {hint && <p className="text-xs text-amber-400/90">{hint}</p>}
      <input
        className="input font-mono text-sm"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder="Role ID"
      />
    </div>
  );
}

export function RoleSelect({
  value,
  onChange,
  allowNone = true,
  noneLabel = '— None —',
  placeholder = 'Select a role',
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  allowNone?: boolean;
  noneLabel?: string;
  placeholder?: string;
}) {
  const { roles, loading, error } = useGuildRoles();
  const options = useMemo(() => roleOptions(roles), [roles]);

  if (error) {
    return <ManualRoleInput value={value} onChange={onChange} hint={`${error} Enter a role ID manually.`} />;
  }

  if (loading) {
    return (
      <select className="input text-sm text-muted" disabled>
        <option>Loading roles…</option>
      </select>
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
      {!hasValue && value && <option value={value}>Unknown role ({value})</option>}
      {!options.length && !allowNone && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function MiniRoleSelect({
  label,
  value,
  onChange,
  optional = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted">{label}</label>
      <RoleSelect
        value={value || null}
        onChange={(v) => onChange(v ?? '')}
        allowNone={optional}
        noneLabel={optional ? '— None —' : 'Select role'}
      />
    </div>
  );
}

export function useChannelName(channelId: string): string {
  const { channels } = useGuildChannels();
  const channel = channels.find((c) => c.id === channelId);
  return channel ? `#${channel.name}` : channelId;
}

export function useRoleName(roleId: string): string {
  const { roles } = useGuildRoles();
  const role = roles.find((r) => r.id === roleId);
  return role ? `@${role.name}` : roleId;
}
