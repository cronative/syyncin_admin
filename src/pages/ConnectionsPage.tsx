import { useEffect, useState } from 'react';
import { Alert, App, Avatar, Button, Input, Popconfirm, Segmented, Select, Table, Tag, Tooltip, type TableColumnsType } from 'antd';
import { CloseCircleOutlined, DisconnectOutlined, SearchOutlined, SwapRightOutlined, UserOutlined } from '@ant-design/icons';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import { api, assetUrl, errorMessage } from '../api/client';
import type { ConnectionRequestRow, ConnectionRow, MemberLite } from '../api/types';
import { Initials, PageHeader, StatusTag } from '../components/common';
import UserDrawer from '../components/UserDrawer';

type View = 'requests' | 'connections';

/** Avatar + name + role; click opens the member's profile drawer. */
function Member({ m, onOpen }: { m: MemberLite; onOpen: (id: number) => void }) {
  return (
    <button type="button" onClick={() => onOpen(m.id)} style={{ all: 'unset', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
      {m.photoUrl ? <Avatar size={32} src={assetUrl(m.photoUrl)} /> : <Initials name={m.fullName} size={32} />}
      <span style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {m.fullName || <span className="muted">Not set</span>}
          {m.status === 'blocked' && <Tag color="error" bordered={false} style={{ marginLeft: 6, borderRadius: 6 }}>Blocked</Tag>}
        </div>
        <div className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.jobTitle || '—'}</div>
      </span>
    </button>
  );
}

const When = ({ at }: { at: string | null }) =>
  at ? <Tooltip title={dayjs(at).format('D MMM YYYY, HH:mm')}><span className="muted nowrap">{dayjs(at).fromNow()}</span></Tooltip> : <span className="muted">—</span>;

export default function ConnectionsPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [sp, setSp] = useSearchParams();
  const view = (sp.get('view') as View) || 'requests';
  const status = sp.get('status') || 'all';
  const userId = sp.get('userId') ? Number(sp.get('userId')) : undefined;
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [openId, setOpenId] = useState<number | null>(null);

  const setParam = (k: string, v?: string | number) => {
    const next = new URLSearchParams(sp);
    if (v === undefined || v === '' || (k === 'status' && v === 'all')) next.delete(k);
    else next.set(k, String(v));
    if (k === 'view') next.delete('status');
    setSp(next, { replace: true });
    setPage(1);
  };

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const params = { page, limit: pageSize, search: debounced || undefined, userId, ...(view === 'requests' ? { status } : {}) };
  const requests = useQuery({
    queryKey: ['admin-requests', params],
    queryFn: () => api.get<ConnectionRequestRow[]>('/admin/connection-requests', params),
    enabled: view === 'requests',
    placeholderData: keepPreviousData,
  });
  const connections = useQuery({
    queryKey: ['admin-connections', params],
    queryFn: () => api.get<ConnectionRow[]>('/admin/connections', params),
    enabled: view === 'connections',
    placeholderData: keepPreviousData,
  });
  const focusUser = useQuery({
    queryKey: ['user', userId],
    queryFn: () => api.get<{ fullName: string | null }>(`/admin/users/${userId}`),
    enabled: Boolean(userId),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-requests'] });
    qc.invalidateQueries({ queryKey: ['admin-connections'] });
    qc.invalidateQueries({ queryKey: ['stats'] });
    qc.invalidateQueries({ queryKey: ['user'] });
    qc.invalidateQueries({ queryKey: ['users'] });
  };
  const cancel = useMutation({
    mutationFn: (id: number) => api.patch(`/admin/connection-requests/${id}/cancel`),
    onSuccess: (r) => { message.success(r.message); refresh(); },
    onError: (e) => message.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (c: ConnectionRow) => api.del(`/admin/connections/${c.userA.id}/${c.userB.id}`),
    onSuccess: (r) => { message.success(r.message); refresh(); },
    onError: (e) => message.error(errorMessage(e)),
  });

  const requestCols: TableColumnsType<ConnectionRequestRow> = [
    { key: 'from', title: 'From', width: 210, render: (_v, r) => <Member m={r.sender} onOpen={setOpenId} /> },
    { key: 'arrow', width: 36, render: () => <SwapRightOutlined className="muted" /> },
    { key: 'to', title: 'To', width: 210, render: (_v, r) => <Member m={r.receiver} onOpen={setOpenId} /> },
    {
      key: 'message',
      title: 'Message',
      width: 260,
      render: (_v, r) => (r.message
        ? <span style={{ fontSize: 13, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={r.message}>“{r.message}”</span>
        : <span className="muted">No message</span>),
    },
    { key: 'status', title: 'Status', width: 120, render: (_v, r) => <StatusTag status={r.status} /> },
    { key: 'sent', title: 'Sent', width: 120, render: (_v, r) => <When at={r.createdAt} /> },
    { key: 'responded', title: 'Responded', width: 120, render: (_v, r) => <When at={r.respondedAt} /> },
    {
      key: 'actions',
      title: '',
      width: 60,
      align: 'right',
      render: (_v, r) => r.status === 'pending' && (
        <Popconfirm
          title="Cancel this request?"
          description="It disappears from both members' Inbox. Use this for spam or reported messages."
          okText="Cancel request"
          cancelText="Keep"
          okButtonProps={{ danger: true }}
          onConfirm={() => cancel.mutate(r.id)}
        >
          <Button type="text" danger icon={<CloseCircleOutlined />} aria-label="Cancel request" />
        </Popconfirm>
      ),
    },
  ];

  const connectionCols: TableColumnsType<ConnectionRow> = [
    { key: 'a', title: 'Member', render: (_v, c) => <Member m={c.userA} onOpen={setOpenId} /> },
    { key: 'link', width: 36, render: () => <span className="muted">↔</span> },
    { key: 'b', title: 'Member', render: (_v, c) => <Member m={c.userB} onOpen={setOpenId} /> },
    { key: 'via', title: 'Source', width: 150, render: (_v, c) => (c.requestId ? <Tag bordered={false} style={{ borderRadius: 6 }}>Request #{c.requestId}</Tag> : <span className="muted">Imported</span>) },
    { key: 'when', title: 'Connected', width: 140, render: (_v, c) => <When at={c.connectedAt} /> },
    {
      key: 'actions',
      title: '',
      width: 60,
      align: 'right',
      render: (_v, c) => (
        <Popconfirm
          title="Remove this connection?"
          description="Both members will no longer see each other in My Connections."
          okText="Remove"
          okButtonProps={{ danger: true }}
          onConfirm={() => remove.mutate(c)}
        >
          <Button type="text" danger icon={<DisconnectOutlined />} aria-label="Remove connection" />
        </Popconfirm>
      ),
    },
  ];

  const active = view === 'requests' ? requests : connections;
  const name = focusUser.data?.data.fullName || (userId ? `Member #${userId}` : '');

  return (
    <div className="page">
      <PageHeader title="Connections" subtitle="Connection requests and accepted connections between members. Cancel spam requests or remove connections when needed." />
      {active.isError && <Alert type="error" showIcon message={errorMessage(active.error)} style={{ marginBottom: 16 }} />}
      <div className="panel">
        <div className="toolbar">
          <Segmented<View>
            value={view}
            onChange={(v) => setParam('view', v)}
            options={[{ value: 'requests', label: 'Requests' }, { value: 'connections', label: 'Connections' }]}
          />
          <Input
            allowClear
            prefix={<SearchOutlined className="muted" />}
            placeholder={view === 'requests' ? 'Search name, phone or message' : 'Search name or phone'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 280 }}
          />
          {view === 'requests' && (
            <Select
              style={{ width: 160 }}
              value={status}
              onChange={(v) => setParam('status', v)}
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'pending', label: 'Pending' },
                { value: 'accepted', label: 'Accepted' },
                { value: 'declined', label: 'Declined' },
                { value: 'withdrawn', label: 'Withdrawn' },
              ]}
            />
          )}
          {userId && (
            <Tag closable onClose={() => setParam('userId')} icon={<UserOutlined />} style={{ padding: '4px 10px', borderRadius: 8, fontSize: 13 }}>
              Only {name}
            </Tag>
          )}
        </div>
        {view === 'requests' ? (
          <Table<ConnectionRequestRow>
            rowKey="id"
            columns={requestCols}
            dataSource={requests.data?.data ?? []}
            loading={requests.isFetching}
            scroll={{ x: 1200 }}
            pagination={{
              current: page, pageSize, total: requests.data?.meta?.total ?? 0, showSizeChanger: true,
              showTotal: (t, [a, b]) => `${a}–${b} of ${t}`, onChange: (p, s) => { setPage(p); setPageSize(s); },
            }}
            locale={{ emptyText: requests.data?.message || 'No requests yet.' }}
          />
        ) : (
          <Table<ConnectionRow>
            rowKey={(c) => `${c.userA.id}-${c.userB.id}`}
            columns={connectionCols}
            dataSource={connections.data?.data ?? []}
            loading={connections.isFetching}
            scroll={{ x: 900 }}
            pagination={{
              current: page, pageSize, total: connections.data?.meta?.total ?? 0, showSizeChanger: true,
              showTotal: (t, [a, b]) => `${a}–${b} of ${t}`, onChange: (p, s) => { setPage(p); setPageSize(s); },
            }}
            locale={{ emptyText: connections.data?.message || 'No connections yet.' }}
          />
        )}
      </div>
      <UserDrawer userId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
