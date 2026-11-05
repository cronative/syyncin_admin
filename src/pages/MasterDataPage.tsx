import { useEffect, useMemo, useState } from 'react';
import {
  Alert, App, Button, Drawer, Form, Input, InputNumber, Popconfirm, Result, Segmented, Select, Space, Switch, Table, Tooltip,
  type TableColumnsType,
} from 'antd';
import { DeleteOutlined, EditOutlined, MinusCircleOutlined, PlusOutlined, SearchOutlined, SwapOutlined } from '@ant-design/icons';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useParams } from 'react-router-dom';
import { api, errorMessage, fieldErrors } from '../api/client';
import type { BaseItem, DeleteResult, MindsetOption } from '../api/types';
import { ICONS, IconTile, PageHeader, StatusTag } from '../components/common';
import MindsetOptionsEditor from '../components/MindsetOptionsEditor';
import { DragHandle, SortableRow } from '../components/SortableTable';
import { MASTER_BY_TYPE, type FieldDef, type MasterType } from '../config/masterData';

type StatusFilter = 'all' | 'active' | 'inactive';

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Industries / cities for selects and filters. */
function useLookup(type: 'industries' | 'cities', enabled: boolean) {
  return useQuery({
    queryKey: ['lookup', type],
    queryFn: () => api.get<BaseItem[]>(`/admin/${type}`, { limit: 100, status: 'all' }),
    enabled,
    staleTime: 60_000,
  });
}

export default function MasterDataPage() {
  const { type = '' } = useParams();
  const cfg = MASTER_BY_TYPE[type] as MasterType | undefined;
  if (!cfg) return <Result status="404" title="Unknown master data type" />;
  return <MasterTable key={cfg.type} cfg={cfg} />;
}

