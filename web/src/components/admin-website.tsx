'use client';

import { useState } from 'react';
import {
  Globe, Megaphone, ScrollText, Plus, Loader2, Pencil, Trash2, Eye, EyeOff, Pin, Bell,
} from 'lucide-react';
import { AdminCard, AdminEmpty, AdminStatCard, AdminTable } from '@/components/admin/ui';
import type { SiteAnnouncement, SiteChangelogEntry, ChangelogCategory } from '@/lib/site-content';
import { CHANGELOG_CATEGORY_LABELS } from '@/lib/site-content';

type Tab = 'announcements' | 'changelog' | 'settings';

export function WebsiteManager({
  initialAnnouncements,
  initialChangelog,
  initialSettings,
}: {
  initialAnnouncements: SiteAnnouncement[];
  initialChangelog: SiteChangelogEntry[];
  initialSettings: Record<string, unknown>;
}) {
  const [tab, setTab] = useState<Tab>('announcements');
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [changelog, setChangelog] = useState(initialChangelog);
  const [discord, setDiscord] = useState({
    server_id: String((initialSettings.discord as { server_id?: string })?.server_id ?? '1523831534799425576'),
    invite_url: String((initialSettings.discord as { invite_url?: string })?.invite_url ?? 'https://discord.gg/deelo'),
    widget_enabled: (initialSettings.discord as { widget_enabled?: boolean })?.widget_enabled !== false,
  });
  const [hero, setHero] = useState({
    badge: String((initialSettings.hero as { badge?: string })?.badge ?? 'Deelo v2 — live dashboard sync'),
    show_latest_changelog: (initialSettings.hero as { show_latest_changelog?: boolean })?.show_latest_changelog !== false,
  });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingAnn, setEditingAnn] = useState<Partial<SiteAnnouncement> | null>(null);
  const [editingLog, setEditingLog] = useState<Partial<SiteChangelogEntry> | null>(null);

  const publishedAnn = announcements.filter((a) => a.status === 'published').length;
  const publishedLog = changelog.filter((c) => c.status === 'published').length;

  function flash(msg: string, isError = false) {
    setMessage(isError ? `Error: ${msg}` : msg);
    setTimeout(() => setMessage(''), 4000);
  }

  async function saveAnnouncement(publish = false) {
    if (!editingAnn?.title?.trim()) return flash('Title required', true);
    setSaving(true);
    const payload = {
      ...editingAnn,
      status: publish ? 'published' : (editingAnn.status ?? 'draft'),
    };
    const res = await fetch('/api/admin/announcements', {
      method: editingAnn.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingAnn.id ? { id: editingAnn.id, ...payload } : payload),
    });
    setSaving(false);
    const data = await res.json();
    if (!res.ok) return flash(data.error ?? 'Save failed', true);
    const saved = data.announcement as SiteAnnouncement;
    setAnnouncements((list) =>
      editingAnn.id ? list.map((a) => (a.id === saved.id ? saved : a)) : [saved, ...list],
    );
    setEditingAnn(null);
    flash(publish ? 'Announcement published' : 'Announcement saved');
  }

  async function saveChangelog(publish = false) {
    if (!editingLog?.title?.trim()) return flash('Title required', true);
    setSaving(true);
    const payload = {
      ...editingLog,
      status: publish ? 'published' : (editingLog.status ?? 'draft'),
    };
    const res = await fetch('/api/admin/changelog', {
      method: editingLog.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingLog.id ? { id: editingLog.id, ...payload } : payload),
    });
    setSaving(false);
    const data = await res.json();
    if (!res.ok) return flash(data.error ?? 'Save failed', true);
    const saved = data.entry as SiteChangelogEntry;
    setChangelog((list) =>
      editingLog.id ? list.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...list],
    );
    setEditingLog(null);
    flash(publish ? 'Changelog published' : 'Changelog saved');
  }

  async function toggleAnnouncementStatus(a: SiteAnnouncement, status: SiteAnnouncement['status']) {
    const res = await fetch('/api/admin/announcements', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: a.id, status }),
    });
    if (res.ok) {
      const { announcement } = await res.json();
      setAnnouncements((list) => list.map((x) => (x.id === a.id ? announcement : x)));
      flash(status === 'published' ? 'Published' : 'Updated');
    }
  }

  async function toggleChangelogStatus(c: SiteChangelogEntry, status: 'draft' | 'published') {
    const res = await fetch('/api/admin/changelog', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id, status }),
    });
    if (res.ok) {
      const { entry } = await res.json();
      setChangelog((list) => list.map((x) => (x.id === c.id ? entry : x)));
      flash(status === 'published' ? 'Published' : 'Unpublished');
    }
  }

  async function deleteAnnouncement(id: number) {
    if (!confirm('Delete this announcement?')) return;
    const res = await fetch(`/api/admin/announcements?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setAnnouncements((list) => list.filter((a) => a.id !== id));
      flash('Deleted');
    }
  }

  async function deleteChangelog(id: number) {
    if (!confirm('Delete this changelog entry?')) return;
    const res = await fetch(`/api/admin/changelog?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setChangelog((list) => list.filter((c) => c.id !== id));
      flash('Deleted');
    }
  }

  async function saveSettings() {
    setSaving(true);
    const [dRes, hRes] = await Promise.all([
      fetch('/api/admin/site-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'discord', value: discord }),
      }),
      fetch('/api/admin/site-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'hero', value: hero }),
      }),
    ]);
    setSaving(false);
    if (dRes.ok && hRes.ok) flash('Website settings saved');
    else flash('Failed to save settings', true);
  }

  const tabs: { id: Tab; label: string; icon: typeof Globe }[] = [
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'changelog', label: 'Changelog', icon: ScrollText },
    { id: 'settings', label: 'Site settings', icon: Globe },
  ];

  return (
    <div className="space-y-8">
      {message && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${message.startsWith('Error') ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-green-500/30 bg-green-500/10 text-green-400'}`}>
          {message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminStatCard label="Published announcements" value={publishedAnn} icon="users" />
        <AdminStatCard label="Published changelog" value={publishedLog} icon="crown" variant="success" />
        <AdminStatCard label="Draft items" value={announcements.filter((a) => a.status === 'draft').length + changelog.filter((c) => c.status === 'draft').length} icon="server" />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${tab === id ? 'bg-accent/15 text-accent border-b-2 border-accent' : 'text-muted hover:text-foreground'}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'announcements' && (
        <>
          <AdminCard title="Write announcement" desc="Published posts appear on /announcements. Banner posts show site-wide.">
            {editingAnn ? (
              <div className="p-5 lg:p-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="label">Title</label>
                    <input className="input" value={editingAnn.title ?? ''} onChange={(e) => setEditingAnn({ ...editingAnn, title: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Slug (URL)</label>
                    <input className="input font-mono text-sm" value={editingAnn.slug ?? ''} onChange={(e) => setEditingAnn({ ...editingAnn, slug: e.target.value })} placeholder="auto-from-title" />
                  </div>
                  <div>
                    <label className="label">Summary (teaser)</label>
                    <input className="input text-sm" value={editingAnn.summary ?? ''} onChange={(e) => setEditingAnn({ ...editingAnn, summary: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Body (supports **bold** and `code`)</label>
                    <textarea className="input min-h-[160px] font-mono text-sm" value={editingAnn.body ?? ''} onChange={(e) => setEditingAnn({ ...editingAnn, body: e.target.value })} />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!editingAnn.pinned} onChange={(e) => setEditingAnn({ ...editingAnn, pinned: e.target.checked })} />
                    Pin to top of announcements
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!editingAnn.show_banner} onChange={(e) => setEditingAnn({ ...editingAnn, show_banner: e.target.checked })} />
                    Show as site-wide banner
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary text-sm" onClick={() => setEditingAnn(null)}>Cancel</button>
                  <button type="button" className="btn-secondary text-sm" disabled={saving} onClick={() => saveAnnouncement(false)}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save draft
                  </button>
                  <button type="button" className="btn-primary text-sm" disabled={saving} onClick={() => saveAnnouncement(true)}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                    Publish
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5">
                <button type="button" className="btn-primary text-sm" onClick={() => setEditingAnn({ title: '', body: '', summary: '', pinned: false, show_banner: false, status: 'draft' })}>
                  <Plus className="h-4 w-4" />
                  New announcement
                </button>
              </div>
            )}
          </AdminCard>

          <AdminCard title="All announcements">
            {announcements.length ? (
              <AdminTable>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Flags</th>
                    <th>Updated</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {announcements.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <p className="font-medium">{a.title}</p>
                        <p className="text-xs text-muted font-mono">/announcements/{a.slug}</p>
                      </td>
                      <td><span className={`badge ${a.status === 'published' ? 'badge-success' : 'badge-muted'} capitalize`}>{a.status}</span></td>
                      <td className="text-xs text-muted">
                        {a.pinned && <span className="inline-flex items-center gap-1 mr-2"><Pin className="h-3 w-3" /> pinned</span>}
                        {a.show_banner && <span className="inline-flex items-center gap-1"><Bell className="h-3 w-3" /> banner</span>}
                      </td>
                      <td className="text-xs text-muted">{new Date(a.updated_at).toLocaleDateString()}</td>
                      <td>
                        <div className="flex gap-1 justify-end">
                          <button type="button" className="btn-ghost p-2" onClick={() => setEditingAnn(a)} title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                          {a.status !== 'published' ? (
                            <button type="button" className="btn-ghost p-2 text-green-400" onClick={() => toggleAnnouncementStatus(a, 'published')} title="Publish"><Eye className="h-3.5 w-3.5" /></button>
                          ) : (
                            <button type="button" className="btn-ghost p-2" onClick={() => toggleAnnouncementStatus(a, 'draft')} title="Unpublish"><EyeOff className="h-3.5 w-3.5" /></button>
                          )}
                          <button type="button" className="btn-ghost p-2 text-red-400" onClick={() => deleteAnnouncement(a.id)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>
            ) : (
              <AdminEmpty message="No announcements yet" />
            )}
          </AdminCard>
        </>
      )}

      {tab === 'changelog' && (
        <>
          <AdminCard title="Write changelog entry" desc="Published entries appear on /changelog and the homepage when enabled.">
            {editingLog ? (
              <div className="p-5 lg:p-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Version (optional)</label>
                    <input className="input font-mono text-sm" value={editingLog.version ?? ''} onChange={(e) => setEditingLog({ ...editingLog, version: e.target.value })} placeholder="2.1.0" />
                  </div>
                  <div>
                    <label className="label">Category</label>
                    <select className="input" value={editingLog.category ?? 'improvement'} onChange={(e) => setEditingLog({ ...editingLog, category: e.target.value as ChangelogCategory })}>
                      {Object.entries(CHANGELOG_CATEGORY_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Title</label>
                    <input className="input" value={editingLog.title ?? ''} onChange={(e) => setEditingLog({ ...editingLog, title: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Body</label>
                    <textarea className="input min-h-[160px] font-mono text-sm" value={editingLog.body ?? ''} onChange={(e) => setEditingLog({ ...editingLog, body: e.target.value })} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary text-sm" onClick={() => setEditingLog(null)}>Cancel</button>
                  <button type="button" className="btn-secondary text-sm" disabled={saving} onClick={() => saveChangelog(false)}>Save draft</button>
                  <button type="button" className="btn-primary text-sm" disabled={saving} onClick={() => saveChangelog(true)}>
                    <Eye className="h-4 w-4" />
                    Publish
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5">
                <button type="button" className="btn-primary text-sm" onClick={() => setEditingLog({ title: '', body: '', category: 'improvement', status: 'draft' })}>
                  <Plus className="h-4 w-4" />
                  New changelog entry
                </button>
              </div>
            )}
          </AdminCard>

          <AdminCard title="All changelog entries">
            {changelog.length ? (
              <AdminTable>
                <thead>
                  <tr>
                    <th>Entry</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {changelog.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <p className="font-medium">{c.version ? `v${c.version} — ` : ''}{c.title}</p>
                        <p className="text-xs text-muted">{c.published_at ? new Date(c.published_at).toLocaleDateString() : 'Not published'}</p>
                      </td>
                      <td><span className="badge badge-muted capitalize">{c.category}</span></td>
                      <td><span className={`badge ${c.status === 'published' ? 'badge-success' : 'badge-muted'}`}>{c.status}</span></td>
                      <td>
                        <div className="flex gap-1 justify-end">
                          <button type="button" className="btn-ghost p-2" onClick={() => setEditingLog(c)}><Pencil className="h-3.5 w-3.5" /></button>
                          {c.status !== 'published' ? (
                            <button type="button" className="btn-ghost p-2 text-green-400" onClick={() => toggleChangelogStatus(c, 'published')}><Eye className="h-3.5 w-3.5" /></button>
                          ) : (
                            <button type="button" className="btn-ghost p-2" onClick={() => toggleChangelogStatus(c, 'draft')}><EyeOff className="h-3.5 w-3.5" /></button>
                          )}
                          <button type="button" className="btn-ghost p-2 text-red-400" onClick={() => deleteChangelog(c.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>
            ) : (
              <AdminEmpty message="No changelog entries yet" />
            )}
          </AdminCard>
        </>
      )}

      {tab === 'settings' && (
        <AdminCard title="Website settings" desc="Discord widget, hero badge, and homepage sync.">
          <div className="p-5 lg:p-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-3">Discord community</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Server ID</label>
                  <input className="input font-mono text-sm" value={discord.server_id} onChange={(e) => setDiscord({ ...discord, server_id: e.target.value })} />
                </div>
                <div>
                  <label className="label">Invite URL</label>
                  <input className="input text-sm" value={discord.invite_url} onChange={(e) => setDiscord({ ...discord, invite_url: e.target.value })} />
                </div>
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" checked={discord.widget_enabled} onChange={(e) => setDiscord({ ...discord, widget_enabled: e.target.checked })} />
                  Show Discord widget on homepage
                </label>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3">Homepage</h3>
              <div className="grid gap-4">
                <div>
                  <label className="label">Hero badge text</label>
                  <input className="input text-sm" value={hero.badge} onChange={(e) => setHero({ ...hero, badge: e.target.value })} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={hero.show_latest_changelog} onChange={(e) => setHero({ ...hero, show_latest_changelog: e.target.checked })} />
                  Show latest changelog on homepage
                </label>
              </div>
            </div>
            <button type="button" className="btn-primary text-sm" disabled={saving} onClick={saveSettings}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save website settings
            </button>
          </div>
        </AdminCard>
      )}
    </div>
  );
}
