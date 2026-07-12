'use client';

import { useMemo, useState } from 'react';
import { Loader2, MessageSquare, Plus, Send, Trash2 } from 'lucide-react';
import { AdminCard } from '@/components/admin/ui';
import {
  colorToHex,
  embedSummary,
  parseEmbedColor,
  type EmbedField,
  type EmbedTemplate,
} from '@/lib/embed-template';
import type { OfficialChannelEmbed, OfficialDiscordEmbedsSettings } from '@/lib/official-server-embeds';
import { DEFAULT_OFFICIAL_DISCORD_EMBEDS } from '@/lib/official-server-embeds';

type SyncResult = { id: string; channel: string; ok: boolean; message_id?: string; error?: string };

export function OfficialDiscordEmbedsManager({
  initialSettings,
  onMessage,
}: {
  initialSettings?: OfficialDiscordEmbedsSettings;
  onMessage: (msg: string, isError?: boolean) => void;
}) {
  const [settings, setSettings] = useState<OfficialDiscordEmbedsSettings>(
    initialSettings ?? DEFAULT_OFFICIAL_DISCORD_EMBEDS,
  );
  const [selectedId, setSelectedId] = useState<string>(settings.channels[0]?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastResults, setLastResults] = useState<SyncResult[] | null>(null);

  const selected = useMemo(
    () => settings.channels.find((c) => c.id === selectedId) ?? null,
    [settings.channels, selectedId],
  );

  function updateChannel(id: string, patch: Partial<OfficialChannelEmbed>) {
    setSettings((prev) => ({
      ...prev,
      channels: prev.channels.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }

  function updateEmbed(id: string, patch: Partial<EmbedTemplate>) {
    setSettings((prev) => ({
      ...prev,
      channels: prev.channels.map((c) =>
        c.id === id ? { ...c, embed: { ...c.embed, ...patch } } : c,
      ),
    }));
  }

  function updateField(channelId: string, index: number, patch: Partial<EmbedField>) {
    setSettings((prev) => ({
      ...prev,
      channels: prev.channels.map((c) => {
        if (c.id !== channelId) return c;
        const fields = [...(c.embed.fields ?? [])];
        fields[index] = { ...fields[index], ...patch };
        return { ...c, embed: { ...c.embed, fields } };
      }),
    }));
  }

  function addField(channelId: string) {
    setSettings((prev) => ({
      ...prev,
      channels: prev.channels.map((c) => {
        if (c.id !== channelId) return c;
        return {
          ...c,
          embed: {
            ...c.embed,
            fields: [...(c.embed.fields ?? []), { name: 'Field name', value: 'Field value', inline: false }],
          },
        };
      }),
    }));
  }

  function removeField(channelId: string, index: number) {
    setSettings((prev) => ({
      ...prev,
      channels: prev.channels.map((c) => {
        if (c.id !== channelId) return c;
        return {
          ...c,
          embed: { ...c.embed, fields: (c.embed.fields ?? []).filter((_, i) => i !== index) },
        };
      }),
    }));
  }

  async function save() {
    setSaving(true);
    const res = await fetch('/api/admin/official-discord', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    });
    setSaving(false);
    const data = await res.json();
    if (!res.ok) {
      onMessage(data.error ?? 'Failed to save', true);
      return;
    }
    setSettings(data.settings);
    onMessage('Official server embeds saved');
  }

  async function pushToDiscord() {
    setSyncing(true);
    setLastResults(null);
    const res = await fetch('/api/admin/official-discord', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    });
    setSyncing(false);
    const data = await res.json();
    if (!res.ok) {
      onMessage(data.error ?? 'Failed to push to Discord', true);
      return;
    }
    setSettings(data.settings);
    setLastResults(data.results ?? []);
    const failed = (data.results as SyncResult[] | undefined)?.filter((r) => !r.ok).length ?? 0;
    onMessage(
      failed
        ? `Pushed with ${failed} error(s) — check results below`
        : 'Embeds pushed to Discord',
      failed > 0,
    );
  }

  return (
    <div className="space-y-6">
      <AdminCard
        title="Official Discord server embeds"
        desc="Edit the pinned embeds in #rules, #bot-help, #commands, and other official channels. Save drafts here, then push to Discord."
      >
        <div className="p-5 lg:p-6 space-y-4 border-b border-border">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Official guild ID</label>
              <input
                className="input font-mono text-sm"
                value={settings.guild_id}
                onChange={(e) => setSettings((s) => ({ ...s, guild_id: e.target.value.trim() }))}
              />
            </div>
            <div className="flex items-end gap-2">
              <button type="button" className="btn-secondary text-sm" disabled={saving} onClick={save}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </button>
              <button type="button" className="btn-primary text-sm" disabled={syncing} onClick={pushToDiscord}>
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Push to Discord
              </button>
            </div>
          </div>
          <p className="text-xs text-muted">
            Bot owners can also run <code className="font-mono">,deelorun update</code> in the official server to refresh from these saved templates.
          </p>
        </div>

        <div className="grid gap-0 xl:grid-cols-[220px_1fr_300px]">
          <div className="border-b xl:border-b-0 xl:border-r border-border p-4 space-y-1">
            <p className="text-xs font-medium text-muted uppercase tracking-wide px-2 mb-2">Channels</p>
            {settings.channels.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setSelectedId(ch.id)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  selectedId === ch.id ? 'bg-accent/15 text-accent' : 'hover:bg-white/5'
                }`}
              >
                <p className="font-medium">{ch.label}</p>
                <p className="text-xs text-muted font-mono">#{ch.channel}</p>
                {ch.message_id && <p className="text-[10px] text-muted mt-0.5 truncate">msg {ch.message_id}</p>}
              </button>
            ))}
          </div>

          <div className="p-5 lg:p-6 space-y-4 border-b xl:border-b-0 xl:border-r border-border">
            {!selected ? (
              <p className="text-sm text-muted">Select a channel embed to edit.</p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Label</label>
                    <input
                      className="input text-sm"
                      value={selected.label}
                      onChange={(e) => updateChannel(selected.id, { label: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Channel name</label>
                    <input
                      className="input font-mono text-sm"
                      value={selected.channel}
                      onChange={(e) => updateChannel(selected.id, { channel: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Message content (optional)</label>
                  <textarea
                    className="input min-h-[72px] text-sm"
                    value={selected.content ?? ''}
                    onChange={(e) => updateChannel(selected.id, { content: e.target.value || undefined })}
                    placeholder="Plain text above the embed"
                  />
                </div>

                <div>
                  <label className="label">Embed title</label>
                  <input
                    className="input text-sm"
                    value={selected.embed.title ?? ''}
                    onChange={(e) => updateEmbed(selected.id, { title: e.target.value || undefined })}
                    maxLength={256}
                  />
                </div>

                <div>
                  <label className="label">Embed description</label>
                  <textarea
                    className="input min-h-[140px] text-sm"
                    value={selected.embed.description ?? ''}
                    onChange={(e) => updateEmbed(selected.id, { description: e.target.value })}
                    maxLength={4096}
                  />
                </div>

                <div>
                  <label className="label">Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-transparent"
                      value={colorToHex(selected.embed.color ?? parseEmbedColor('#0047ff'))}
                      onChange={(e) => updateEmbed(selected.id, { color: parseEmbedColor(e.target.value) })}
                    />
                    <input
                      className="input max-w-[120px] font-mono text-sm uppercase"
                      value={selected.embed.color != null ? colorToHex(selected.embed.color).replace('#', '') : ''}
                      onChange={(e) => updateEmbed(selected.id, { color: parseEmbedColor(e.target.value) })}
                      placeholder="0047FF"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="label mb-0">Fields</label>
                    <button type="button" className="text-xs text-accent hover:underline inline-flex items-center gap-1" onClick={() => addField(selected.id)}>
                      <Plus className="h-3 w-3" />
                      Add field
                    </button>
                  </div>
                  {(selected.embed.fields ?? []).map((field, i) => (
                    <div key={i} className="rounded-xl border border-border bg-background/50 p-3 space-y-2">
                      <div className="flex gap-2">
                        <input
                          className="input text-sm flex-1"
                          value={field.name}
                          onChange={(e) => updateField(selected.id, i, { name: e.target.value })}
                          placeholder="Name"
                          maxLength={256}
                        />
                        <button type="button" className="text-red-400 p-2" onClick={() => removeField(selected.id, i)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <textarea
                        className="input text-sm min-h-[60px]"
                        value={field.value}
                        onChange={(e) => updateField(selected.id, i, { value: e.target.value })}
                        placeholder="Value"
                        maxLength={1024}
                      />
                      <label className="flex items-center gap-2 text-xs text-muted">
                        <input
                          type="checkbox"
                          checked={!!field.inline}
                          onChange={(e) => updateField(selected.id, i, { inline: e.target.checked })}
                        />
                        Inline
                      </label>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="p-5 lg:p-6">
            <p className="text-xs font-medium text-muted uppercase tracking-wide mb-4">Preview</p>
            {selected ? (
              <DiscordEmbedPreview template={selected.embed} content={selected.content} />
            ) : (
              <p className="text-sm text-muted">No embed selected.</p>
            )}
          </div>
        </div>
      </AdminCard>

      {lastResults && (
        <AdminCard title="Last push results" desc="Per-channel sync status from Discord.">
          <div className="p-5 space-y-2">
            {lastResults.map((r) => (
              <div
                key={r.id}
                className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm ${
                  r.ok ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
                }`}
              >
                <MessageSquare className={`h-4 w-4 mt-0.5 shrink-0 ${r.ok ? 'text-green-400' : 'text-red-400'}`} />
                <div>
                  <p className="font-medium">
                    #{r.channel}
                    <span className="text-muted font-normal ml-2">({r.id})</span>
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {r.ok ? `Updated message ${r.message_id}` : r.error}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </AdminCard>
      )}

      {selected && (
        <p className="text-xs text-muted px-1">
          Summary: {embedSummary(selected.embed)}
        </p>
      )}
    </div>
  );
}

function DiscordEmbedPreview({ template, content }: { template: EmbedTemplate; content?: string }) {
  const color = colorToHex(template.color ?? parseEmbedColor('#0047ff'));
  return (
    <div className="space-y-2">
      {content && <p className="text-sm text-[#dbdee1] whitespace-pre-wrap">{content}</p>}
      <div className="rounded-lg bg-[#2b2d31] p-4 text-[#dbdee1] text-sm max-w-full overflow-hidden">
        <div className="flex gap-3 min-w-0">
          <div className="w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <div className="min-w-0 flex-1 space-y-2">
            {template.title && <p className="font-semibold text-[#00a8fc] break-words">{template.title}</p>}
            {template.description && (
              <p className="whitespace-pre-wrap break-words text-[#dbdee1]/90">{template.description}</p>
            )}
            {template.fields && template.fields.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-3 pt-1">
                {template.fields.map((f, i) => (
                  <div key={i} className={f.inline ? 'sm:col-span-1' : 'sm:col-span-3'}>
                    <p className="text-xs font-semibold mb-0.5">{f.name || 'Field'}</p>
                    <p className="text-xs whitespace-pre-wrap break-words text-[#dbdee1]/80">{f.value || '—'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
