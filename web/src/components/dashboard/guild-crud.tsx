'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export function CrudList<T extends { id?: number }>({
  title,
  desc,
  items,
  columns,
  renderRow,
  onDelete,
  addForm,
  emptyText = 'None configured yet.',
}: {
  title: string;
  desc?: string;
  items: T[];
  columns: string[];
  renderRow: (item: T) => React.ReactNode[];
  onDelete: (item: T) => Promise<void>;
  addForm: React.ReactNode;
  emptyText?: string;
}) {
  const [deleting, setDeleting] = useState<number | string | null>(null);

  async function del(item: T) {
    const key = (item as { id?: number }).id ?? JSON.stringify(item);
    setDeleting(key);
    await onDelete(item);
    setDeleting(null);
  }

  return (
    <div className="card p-6 lg:p-8 space-y-5">
      <div>
        <h3 className="font-semibold">{title}</h3>
        {desc && <p className="text-sm text-muted mt-1">{desc}</p>}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{emptyText}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-white/5 text-left text-muted">
                {columns.map((c) => <th key={c} className="px-4 py-2 font-medium">{c}</th>)}
                <th className="px-4 py-2 w-12" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={(item as { id?: number }).id ?? i} className="border-b border-border/50">
                  {renderRow(item).map((cell, j) => <td key={j} className="px-4 py-2 font-mono text-xs">{cell}</td>)}
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => del(item)}
                      disabled={deleting === ((item as { id?: number }).id ?? JSON.stringify(item))}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="rounded-xl border border-border bg-background/50 p-4">{addForm}</div>
    </div>
  );
}

export function AddRow({ onAdd, children, label = 'Add' }: { onAdd: () => Promise<void>; children: React.ReactNode; label?: string }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      <button
        type="button"
        className="btn-secondary text-sm"
        disabled={adding}
        onClick={async () => { setAdding(true); await onAdd(); setAdding(false); }}
      >
        <Plus className="h-4 w-4" />
        {adding ? 'Adding...' : label}
      </button>
    </div>
  );
}

export function MiniInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs text-muted mb-1 block">{label}</label>
      <input className="input text-sm font-mono" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function MiniSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="text-xs text-muted mb-1 block">{label}</label>
      <select className="input text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
