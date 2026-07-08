'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Send, Trash2 } from 'lucide-react';
import type { SavedEmbedRow } from '@/lib/guild-types';
import {
  EMPTY_EMBED,
  colorToHex,
  embedSummary,
  parseEmbedColor,
  type EmbedField,
  type EmbedTemplate,
} from '@/lib/embed-template';
import { getLimit } from '@/lib/plan-limits';
import type { PlanTier } from '@/lib/guild-settings';
import { ChannelSelect } from '@/components/dashboard/discord-resources';
import { dashboardRedeemPath } from '@/lib/dashboard-paths';

export function EmbedsTab({
  guildId,
  items,
  plan,
  onReload,
  setMessage,
}: {
  guildId: string;
  items: SavedEmbedRow[];
  plan: PlanTier;
  onReload: () => Promise<void>;
  setMessage: (m: string) => void;
}) {
  const isPremium = plan !== 'free';
  const maxEmbeds = getLimit(plan, 'maxSavedEmbeds');
  const [selectedId, setSelectedId] = useState<number | 'new' | null>(items[0]?.id ?? null);
  const [draft, setDraft] = useState<EmbedTemplate>(EMPTY_EMBED);
  const [draftName, setDraftName] = useState('');
  const [saving, setSaving] = useState(false);
  const [sendChannel, setSendChannel] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const selected = useMemo(
    () => (typeof selectedId === 'number' ? items.find((e) => e.id === selectedId) : null),
    [items, selectedId],
  );

  useEffect(() => {
    if (typeof selectedId === 'number') {
      const row = items.find((e) => e.id === selectedId);
      if (row) {
        setDraftName(row.name);
        setDraft({ ...EMPTY_EMBED, ...row.embed_json, fields: row.embed_json.fields ?? [] });
      }
    }
  }, [selectedId, items]);

  function loadEmbed(row: SavedEmbedRow) {
    setSelectedId(row.id);
    setDraftName(row.name);
    setDraft({ ...EMPTY_EMBED, ...row.embed_json, fields: row.embed_json.fields ?? [] });
  }

  function startNew() {
    if (items.length >= maxEmbeds) {
      setMessage(`Embed limit reached (${maxEmbeds}). Upgrade for more.`);
      return;
    }
    setSelectedId('new');
    setDraftName('');
    setDraft({ ...EMPTY_EMBED });
  }

  function updateDraft(patch: Partial<EmbedTemplate>) {
    setDraft((d) => ({ ...d, ...patch }));
  }

  function updateField(index: number, patch: Partial<EmbedField>) {
    setDraft((d) => {
      const fields = [...(d.fields ?? [])];
      fields[index] = { ...fields[index], ...patch };
      return { ...d, fields };
    });
  }

  function addField() {
    if (!isPremium) return;
    setDraft((d) => ({
      ...d,
      fields: [...(d.fields ?? []), { name: 'Field name', value: 'Field value', inline: false }],
    }));
  }

  function removeField(index: number) {
    setDraft((d) => ({
      ...d,
      fields: (d.fields ?? []).filter((_, i) => i !== index),
    }));
  }

  async function save() {
    const name = draftName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!name) {
      setMessage('Embed name is required (letters, numbers, - and _).');
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/guilds/${guildId}/embeds`, {
      method: selectedId === 'new' ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        selectedId === 'new'
          ? { name, embed_json: draft }
          : { id: selectedId, name, embed_json: draft },
      ),
    });
    setSaving(false);
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? 'Failed to save embed');
      return;
    }
    setMessage('Embed saved');
    await onReload();
    if (data.embed?.id) setSelectedId(data.embed.id);
    setTimeout(() => setMessage(''), 3000);
  }

  async function remove(id: number) {
    await fetch(`/api/guilds/${guildId}/embeds?id=${id}`, { method: 'DELETE' });
    if (selectedId === id) {
      setSelectedId(null);
      setDraft({ ...EMPTY_EMBED });
      setDraftName('');
    }
    await onReload();
    setMessage('Embed deleted');
    setTimeout(() => setMessage(''), 3000);
  }

  async function send() {
    if (!isPremium) return;
    const name = draftName.trim().toLowerCase();
    if (!name || !sendChannel) {
      setMessage('Pick a channel and save the embed first.');
      return;
    }
    setSending(true);
    const res = await fetch(`/api/guilds/${guildId}/embeds/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, channel_id: sendChannel, embed_json: draft }),
    });
    setSending(false);
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? 'Failed to send embed');
      return;
    }
    setMessage('Embed sent to Discord');
    setTimeout(() => setMessage(''), 3000);
  }

  const previewColor = colorToHex(draft.color ?? parseEmbedColor('#5865F2'));

  return (
    <div className="space-y-6">
      <div className="card p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Embed builder</h2>
            <p className="mt-1 text-sm text-muted">
              Create reusable embeds for announcements and posts. Use <code className="font-mono text-xs">,embed send #channel name</code> in Discord or send from here.
            </p>
            <p className="mt-2 text-xs text-muted">
              {items.length} / {maxEmbeds} saved embeds
              {!isPremium && (
                <> · <Link href={dashboardRedeemPath(guildId)} className="text-accent hover:underline">Redeem a code</Link> for fields, images, and send</>
              )}
            </p>
          </div>
          <button type="button" className="btn-primary text-sm py-2" onClick={startNew} disabled={items.length >= maxEmbeds}>
            <Plus className="h-4 w-4" />
            New embed
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[240px_1fr_320px]">
        <div className="card p-4 space-y-2">
          <p className="text-xs font-medium text-muted uppercase tracking-wide px-2">Saved</p>
          {items.length === 0 ? (
            <p className="text-sm text-muted px-2 py-4">No embeds yet.</p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => loadEmbed(item)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  selectedId === item.id ? 'bg-accent/15 text-accent' : 'hover:bg-white/5'
                }`}
              >
                <p className="font-mono font-medium">{item.name}</p>
                <p className="text-xs text-muted truncate mt-0.5">{embedSummary(item.embed_json)}</p>
              </button>
            ))
          )}
        </div>

        <div className="card p-6 space-y-5">
          {selectedId == null ? (
            <p className="text-sm text-muted">Select an embed or create a new one.</p>
          ) : (
            <>
              <div>
                <label className="label">Name</label>
                <input
                  className="input font-mono text-sm max-w-xs"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="welcome"
                />
              </div>

              <div>
                <label className="label">Title</label>
                <input className="input text-sm" value={draft.title ?? ''} onChange={(e) => updateDraft({ title: e.target.value || undefined })} maxLength={256} />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  className="input min-h-[120px] text-sm"
                  value={draft.description ?? ''}
                  onChange={(e) => updateDraft({ description: e.target.value })}
                  maxLength={4096}
                />
              </div>

              <div>
                <label className="label">Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-transparent"
                    value={previewColor}
                    onChange={(e) => updateDraft({ color: parseEmbedColor(e.target.value) })}
                  />
                  <input
                    className="input max-w-[120px] font-mono text-sm uppercase"
                    value={draft.color != null ? colorToHex(draft.color).replace('#', '') : ''}
                    onChange={(e) => updateDraft({ color: parseEmbedColor(e.target.value) })}
                    placeholder="5865F2"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!draft.timestamp} onChange={(e) => updateDraft({ timestamp: e.target.checked })} />
                Include timestamp
              </label>

              {isPremium ? (
                <>
                  <div>
                    <label className="label">URL (title link)</label>
                    <input className="input text-sm" value={draft.url ?? ''} onChange={(e) => updateDraft({ url: e.target.value || undefined })} placeholder="https://" />
                  </div>
                  <div>
                    <label className="label">Image URL</label>
                    <input className="input text-sm" value={draft.image ?? ''} onChange={(e) => updateDraft({ image: e.target.value || undefined })} placeholder="https://" />
                  </div>
                  <div>
                    <label className="label">Thumbnail URL</label>
                    <input className="input text-sm" value={draft.thumbnail ?? ''} onChange={(e) => updateDraft({ thumbnail: e.target.value || undefined })} placeholder="https://" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label">Author name</label>
                      <input className="input text-sm" value={draft.author?.name ?? ''} onChange={(e) => updateDraft({ author: { ...draft.author, name: e.target.value || undefined } })} />
                    </div>
                    <div>
                      <label className="label">Footer text</label>
                      <input className="input text-sm" value={draft.footer?.text ?? ''} onChange={(e) => updateDraft({ footer: { ...draft.footer, text: e.target.value || undefined } })} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="label mb-0">Fields</label>
                      <button type="button" className="text-xs text-accent hover:underline" onClick={addField}>+ Add field</button>
                    </div>
                    {(draft.fields ?? []).map((field, i) => (
                      <div key={i} className="rounded-xl border border-border bg-background/50 p-3 space-y-2">
                        <div className="flex gap-2">
                          <input className="input text-sm flex-1" value={field.name} onChange={(e) => updateField(i, { name: e.target.value })} placeholder="Name" maxLength={256} />
                          <button type="button" className="text-red-400 p-2" onClick={() => removeField(i)}><Trash2 className="h-4 w-4" /></button>
                        </div>
                        <textarea className="input text-sm min-h-[60px]" value={field.value} onChange={(e) => updateField(i, { value: e.target.value })} placeholder="Value" maxLength={1024} />
                        <label className="flex items-center gap-2 text-xs text-muted">
                          <input type="checkbox" checked={!!field.inline} onChange={(e) => updateField(i, { inline: e.target.checked })} />
                          Inline
                        </label>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
                  <p className="font-medium">Premium fields locked</p>
                  <p className="text-muted mt-1">Upgrade for URL, images, author, footer, fields, and dashboard send.</p>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <button type="button" className="btn-primary text-sm py-2" onClick={save} disabled={saving}>
                  {saving ? 'Saving…' : 'Save embed'}
                </button>
                {typeof selectedId === 'number' && (
                  <button type="button" className="text-sm text-red-400 hover:text-red-300 px-3" onClick={() => remove(selectedId)}>
                    Delete
                  </button>
                )}
              </div>

              {isPremium && selectedId !== 'new' && draftName && (
                <div className="rounded-xl border border-border bg-background/50 p-4 space-y-3">
                  <p className="text-sm font-medium">Send to Discord</p>
                  <ChannelSelect value={sendChannel} onChange={setSendChannel} />
                  <button type="button" className="btn-primary text-sm py-2" onClick={send} disabled={sending || !sendChannel}>
                    <Send className="h-4 w-4" />
                    {sending ? 'Sending…' : 'Send embed'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="card p-6">
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-4">Preview</p>
          <DiscordEmbedPreview template={draft} />
        </div>
      </div>
    </div>
  );
}

function DiscordEmbedPreview({ template }: { template: EmbedTemplate }) {
  const color = colorToHex(template.color ?? parseEmbedColor('#5865F2'));
  return (
    <div className="rounded-lg bg-[#2b2d31] p-4 text-[#dbdee1] text-sm max-w-full overflow-hidden">
      <div className="flex gap-3 min-w-0">
        <div className="w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <div className="min-w-0 flex-1 space-y-2">
          {template.author?.name && (
            <p className="text-xs font-semibold">{template.author.name}</p>
          )}
          {template.title && (
            <p className="font-semibold text-[#00a8fc] break-words">{template.title}</p>
          )}
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
          {template.image && (
            <div className="mt-2 rounded overflow-hidden bg-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={template.image} alt="" className="max-h-48 w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          )}
          {template.thumbnail && (
            <p className="text-xs text-muted">Thumbnail set</p>
          )}
          {(template.footer?.text || template.timestamp) && (
            <p className="text-[10px] text-[#949ba4] pt-1">
              {template.footer?.text}
              {template.footer?.text && template.timestamp ? ' · ' : ''}
              {template.timestamp ? 'Just now' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
