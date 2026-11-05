import { useState } from 'react';
import { App, Button, Input, Popconfirm, Space, Switch, Tooltip } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../api/client';
import type { DeleteResult, MindsetOption } from '../api/types';

/** Inline editor for a mindset question's answer options. */
export default function MindsetOptionsEditor({ questionId, options }: { questionId: number; options: MindsetOption[] }) {
  const { message, notification } = App.useApp();
  const qc = useQueryClient();
  const [newLabel, setNewLabel] = useState('');
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const refresh = () => qc.invalidateQueries({ queryKey: ['master', 'mindset-questions'] });

  const add = useMutation({
    mutationFn: (label: string) => api.post(`/admin/mindset-questions/${questionId}/options`, { label }),
    onSuccess: () => { setNewLabel(''); message.success('Option added'); refresh(); },
    onError: (e) => message.error(errorMessage(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => api.put(`/admin/mindset-options/${id}`, body),
    onSuccess: () => { message.success('Option updated'); refresh(); },
    onError: (e) => message.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.del<DeleteResult>(`/admin/mindset-options/${id}`),
    onSuccess: (r) => {
      if (r.data.deleted) message.success('Option deleted');
      else notification.info({ message: 'Option deactivated', description: `It was chosen by ${r.data.usageCount} user(s), so it was hidden instead of deleted.` });
      refresh();
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  const saveLabel = (o: MindsetOption) => {
    const v = (drafts[o.id] ?? o.label).trim();
    if (v && v !== o.label) update.mutate({ id: o.id, body: { label: v } });
  };

  return (
    <div style={{ padding: '6px 8px 10px 52px' }}>
      <div className="section-title" style={{ marginTop: 4 }}>Answer options</div>
      <Space direction="vertical" style={{ width: '100%', maxWidth: 560 }} size={8}>
        {options.map((o) => (
          <div key={o.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Input
              value={drafts[o.id] ?? o.label}
              onChange={(e) => setDrafts((d) => ({ ...d, [o.id]: e.target.value }))}
              onBlur={() => saveLabel(o)}
              onPressEnter={() => saveLabel(o)}
              maxLength={60}
              style={{ opacity: o.isActive ? 1 : 0.55 }}
            />
            <Tooltip title={o.isActive ? 'Shown in app' : 'Hidden from app'}>
              <Switch size="small" checked={o.isActive} onChange={(v) => update.mutate({ id: o.id, body: { isActive: v } })} />
            </Tooltip>
            <Popconfirm title="Delete this option?" description="If users already chose it, it will be hidden instead." onConfirm={() => remove.mutate(o.id)} okText="Delete" okButtonProps={{ danger: true }}>
              <Button type="text" danger icon={<DeleteOutlined />} aria-label="Delete option" />
            </Popconfirm>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            placeholder="Add an option…"
            value={newLabel}
            maxLength={60}
            onChange={(e) => setNewLabel(e.target.value)}
            onPressEnter={() => newLabel.trim() && add.mutate(newLabel.trim())}
          />
          <Button icon={<PlusOutlined />} loading={add.isPending} disabled={!newLabel.trim()} onClick={() => add.mutate(newLabel.trim())}>
            Add
          </Button>
        </div>
      </Space>
    </div>
  );
}
