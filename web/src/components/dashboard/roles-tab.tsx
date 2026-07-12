'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DashboardGuildSettings } from '@/lib/guild-settings';
import type { GuildFullConfig } from '@/lib/guild-types';
import { AddRow, CrudList, MiniInput, MiniSelect } from '@/components/dashboard/guild-crud';
import { MiniChannelSelect, MiniRoleSelect, RoleSelect, useRoleName } from '@/components/dashboard/discord-resources';

const BUTTON_STYLES = [
  { value: 'primary', label: 'Primary (blue)' },
  { value: 'secondary', label: 'Secondary (gray)' },
  { value: 'success', label: 'Success (green)' },
  { value: 'danger', label: 'Danger (red)' },
] as const;

function RoleCell({ roleId }: { roleId: string }) {
  const name = useRoleName(roleId);
  return <span className="font-medium text-foreground">{name}</span>;
}

async function apiJson(
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; error?: string; data?: unknown }> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: (data as { error?: string }).error ?? 'Request failed' };
  return { ok: true, data };
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="card p-6 lg:p-8">
      <h2 className="text-lg font-semibold mb-1">{title}</h2>
      <p className="text-sm text-muted mb-6">{desc}</p>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {hint && <p className="text-xs text-muted mb-2">{hint}</p>}
      {children}
    </div>
  );
}

export function RolesTab({
  guildId,
  guild,
  config,
  update,
  onReload,
  setMessage,
}: {
  guildId: string;
  guild: DashboardGuildSettings;
  config: GuildFullConfig;
  update: <K extends keyof DashboardGuildSettings>(key: K, value: DashboardGuildSettings[K]) => void;
  onReload: () => Promise<void>;
  setMessage: (m: string) => void;
}) {
  return (
    <>
      <Section title="Core roles" desc="Primary join role and moderation roles. Save with the bar below.">
        <Field label="Primary autorole" hint="Assigned when members join (unless roles are restored).">
          <RoleSelect value={guild.autorole} onChange={(v) => update('autorole', v)} />
        </Field>
        <Field label="Mute role">
          <RoleSelect value={guild.mute_role} onChange={(v) => update('mute_role', v)} />
        </Field>
        <Field label="Jail role">
          <RoleSelect value={guild.jail_role} onChange={(v) => update('jail_role', v)} />
        </Field>
      </Section>

      <ExtraAutorolesList guildId={guildId} items={config.autoroles} onReload={onReload} setMessage={setMessage} />
      <VanityRolesList guildId={guildId} items={config.vanityRoles} onReload={onReload} setMessage={setMessage} />
      <ReactionRolesList guildId={guildId} items={config.reactionRoles} onReload={onReload} setMessage={setMessage} />
      <ButtonRolesList guildId={guildId} items={config.buttonRoles} onReload={onReload} setMessage={setMessage} />
    </>
  );
}

function ExtraAutorolesList({
  guildId,
  items,
  onReload,
  setMessage,
}: {
  guildId: string;
  items: GuildFullConfig['autoroles'];
  onReload: () => Promise<void>;
  setMessage: (m: string) => void;
}) {
  const [role_id, setRoleId] = useState('');

  return (
    <CrudList
      title="Extra autoroles"
      desc="Additional roles assigned on join alongside the primary autorole."
      items={items}
      columns={['Role']}
      rowKey={(r) => r.role_id}
      renderRow={(r) => [<RoleCell key={r.role_id} roleId={r.role_id} />]}
      onDelete={async (r) => {
        await apiJson(`/api/guilds/${guildId}/resources?resource=autoroles&id=${r.role_id}`, { method: 'DELETE' });
        await onReload();
      }}
      onEdit={async (r, values) => {
        const next = values.role_id || r.role_id;
        const res = await apiJson(`/api/guilds/${guildId}/resources`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resource: 'autoroles', old_role_id: r.role_id, role_id: next }),
        });
        if (!res.ok) { setMessage(res.error ?? 'Failed'); return; }
        await onReload();
      }}
      renderEditForm={(r, values, setValues) => (
        <MiniRoleSelect
          label="Role"
          value={values.role_id ?? r.role_id}
          onChange={(v) => setValues({ ...values, role_id: v })}
        />
      )}
      addForm={
        <AddRow
          label="Add autorole"
          onAdd={async () => {
            const res = await apiJson(`/api/guilds/${guildId}/resources`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ resource: 'autoroles', role_id }),
            });
            if (!res.ok) { setMessage(res.error ?? 'Failed'); return; }
            setRoleId('');
            await onReload();
          }}
        >
          <MiniRoleSelect label="Role" value={role_id} onChange={setRoleId} />
        </AddRow>
      }
    />
  );
}

