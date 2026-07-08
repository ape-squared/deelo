'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminCard, AdminEmpty, AdminTable } from '@/components/admin/ui';
import {
  FEATURE_CATEGORY_LABELS,
  FEATURE_STATUS_LABELS,
  type FeatureRequest,
  type FeatureStatus,
} from '@/lib/feature-requests';
import { ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';

export function FeatureRequestsManager({ apiEndpoint = '/api/admin/feature-requests' }: { apiEndpoint?: string }) {
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FeatureRequest | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(apiEndpoint);
    if (res.ok) {
      const data = await res.json();
      setRequests(data.requests ?? []);
    }
    setLoading(false);
  }, [apiEndpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(updates: Partial<FeatureRequest>) {
    if (!selected) return;
    setSaving(true);
    const res = await fetch(apiEndpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected.id, ...updates }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setSelected(data.request);
      setRequests((prev) => prev.map((r) => (r.id === data.request.id ? data.request : r)));
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <AdminCard>
          {requests.length ? (
            <AdminTable>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Votes</th>
                  <th>Status</th>
                  <th>Category</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className={`cursor-pointer ${selected?.id === r.id ? 'bg-accent/5' : ''}`}
                  >
                    <td className="font-medium">{r.title}</td>
                    <td className="tabular-nums">{r.vote_score}</td>
                    <td>{FEATURE_STATUS_LABELS[r.status]}</td>
                    <td className="text-muted">{FEATURE_CATEGORY_LABELS[r.category]}</td>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
          ) : (
            <AdminEmpty message="No feature requests yet." />
          )}
        </AdminCard>
      </div>

      <div className="lg:col-span-2">
        {selected ? (
          <AdminCard className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">{selected.title}</h3>
              <Link href={`/suggestions/${selected.slug}`} className="btn-ghost p-1" target="_blank">
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
            <p className="text-xs text-muted">by {selected.author_username} · {new Date(selected.created_at).toLocaleString()}</p>
            <p className="text-sm whitespace-pre-wrap">{selected.body}</p>

            <label className="label">Status</label>
            <select
              className="input w-full"
              value={selected.status}
              onChange={(e) => void save({ status: e.target.value as FeatureStatus })}
              disabled={saving}
            >
              {(Object.keys(FEATURE_STATUS_LABELS) as FeatureStatus[]).map((s) => (
                <option key={s} value={s}>{FEATURE_STATUS_LABELS[s]}</option>
              ))}
            </select>

            <label className="label">Team response</label>
            <textarea
              className="input min-h-[100px] w-full resize-y"
              defaultValue={selected.staff_response ?? ''}
              onBlur={(e) => {
                if (e.target.value !== (selected.staff_response ?? '')) {
                  void save({ staff_response: e.target.value });
                }
              }}
            />

            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.pinned}
                  onChange={(e) => void save({ pinned: e.target.checked })}
                />
                Pinned
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.hidden}
                  onChange={(e) => void save({ hidden: e.target.checked })}
                />
                Hidden
              </label>
            </div>
          </AdminCard>
        ) : (
          <AdminCard className="text-center text-muted text-sm py-12">
            Select a request to review
          </AdminCard>
        )}
      </div>
    </div>
  );
}
