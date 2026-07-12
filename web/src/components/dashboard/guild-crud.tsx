'use client';

import { useState } from 'react';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';

export function CrudList<T extends object>({
  title,
  desc,
  items,
  columns,
  renderRow,
  onDelete,
  onEdit,
  renderEditForm,
  rowKey,
  addForm,
  emptyText = 'None configured yet.',
}: {
  title: string;
  desc?: string;
  items: T[];
  columns: string[];
  renderRow: (item: T) => React.ReactNode[];
  onDelete: (item: T) => Promise<void>;
  onEdit?: (item: T, values: Record<string, string>) => Promise<void>;
  renderEditForm?: (
    item: T,
    values: Record<string, string>,
    setValues: (next: Record<string, string>) => void,
  ) => React.ReactNode;
  rowKey?: (item: T) => string;
  addForm: React.ReactNode;
  emptyText?: string;
}) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  const keyOf = rowKey ?? ((item: T) => String((item as { id?: number }).id ?? JSON.stringify(item)));

  async function del(item: T) {
    const key = keyOf(item);
    setDeleting(key);
    await onDelete(item);
    setDeleting(null);
  }

  function startEdit(item: T) {
    setEditingKey(keyOf(item));
    setEditValues({});
  }

  async function saveEdit(item: T) {
    if (!onEdit) return;
    setSavingEdit(true);
    await onEdit(item, editValues);
    setSavingEdit(false);
    setEditingKey(null);
    setEditValues({});
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
                <th className="px-4 py-2 w-24" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const rowId = keyOf(item);
                const isEditing = editingKey === rowId;
                if (isEditing && renderEditForm && onEdit) {
                  return (
                    <tr key={rowId ?? i} className="border-b border-border/50 bg-accent/5">
                      <td colSpan={columns.length + 1} className="px-4 py-4">
                        <div className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {renderEditForm(item, editValues, setEditValues)}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="btn-primary text-xs py-1.5 px-3"
                              disabled={savingEdit}
                              onClick={() => saveEdit(item)}
                            >
                              <Check className="h-3.5 w-3.5" />
                              {savingEdit ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              type="button"
                              className="btn-ghost text-xs py-1.5 px-3"
                              disabled={savingEdit}
                              onClick={() => { setEditingKey(null); setEditValues({}); }}
                            >
                              <X className="h-3.5 w-3.5" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={rowId ?? i} className="border-b border-border/50">
                    {renderRow(item).map((cell, j) => <td key={j} className="px-4 py-2 text-xs">{cell}</td>)}
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        {onEdit && renderEditForm ? (
                          <button type="button" onClick={() => startEdit(item)} className="text-muted hover:text-foreground p-1" title="Edit">
                            <Pencil className="h-4 w-4" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => del(item)}
                          disabled={deleting === rowId}
                          className="text-red-400 hover:text-red-300 p-1"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="rounded-xl border border-border bg-background/50 p-4">{addForm}</div>
    </div>
  );
}

export type AddRowResult = { ok: true; message?: string } | { ok: false; error: string };

export function AddRow({
  onAdd,
  children,
  label = 'Add',
}: {
  onAdd: () => Promise<AddRowResult | void>;
  children: React.ReactNode;
  label?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  async function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setFeedback(null);
    setAdding(true);
    try {
      const result = await onAdd();
      if (!result) return;
      if (result.ok) {
        setFeedback({ type: 'success', text: result.message ?? 'Saved successfully.' });
      } else {
        setFeedback({ type: 'error', text: result.error });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Something went wrong. Try again.',
      });
    } finally {
      setAdding(false);
    }
  }

  return (
    <div
      className="space-y-3"
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.preventDefault();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      <button
        type="button"
        className="btn-secondary text-sm"
        disabled={adding}
        onClick={handleAdd}
      >
        <Plus className="h-4 w-4" />
        {adding ? 'Working…' : label}
      </button>
      {feedback ? (
        <p
          className={`text-sm rounded-lg border px-3 py-2 ${
            feedback.type === 'error'
              ? 'border-red-500/30 bg-red-500/10 text-red-300'
              : 'border-green-500/30 bg-green-500/10 text-green-300'
          }`}
          role="status"
        >
          {feedback.text}
        </p>
      ) : null}
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
