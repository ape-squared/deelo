'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Card } from '@heroui/react';
import { DashButton, DashInput, DashPanel } from '@/components/ui/dashboard-kit';

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
    <DashPanel title={title} desc={desc}>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{emptyText}</p>
      ) : (
        <Card className="overflow-hidden border border-default/40 bg-surface-secondary/30">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-default/40 bg-surface-secondary/50 text-left text-muted">
                  {columns.map((c) => (
                    <th key={c} className="px-4 py-2 font-medium">
                      {c}
                    </th>
                  ))}
                  <th className="w-12 px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={(item as { id?: number }).id ?? i} className="border-b border-default/30">
                    {renderRow(item).map((cell, j) => (
                      <td key={j} className="px-4 py-2 font-mono text-xs">
                        {cell}
                      </td>
                    ))}
                    <td className="px-4 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        isIconOnly
                        className="text-danger"
                        isDisabled={deleting === ((item as { id?: number }).id ?? JSON.stringify(item))}
                        onPress={() => del(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Card className="border border-default/40 bg-surface-secondary/30 p-4">{addForm}</Card>
    </DashPanel>
  );
}

export function AddRow({
  onAdd,
  children,
  label = 'Add',
}: {
  onAdd: () => Promise<void>;
  children: React.ReactNode;
  label?: string;
}) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      <DashButton
        variant="secondary"
        className="text-sm"
        isDisabled={adding}
        onPress={async () => {
          setAdding(true);
          await onAdd();
          setAdding(false);
        }}
      >
        <Plus className="h-4 w-4" />
        {adding ? 'Adding...' : label}
      </DashButton>
    </div>
  );
}

export function MiniInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted">{label}</label>
      <DashInput value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function MiniSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted">{label}</label>
      <select className="input text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