function MasterTable({ cfg }: { cfg: MasterType }) {
  const { message, notification } = App.useApp();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [filterId, setFilterId] = useState<number>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [editing, setEditing] = useState<BaseItem | 'new' | null>(null);
  const [reorder, setReorder] = useState<BaseItem[] | null>(null);
  const q = useDebounced(search.trim());

  useEffect(() => setPage(1), [q, status, filterId]);

  const needsIndustries = cfg.filter === 'industry' || cfg.fields.some((f) => f.kind === 'industry');
  const needsCities = cfg.filter === 'city' || cfg.fields.some((f) => f.kind === 'city');
  const industries = useLookup('industries', needsIndustries);
  const cities = useLookup('cities', needsCities);

  const params = {
    page, limit: pageSize, status, search: q || undefined,
    ...(cfg.filter === 'industry' && filterId ? { industryId: filterId } : {}),
    ...(cfg.filter === 'city' && filterId ? { cityId: filterId } : {}),
  };
  const list = useQuery({
    queryKey: ['master', cfg.type, params],
    queryFn: () => api.get<BaseItem[]>(`/admin/${cfg.type}`, params),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['master', cfg.type] });
    qc.invalidateQueries({ queryKey: ['lookup'] });
    qc.invalidateQueries({ queryKey: ['stats'] });
  };

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => api.patch(`/admin/${cfg.type}/${id}/status`, { isActive }),
    onSuccess: (_r, v) => { message.success(v.isActive ? 'Now visible in the app' : 'Hidden from the app'); invalidate(); },
    onError: (e) => message.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.del<DeleteResult>(`/admin/${cfg.type}/${id}`),
    onSuccess: (r) => {
      if (r.data.deleted) message.success(`${cfg.singular} deleted`);
      else notification.info({ message: `${cfg.singular} deactivated`, description: `It is used by ${r.data.usageCount} record(s), so it was hidden from the app instead of being deleted. Existing user data is kept.` });
      invalidate();
    },
    onError: (e) => message.error(errorMessage(e)),
  });
  const saveOrder = useMutation({
    mutationFn: (ids: number[]) => api.patch(`/admin/${cfg.type}/reorder`, { ids }),
    onSuccess: () => { message.success('Order saved — the app now shows items in this order'); setReorder(null); invalidate(); },
    onError: (e) => message.error(errorMessage(e)),
  });

  const startReorder = async () => {
    try {
      const all = await api.get<BaseItem[]>(`/admin/${cfg.type}`, { page: 1, limit: 100, status: 'all' });
      if ((all.meta?.total ?? 0) > 100) {
        message.warning('Drag reorder supports up to 100 items. Use “Sort order” in the edit form for larger lists.');
        return;
      }
      setReorder(all.data);
    } catch (e) {
      message.error(errorMessage(e));
    }
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!reorder || !over || active.id === over.id) return;
    const from = reorder.findIndex((r) => r.id === active.id);
    const to = reorder.findIndex((r) => r.id === over.id);
    setReorder(arrayMove(reorder, from, to));
  };

  const columns: TableColumnsType<BaseItem> = useMemo(() => {
    const cols: TableColumnsType<BaseItem> = [];
    if (reorder) cols.push({ key: 'drag', width: 48, align: 'center', render: () => <DragHandle /> });
    for (const c of cfg.columns) {
      cols.push({ key: c.key, title: c.title, width: c.width, render: (_v, r) => (c.render ? c.render(r) : String(r[c.key] ?? '')) });
    }
    cols.push({
      key: 'status',
      title: 'Visible in app',
      width: 140,
      render: (_v, r) =>
        reorder ? <StatusTag status={r.isActive ? 'active' : 'inactive'} /> : (
          <Switch
            checked={r.isActive}
            loading={toggle.isPending && toggle.variables?.id === r.id}
            onChange={(v) => toggle.mutate({ id: r.id, isActive: v })}
            aria-label={`Toggle ${String(r[cfg.primary])}`}
          />
        ),
    });
    if (!reorder) {
      cols.push({ key: 'updated', title: 'Updated', width: 150, render: (_v, r) => <Tooltip title={dayjs(r.updatedAt).format('D MMM YYYY, HH:mm')}><span className="muted nowrap">{dayjs(r.updatedAt).fromNow()}</span></Tooltip> });
      cols.push({
        key: 'actions',
        title: '',
        width: 110,
        align: 'right',
        render: (_v, r) => (
          <Space size={4}>
            <Tooltip title="Edit"><Button type="text" icon={<EditOutlined />} onClick={() => setEditing(r)} aria-label="Edit" /></Tooltip>
            <Popconfirm
              title={`Delete “${String(r[cfg.primary])}”?`}
              description={`If any ${cfg.usedBy} use it, it will be hidden instead of deleted.`}
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => remove.mutate(r.id)}
            >
              <Button type="text" danger icon={<DeleteOutlined />} aria-label="Delete" />
            </Popconfirm>
          </Space>
        ),
      });
    }
    return cols;
  }, [cfg, reorder, toggle, remove]);

  const filterOptions = (cfg.filter === 'industry' ? industries.data?.data : cities.data?.data)?.map((o) => ({ value: o.id, label: String(o.name) })) ?? [];
  const rows = reorder ?? list.data?.data ?? [];

  const table = (
    <Table<BaseItem>
      rowKey="id"
      columns={columns}
      dataSource={rows}
      loading={!reorder && list.isFetching}
      components={reorder ? { body: { row: SortableRow } } : undefined}
      pagination={reorder ? false : {
        current: page, pageSize, total: list.data?.meta?.total ?? 0, showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100],
        showTotal: (t, [a, b]) => `${a}–${b} of ${t}`,
        onChange: (p, s) => { setPage(p); setPageSize(s); },
      }}
      expandable={cfg.type === 'mindset-questions' && !reorder ? {
        expandedRowRender: (r) => <MindsetOptionsEditor questionId={r.id} options={(r.options as MindsetOption[]) ?? []} />,
      } : undefined}
      locale={{ emptyText: q || filterId || status !== 'all' ? 'No matches — try clearing the filters.' : `No ${cfg.title.toLowerCase()} yet.` }}
    />
  );

  return (
    <div className="page">
      <PageHeader
        title={cfg.title}
        subtitle={cfg.description}
        extra={
          reorder ? (
            <Space>
              <Button onClick={() => setReorder(null)}>Cancel</Button>
              <Button type="primary" loading={saveOrder.isPending} onClick={() => saveOrder.mutate(reorder.map((r) => r.id))}>Save order</Button>
            </Space>
          ) : (
            <Space>
              <Button icon={<SwapOutlined rotate={90} />} onClick={startReorder}>Reorder</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing('new')}>Add {cfg.singular.toLowerCase()}</Button>
            </Space>
          )
        }
      />

      {list.isError && <Alert type="error" showIcon message={errorMessage(list.error)} style={{ marginBottom: 16 }} />}

      <div className="panel">
        {reorder ? (
          <div className="toolbar"><span className="muted">Drag rows to set the order users see in the app, then click <b>Save order</b>.</span></div>
        ) : (
          <div className="toolbar">
            <Input
              allowClear
              prefix={<SearchOutlined className="muted" />}
              placeholder={`Search ${cfg.title.toLowerCase().replace(" (i'm here to…)", '')}`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 280 }}
            />
            {cfg.filter && (
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder={cfg.filter === 'industry' ? 'All industries' : 'All cities'}
                options={filterOptions}
                value={filterId}
                onChange={setFilterId}
                style={{ width: 220 }}
              />
            )}
            <div className="spacer" />
            <Segmented<StatusFilter>
              value={status}
              onChange={setStatus}
              options={[{ label: 'All', value: 'all' }, { label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }]}
            />
          </div>
        )}
        {reorder ? (
          <DndContext sensors={sensors} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
            <SortableContext items={reorder.map((r) => r.id)} strategy={verticalListSortingStrategy}>{table}</SortableContext>
          </DndContext>
        ) : table}
      </div>

      <EditDrawer
        cfg={cfg}
        record={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); invalidate(); }}
        onChanged={invalidate}
        industries={industries.data?.data ?? []}
        cities={cities.data?.data ?? []}
      />
    </div>
  );
}