function VanityRolesList({
  guildId,
  items,
  onReload,
  setMessage,
}: {
  guildId: string;
  items: GuildFullConfig['vanityRoles'];
  onReload: () => Promise<void>;
  setMessage: (m: string) => void;
}) {
  const [vanity_string, setVanity] = useState('');
  const [role_id, setRoleId] = useState('');

  return (
    <CrudList
      title="Vanity roles"
      desc="Grant a role when a member's custom status contains your string (Premium)."
      items={items}
      columns={['Status contains', 'Role']}
      rowKey={(r) => r.vanity_string}
      renderRow={(r) => [r.vanity_string, <RoleCell key={r.role_id} roleId={r.role_id} />]}
      onDelete={async (r) => {
        await apiJson(
          `/api/guilds/${guildId}/resources?resource=vanity-roles&key=${encodeURIComponent(r.vanity_string)}`,
          { method: 'DELETE' },
        );
        await onReload();
      }}
      onEdit={async (r, values) => {
        const res = await apiJson(`/api/guilds/${guildId}/resources`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resource: 'vanity-roles',
            old_vanity_string: r.vanity_string,
            vanity_string: values.vanity_string ?? r.vanity_string,
            role_id: values.role_id ?? r.role_id,
          }),
        });
        if (!res.ok) { setMessage(res.error ?? 'Failed'); return; }
        await onReload();
      }}
      renderEditForm={(r, values, setValues) => (
        <>
          <MiniInput
            label="Vanity string"
            value={values.vanity_string ?? r.vanity_string}
            onChange={(v) => setValues({ ...values, vanity_string: v })}
          />
          <MiniRoleSelect
            label="Role"
            value={values.role_id ?? r.role_id}
            onChange={(v) => setValues({ ...values, role_id: v })}
          />
        </>
      )}
      addForm={
        <AddRow
          label="Add vanity role"
          onAdd={async () => {
            const res = await apiJson(`/api/guilds/${guildId}/resources`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ resource: 'vanity-roles', vanity_string, role_id }),
            });
            if (!res.ok) { setMessage(res.error ?? 'Failed'); return; }
            setVanity('');
            setRoleId('');
            await onReload();
          }}
        >
          <MiniInput label="Vanity string" value={vanity_string} onChange={setVanity} placeholder="deelo.gg" />
          <MiniRoleSelect label="Role" value={role_id} onChange={setRoleId} />
        </AddRow>
      }
    />
  );
}

