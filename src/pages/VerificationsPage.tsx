import { useState } from 'react';
import { Alert, App, Button, Col, Empty, Form, Input, Modal, Pagination, Row, Segmented, Skeleton, Tag, Tooltip } from 'antd';
import { CheckOutlined, CloseOutlined, MailOutlined, PhoneOutlined, SearchOutlined } from '@ant-design/icons';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { api, errorMessage } from '../api/client';
import type { Verification, VerificationStatus } from '../api/types';
import { AuthImage, PageHeader, StatusTag } from '../components/common';
import UserDrawer from '../components/UserDrawer';

type Filter = VerificationStatus | 'all';
const REASONS = ['Face not clearly visible', 'Photo is blurry or too dark', 'Sunglasses or hat covering face', 'Does not look like a real selfie', 'Multiple people in the photo'];

export default function VerificationsPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [status, setStatus] = useState<Filter>('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<Verification | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [form] = Form.useForm<{ reason: string }>();

  const params = { status, page, limit: 12, search: search.trim() || undefined };
  const list = useQuery({
    queryKey: ['verifications', params],
    queryFn: () => api.get<Verification[]>('/admin/verifications', params),
    placeholderData: keepPreviousData,
  });

  const review = useMutation({
    mutationFn: ({ id, action, reason }: { id: number; action: 'approve' | 'reject'; reason?: string }) =>
      api.patch<Verification>(`/admin/verifications/${id}`, { action, reason }),
    onSuccess: (r) => {
      message.success(r.data.status === 'verified' ? `${r.data.user.fullName || 'User'} is now verified` : 'Selfie rejected — the user can submit a new one');
      setRejecting(null);
      form.resetFields();
      qc.invalidateQueries({ queryKey: ['verifications'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  const rows = list.data?.data ?? [];

  return (
    <div className="page">
      <PageHeader
        title="Selfie verifications"
        subtitle="Approve a selfie when the face is clear and matches a real person. Rejected users are asked to take a new selfie."
      />
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="toolbar" style={{ borderBottom: 0 }}>
          <Segmented<Filter>
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            options={[{ label: 'Pending', value: 'pending' }, { label: 'Verified', value: 'verified' }, { label: 'Rejected', value: 'rejected' }, { label: 'All', value: 'all' }]}
          />
          <div className="spacer" />
          <Input allowClear prefix={<SearchOutlined className="muted" />} placeholder="Search name, phone or email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ width: 280 }} />
        </div>
      </div>

      {list.isError && <Alert type="error" showIcon message={errorMessage(list.error)} style={{ marginBottom: 16 }} />}
      {list.isLoading && <Skeleton active paragraph={{ rows: 6 }} />}
      {!list.isLoading && rows.length === 0 && (
        <div className="panel panel-pad"><Empty description={status === 'pending' ? 'All caught up — no selfies waiting for review.' : 'Nothing here yet.'} /></div>
      )}

      <Row gutter={[16, 16]}>
        {rows.map((v) => (
          <Col xs={24} sm={12} lg={8} xxl={6} key={v.id}>
            <div className="verif-card">
              <div className="verif-img"><AuthImage src={v.selfieUrl} alt={`Selfie of ${v.user.fullName ?? 'user'}`} /></div>
              <div className="verif-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                  <button type="button" onClick={() => setUserId(v.user.id)} style={{ all: 'unset', cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>
                    {v.user.fullName || 'Unnamed user'}
                  </button>
                  <StatusTag status={v.status} />
                </div>
                {v.user.phone && <span className="muted" style={{ fontSize: 13 }}><PhoneOutlined /> {v.user.phone}</span>}
                {v.user.email && <span className="muted" style={{ fontSize: 13 }}><MailOutlined /> {v.user.email}</span>}
                <Tooltip title={dayjs(v.submittedAt).format('D MMM YYYY, HH:mm')}>
                  <span className="muted" style={{ fontSize: 12 }}>Submitted {dayjs(v.submittedAt).fromNow()}</span>
                </Tooltip>
                {v.status !== 'pending' && (
                  <span className="muted" style={{ fontSize: 12 }}>
                    {v.status === 'verified' ? 'Approved' : 'Rejected'}{v.reviewedBy ? ` by ${v.reviewedBy.name}` : ''}{v.reviewedAt ? ` · ${dayjs(v.reviewedAt).fromNow()}` : ''}
                  </span>
                )}
                {v.reason && <Tag color="error" bordered={false} style={{ whiteSpace: 'normal', marginTop: 4 }}>{v.reason}</Tag>}
              </div>
              {v.status === 'pending' && (
                <div className="verif-actions">
                  <Button block danger icon={<CloseOutlined />} onClick={() => setRejecting(v)}>Reject</Button>
                  <Button
                    block
                    type="primary"
                    icon={<CheckOutlined />}
                    loading={review.isPending && review.variables?.id === v.id && review.variables.action === 'approve'}
                    onClick={() => review.mutate({ id: v.id, action: 'approve' })}
                  >
                    Approve
                  </Button>
                </div>
              )}
            </div>
          </Col>
        ))}
      </Row>

      {(list.data?.meta?.total ?? 0) > 12 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
          <Pagination current={page} pageSize={12} total={list.data?.meta?.total} onChange={setPage} showSizeChanger={false} />
        </div>
      )}

      <Modal
        title={`Reject selfie${rejecting?.user.fullName ? ` — ${rejecting.user.fullName}` : ''}`}
        open={Boolean(rejecting)}
        onCancel={() => { setRejecting(null); form.resetFields(); }}
        okText="Reject selfie"
        okButtonProps={{ danger: true, loading: review.isPending }}
        onOk={() => form.submit()}
        forceRender
      >
        <p className="muted" style={{ marginTop: 0 }}>The user will see this reason and can take a new selfie.</p>
        <div style={{ marginBottom: 12 }}>
          {REASONS.map((r) => (
            <Tag key={r} style={{ cursor: 'pointer', marginBottom: 6 }} onClick={() => form.setFieldsValue({ reason: r })}>{r}</Tag>
          ))}
        </div>
        <Form form={form} layout="vertical" onFinish={(v) => rejecting && review.mutate({ id: rejecting.id, action: 'reject', reason: v.reason.trim() })}>
          <Form.Item name="reason" label="Reason" rules={[{ required: true, min: 3, whitespace: true, message: 'Add a reason (at least 3 characters).' }]}>
            <Input.TextArea rows={3} maxLength={255} showCount placeholder="Explain what to fix" />
          </Form.Item>
        </Form>
      </Modal>

      <UserDrawer userId={userId} onClose={() => setUserId(null)} />
    </div>
  );
}