function EditDrawer({ cfg, record, onClose, onSaved, onChanged, industries, cities }: {
  cfg: MasterType;
  record: BaseItem | 'new' | null;
  onClose: () => void;
  onSaved: () => void;
  onChanged: () => void;
  industries: BaseItem[];
  cities: BaseItem[];
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const isNew = record === 'new';
  const open = record !== null;
  const [error, setError] = useState<string>();
  const [bulkSaving, setBulkSaving] = useState(false);
  const bulkField = isNew && cfg.bulk ? cfg.fields.find((f) => f.name === cfg.bulk) : undefined;

  /** "Flutter, React , flutter" → ["Flutter", "React"] (trimmed, empty + case-insensitive duplicates dropped). */
  const splitList = (raw: string) => {
    const seen = new Set<string>();
    return raw.split(/[,\n]/).map((s) => s.trim()).filter((s) => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()));
  };

  /** Add one item per comma-separated value; keep the drawer open with only the ones that failed. */
  const saveMany = async (field: FieldDef, names: string[], rest: Record<string, unknown>) => {
    const tooLong = names.filter((n) => field.max && n.length > field.max);
    if (tooLong.length) {
      form.setFields([{ name: field.name, errors: [`Keep each ${field.label.toLowerCase()} under ${field.max} characters: ${tooLong.join(', ')}`] }]);
      return;
    }
    setError(undefined);
    setBulkSaving(true);
    const failed: { name: string; reason: string }[] = [];
    let added = 0;
    for (const name of names) {
      try {
        await api.post(`/admin/${cfg.type}`, { ...rest, [field.name]: name });
        added += 1;
      } catch (e) {
        failed.push({ name, reason: errorMessage(e) });
      }
    }
    setBulkSaving(false);
    const label = (n: number) => `${n} ${n === 1 ? cfg.singular.toLowerCase() : cfg.title.split(' (')[0].toLowerCase()}`;
    if (!failed.length) {
      message.success(`${label(added)} added`);
      onSaved();
      return;
    }
    if (added) {
      message.success(`${label(added)} added`);
      onChanged();
    }
    setError(`${label(failed.length)} not added: ${failed.map((f) => `${f.name} (${f.reason})`).join('; ')}`);
    form.setFieldsValue({ [field.name]: failed.map((f) => f.name).join(', ') });
  };

  useEffect(() => {
    if (!open) return;
    setError(undefined);
    form.resetFields();
    if (isNew) form.setFieldsValue({ isActive: true, ...(cfg.type === 'mindset-questions' ? { options: ['', ''] } : {}) });
    else form.setFieldsValue({ ...record });
  }, [open, isNew, record, form, cfg.type]);

  const save = useMutation({
    mutationFn: (body: object) => (isNew ? api.post(`/admin/${cfg.type}`, body) : api.put(`/admin/${cfg.type}/${(record as BaseItem).id}`, body)),
    onSuccess: () => { message.success(isNew ? `${cfg.singular} added` : `${cfg.singular} updated`); onSaved(); },
    onError: (e) => {
      setError(errorMessage(e));
      const fields = fieldErrors(e);
      const known = cfg.fields.map((f) => f.name);
      form.setFields(Object.entries(fields).filter(([k]) => known.includes(k)).map(([name, msg]) => ({ name, errors: [msg] })));
    },
  });

  const submit = (values: Record<string, unknown>) => {
    const body: Record<string, unknown> = { isActive: Boolean(values.isActive) };
    for (const f of cfg.fields) {
      if (f.createOnly && !isNew) continue;
      let v = values[f.name];
      if (typeof v === 'string') v = v.trim();
      if (f.kind === 'options') v = ((v as string[]) || []).map((s) => (s || '').trim()).filter(Boolean);
      if ((v === undefined || v === '') && !f.required) v = null;
      if (f.kind === 'options' && Array.isArray(v) && v.length === 0) continue;
      body[f.name] = v;
    }
    if (bulkField && typeof body[bulkField.name] === 'string') {
      const names = splitList(body[bulkField.name] as string);
      if (names.length > 1) {
        void saveMany(bulkField, names, body);
        return;
      }
      body[bulkField.name] = names[0] ?? '';
    }
    save.mutate(body);
  };

  return (
    <Drawer
      title={isNew ? `Add ${cfg.singular.toLowerCase()}` : `Edit ${cfg.singular.toLowerCase()}`}
      open={open}
      onClose={onClose}
      width={460}
      forceRender
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={save.isPending || bulkSaving} onClick={() => form.submit()}>{isNew ? 'Add' : 'Save changes'}</Button>
        </div>
      }
    >
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <Form form={form} layout="vertical" onFinish={submit}>
        {cfg.fields.filter((f) => isNew || !f.createOnly).map((f) => <FieldInput key={f.name} f={f} bulk={f === bulkField} industries={industries} cities={cities} />)}
        <Form.Item name="isActive" label="Visible in app" valuePropName="checked" extra="Turn off to hide it from users without deleting it.">
          <Switch />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

function FieldInput({ f, bulk, industries, cities }: { f: FieldDef; bulk?: boolean; industries: BaseItem[]; cities: BaseItem[] }) {
  const rules = f.required ? [{ required: true, message: `${f.label} is required.` }] : [];
  switch (f.kind) {
    case 'textarea':
      return <Form.Item name={f.name} label={f.label} rules={rules} extra={f.help}><Input.TextArea maxLength={f.max} showCount rows={3} placeholder={f.placeholder} /></Form.Item>;
    case 'number':
      return <Form.Item name={f.name} label={f.label} rules={rules} extra={f.help}><InputNumber style={{ width: '100%' }} placeholder={f.placeholder} /></Form.Item>;
    case 'icon':
      return (
        <Form.Item name={f.name} label={f.label} rules={rules} extra="Same icon set as the mobile app.">
          <Select
            allowClear={!f.required}
            placeholder="Choose an icon"
            options={Object.keys(ICONS).map((k) => ({
              value: k,
              label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}><IconTile name={k} size={14} />{k.replace('_', ' ')}</span>,
            }))}
            optionLabelProp="label"
            showSearch
            filterOption={(input, opt) => String(opt?.value ?? '').includes(input.toLowerCase().replace(' ', '_'))}
            listHeight={320}
          />
        </Form.Item>
      );
    case 'industry':
      return (
        <Form.Item name={f.name} label={f.label} rules={rules} extra={f.help}>
          <Select allowClear showSearch optionFilterProp="label" placeholder="Select industry" options={industries.map((i) => ({ value: i.id, label: String(i.name) }))} />
        </Form.Item>
      );
    case 'city':
      return (
        <Form.Item name={f.name} label={f.label} rules={rules} extra={f.help}>
          <Select showSearch optionFilterProp="label" placeholder="Select city" options={cities.map((c) => ({ value: c.id, label: `${String(c.name)}, ${String(c.state)}` }))} />
        </Form.Item>
      );
    case 'options':
      return (
        <Form.Item label={f.label} extra={f.help} required>
          <Form.List
            name={f.name}
            rules={[{ validator: async (_r, v: string[]) => { if ((v || []).filter((s) => s && s.trim()).length < 2) throw new Error('Add at least 2 options.'); } }]}
          >
            {(fields, { add, remove }, { errors }) => (
              <>
                {fields.map((field, i) => (
                  <div key={field.key} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <Form.Item {...field} noStyle>
                      <Input placeholder={`Option ${i + 1}`} maxLength={60} />
                    </Form.Item>
                    {fields.length > 2 && <Button type="text" icon={<MinusCircleOutlined />} onClick={() => remove(field.name)} aria-label="Remove option" />}
                  </div>
                ))}
                {fields.length < 6 && <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add('')}>Add option</Button>}
                <Form.ErrorList errors={errors} />
              </>
            )}
          </Form.List>
        </Form.Item>
      );
    default:
      if (bulk) {
        // Adding: several values at once, separated by commas (or new lines).
        return (
          <Form.Item name={f.name} label={f.label} rules={rules} extra={f.help ?? 'Add several at once — separate them with commas.'}>
            <Input.TextArea autoSize={{ minRows: 1, maxRows: 6 }} placeholder={f.placeholder} />
          </Form.Item>
        );
      }
      return <Form.Item name={f.name} label={f.label} rules={rules} extra={f.help}><Input maxLength={f.max} placeholder={f.placeholder} /></Form.Item>;
  }
}