function useChannelMessages(guildId: string, channelId: string) {
  const [messages, setMessages] = useState<Array<{ id: string; preview: string; author: string }>>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!channelId) { setMessages([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/guilds/${guildId}/channels/${channelId}/messages`);
      const data = (await res.json()) as { messages?: Array<{ id: string; preview: string; author: string }> };
      setMessages(data.messages ?? []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [guildId, channelId]);

  useEffect(() => { void load(); }, [load]);

  return { messages, loading };
}

function MessagePicker({
  guildId,
  channelId,
  value,
  onChange,
}: {
  guildId: string;
  channelId: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { messages, loading } = useChannelMessages(guildId, channelId);

  if (!channelId) {
    return <MiniInput label="Message ID" value={value} onChange={onChange} placeholder="Select a channel first" />;
  }

  if (loading) {
    return (
      <div>
        <label className="mb-1 block text-xs text-muted">Message</label>
        <select className="input text-sm text-muted" disabled><option>Loading messages…</option></select>
      </div>
    );
  }

  const options = messages.map((m) => ({
    value: m.id,
    label: `${m.author}: ${m.preview}`,
  }));

  return (
    <div>
      <label className="mb-1 block text-xs text-muted">Message</label>
      <select className="input text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select message or paste ID below</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <input
        className="input font-mono text-xs mt-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Or paste message ID"
      />
    </div>
  );
}

function ReactionRolesList({
  guildId,
  items,
  onReload,
  setMessage,
}: {
  guildId: string;
  items: GuildFullConfig['reactionRoles'];
  onReload: () => Promise<void>;
  setMessage: (m: string) => void;
}) {
  const [channel_id, setChannelId] = useState('');
  const [message_id, setMessageId] = useState('');
  const [emoji, setEmoji] = useState('');
  const [role_id, setRoleId] = useState('');

  return (
    <CrudList
      title="Reaction roles"
      desc="Members react to get a role. Edits sync the emoji on the Discord message."
      items={items}
      columns={['Channel', 'Message', 'Emoji', 'Role']}
      renderRow={(r) => [
        <span key="ch" className="font-mono text-muted">{r.channel_id.slice(-6)}</span>,
        <span key="msg" className="font-mono text-muted">{r.message_id.slice(-6)}</span>,
        r.emoji,
        <RoleCell key="role" roleId={r.role_id} />,
      ]}
      onDelete={async (r) => {
        const res = await apiJson(`/api/guilds/${guildId}/resources?resource=reaction-roles&id=${r.id}`, { method: 'DELETE' });
        if (!res.ok) { setMessage(res.error ?? 'Failed'); return; }
        await onReload();
      }}
      onEdit={async (r, values) => {
        const res = await apiJson(`/api/guilds/${guildId}/resources`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resource: 'reaction-roles',
            id: r.id,
            emoji: values.emoji ?? r.emoji,
            role_id: values.role_id ?? r.role_id,
          }),
        });
        if (!res.ok) { setMessage(res.error ?? 'Failed'); return; }
        await onReload();
      }}
      renderEditForm={(r, values, setValues) => (
        <>
          <MiniInput label="Emoji" value={values.emoji ?? r.emoji} onChange={(v) => setValues({ ...values, emoji: v })} />
          <MiniRoleSelect label="Role" value={values.role_id ?? r.role_id} onChange={(v) => setValues({ ...values, role_id: v })} />
        </>
      )}
      addForm={
        <AddRow
          label="Add reaction role"
          onAdd={async () => {
            const res = await apiJson(`/api/guilds/${guildId}/resources`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ resource: 'reaction-roles', channel_id, message_id, emoji, role_id }),
            });
            if (!res.ok) { setMessage(res.error ?? 'Failed'); return; }
            setMessageId('');
            setEmoji('');
            setRoleId('');
            await onReload();
          }}
        >
          <MiniChannelSelect label="Channel" value={channel_id} onChange={setChannelId} />
          <MessagePicker guildId={guildId} channelId={channel_id} value={message_id} onChange={setMessageId} />
          <MiniInput label="Emoji" value={emoji} onChange={setEmoji} placeholder="👋" />
          <MiniRoleSelect label="Role" value={role_id} onChange={setRoleId} />
        </AddRow>
      }
    />
  );
}

function ButtonRolesList({
  guildId,
  items,
  onReload,
  setMessage,
}: {
  guildId: string;
  items: GuildFullConfig['buttonRoles'];
  onReload: () => Promise<void>;
  setMessage: (m: string) => void;
}) {
  const [channel_id, setChannelId] = useState('');
  const [label, setLabel] = useState('');
  const [role_id, setRoleId] = useState('');
  const [style, setStyle] = useState('primary');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  return (
    <CrudList
      title="Button roles"
      desc="Posts a button panel in Discord — members click to toggle the role. Edit updates the live panel."
      items={items}
      columns={['Channel', 'Label', 'Style', 'Role']}
      renderRow={(r) => [
        <span key="ch" className="font-mono text-muted">{r.channel_id.slice(-6)}</span>,
        r.label,
        r.style,
        <RoleCell key="role" roleId={r.role_id} />,
      ]}
      onDelete={async (r) => {
        const res = await apiJson(`/api/guilds/${guildId}/resources?resource=button-roles&id=${r.id}`, { method: 'DELETE' });
        if (!res.ok) { setMessage(res.error ?? 'Failed'); return; }
        await onReload();
      }}
      onEdit={async (r, values) => {
        const res = await apiJson(`/api/guilds/${guildId}/resources`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resource: 'button-roles',
            id: r.id,
            label: values.label ?? r.label,
            role_id: values.role_id ?? r.role_id,
            style: values.style ?? r.style,
          }),
        });
        if (!res.ok) { setMessage(res.error ?? 'Failed'); return; }
        await onReload();
      }}
      renderEditForm={(r, values, setValues) => (
        <>
          <MiniInput label="Button label" value={values.label ?? r.label} onChange={(v) => setValues({ ...values, label: v })} />
          <MiniRoleSelect label="Role" value={values.role_id ?? r.role_id} onChange={(v) => setValues({ ...values, role_id: v })} />
          <MiniSelect
            label="Style"
            value={values.style ?? r.style}
            onChange={(v) => setValues({ ...values, style: v })}
            options={[...BUTTON_STYLES]}
          />
        </>
      )}
      addForm={
        <AddRow
          label="Create button role"
          onAdd={async () => {
            const res = await apiJson(`/api/guilds/${guildId}/resources`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                resource: 'button-roles',
                channel_id,
                label,
                role_id,
                style,
                title: title || undefined,
                description: description || undefined,
              }),
            });
            if (!res.ok) { setMessage(res.error ?? 'Failed'); return; }
            setLabel('');
            setRoleId('');
            setTitle('');
            setDescription('');
            await onReload();
          }}
        >
          <MiniChannelSelect label="Channel" value={channel_id} onChange={setChannelId} />
          <MiniInput label="Button label" value={label} onChange={setLabel} placeholder="Get role" />
          <MiniRoleSelect label="Role" value={role_id} onChange={setRoleId} />
          <MiniSelect label="Style" value={style} onChange={setStyle} options={[...BUTTON_STYLES]} />
          <MiniInput label="Panel title (optional)" value={title} onChange={setTitle} placeholder="Role Menu" />
          <MiniInput label="Panel description (optional)" value={description} onChange={setDescription} placeholder="Click to get your role" />
        </AddRow>
      }
    />
  );
}
