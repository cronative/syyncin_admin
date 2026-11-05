import { useEffect, useState } from 'react';
import { Alert, App, Button, Input, Popconfirm, Select, Space, Table, Tag, Tooltip, type TableColumnsType } from 'antd';
import { EnvironmentOutlined, EyeOutlined, MailOutlined, PhoneOutlined, SearchOutlined, StopOutlined, UnlockOutlined } from '@ant-design/icons';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import type { BaseItem, UserRow } from '../api/types';
import { Initials, PageHeader, StatusTag, StepTag } from '../components/common';
import UserDrawer from '../components/UserDrawer';

export default function UsersPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [sp, setSp] = useSearchParams();
  const [search, setSearch] = useState(sp.get('search') || '');
  const [debounced, setDebounced] = useState(search);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [openId, setOpenId] = useState<number | null>(null);

  const status = sp.get('status') || 'all';
  const verificationStatus = sp.get('verification') || undefined;
  const onboarding = sp.get('onboarding') || undefined;
  const cityId = sp.get('cityId') ? Number(sp.get('cityId')) : undefined;
  const setFilter = (k: string, v?: string | number) => {
    const next = new URLSearchParams(sp);
    if (v === undefined || v === '' || v === 'all') next.delete(k);
    else next.set(k, String(v));
    setSp(next, { replace: true });
    setPage(1);
  };

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const cities = useQuery({ queryKey: ['lookup', 'cities'], queryFn: () => api.get<BaseItem[]>('/admin/cities', { limit: 100, status: 'all' }), staleTime: 60_000 });
  const params = { page, limit: pageSize, status, verificationStatus, onboarding, cityId, search: debounced || undefined };
  const list = useQuery({ queryKey: ['users', params], queryFn: () => api.get<UserRow[]>('/admin/users', params), placeholderData: keepPreviousData });

  const setStatus = useMutation({
    mutationFn: ({ id, s }: { id: number; s: 'active' | 'blocked' }) => api.patch(`/admin/users/${id}/status`, { status: s }),
    onSuccess: (_r, v) => {
      message.success(v.s === 'blocked' ? 'User blocked and signed out' : 'User unblocked');
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['user', v.id] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  const columns: TableColumnsType<UserRow> = [
    {
      key: 'user',
      title: 'User',
      width: 280,
      render: (_v, u) => {
        const line = { fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 } as const;
        const clip = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;
        return (
          <button type="button" onClick={() => setOpenId(u.id)} style={{ all: 'unset', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 0, maxWidth: '100%' }}>
            <Initials name={u.fullName} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span style={{ fontWeight: 600, ...clip }}>{u.fullName || <span className="muted">Not set</span>}</span>
              <span className="muted" style={{ fontSize: 12, ...clip }}>{[u.jobTitle, u.company].filter(Boolean).join(' · ') || '—'}</span>
              <span className="muted" style={line}>
                {u.phone ? <PhoneOutlined /> : <MailOutlined />}
                <span style={clip}>{u.phone || u.email || '—'}</span>
              </span>
              {u.city && (
                <span className="muted" style={line}>
                  <EnvironmentOutlined />
                  <span style={clip}>{u.city}</span>
                </span>
              )}
            </span>
          </button>
        );
      },
    },
    { key: 'onboarding', title: 'Onboarding', width: 190, render: (_v, u) => <StepTag step={u.onboardingStep} /> },
    {
      key: 'connections',
      title: 'Connections',
      width: 120,
      render: (_v, u) => (
        <span>
          <span className="mono" style={{ fontWeight: 600 }}>{u.connections}</span>
          {!u.openToConnect && <Tooltip title="Not accepting new connections"><Tag bordered={false} style={{ marginLeft: 6, borderRadius: 6 }}>Closed</Tag></Tooltip>}
          {!u.nearbyDiscovery && <Tooltip title="Hidden from KYN discovery"><Tag bordered={false} style={{ marginLeft: 6, borderRadius: 6 }}>Hidden</Tag></Tooltip>}
        </span>
      ),
    },
    { key: 'verification', title: 'Selfie', width: 130, render: (_v, u) => <StatusTag status={u.verificationStatus} /> },
    { key: 'status', title: 'Status', width: 100, render: (_v, u) => <StatusTag status={u.status} /> },
    { key: 'joined', title: 'Joined', width: 150, render: (_v, u) => <Tooltip title={dayjs(u.createdAt).format('D MMM YYYY, HH:mm')}><span className="muted nowrap">{dayjs(u.createdAt).fromNow()}</span></Tooltip> },
    {
      key: 'actions',
      title: '',
      width: 100,
      align: 'right',
      render: (_v, u) => (
        <Space size={4}>
          <Tooltip title="View profile"><Button type="text" icon={<EyeOutlined />} onClick={() => setOpenId(u.id)} aria-label="View" /></Tooltip>
          {u.status === 'blocked' ? (
            <Tooltip title="Unblock"><Button type="text" icon={<UnlockOutlined />} onClick={() => setStatus.mutate({ id: u.id, s: 'active' })} aria-label="Unblock" /></Tooltip>
          ) : (
            <Popconfirm title="Block this user?" description="They'll be signed out of all devices." okText="Block" okButtonProps={{ danger: true }} onConfirm={() => setStatus.mutate({ id: u.id, s: 'blocked' })}>
              <Button type="text" danger icon={<StopOutlined />} aria-label="Block" />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader title="Users" subtitle="Everyone who has signed up, their setup progress and verification status." />
      {list.isError && <Alert type="error" showIcon message={errorMessage(list.error)} style={{ marginBottom: 16 }} />}
      <div className="panel">
        <div className="toolbar">
          <Input allowClear prefix={<SearchOutlined className="muted" />} placeholder="Search name, phone, email, job title" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 300 }} />
          <Select style={{ width: 150 }} value={status} onChange={(v) => setFilter('status', v)} options={[{ value: 'all', label: 'All statuses' }, { value: 'active', label: 'Active' }, { value: 'blocked', label: 'Blocked' }]} />
          <Select style={{ width: 170 }} allowClear placeholder="Selfie status" value={verificationStatus} onChange={(v) => setFilter('verification', v)}
            options={[{ value: 'pending', label: 'Pending' }, { value: 'verified', label: 'Verified' }, { value: 'rejected', label: 'Rejected' }, { value: 'none', label: 'Not submitted' }]} />
          <Select style={{ width: 170 }} allowClear placeholder="Onboarding" value={onboarding} onChange={(v) => setFilter('onboarding', v)}
            options={[{ value: 'complete', label: 'Completed' }, { value: 'incomplete', label: 'In progress' }]} />
          <Select style={{ width: 170 }} allowClear showSearch optionFilterProp="label" placeholder="City" value={cityId} onChange={(v) => setFilter('cityId', v)}
            options={(cities.data?.data ?? []).map((c) => ({ value: c.id, label: String(c.name) }))} />
        </div>
        <Table<UserRow>
          rowKey="id"
          columns={columns}
          dataSource={list.data?.data ?? []}
          loading={list.isFetching}
          scroll={{ x: 1030 }}
          pagination={{
            current: page, pageSize, total: list.data?.meta?.total ?? 0, showSizeChanger: true,
            showTotal: (t, [a, b]) => `${a}–${b} of ${t}`, onChange: (p, s) => { setPage(p); setPageSize(s); },
          }}
          locale={{ emptyText: 'No users match these filters.' }}
        />
      </div>
      <UserDrawer userId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
