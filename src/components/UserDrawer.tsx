import { Alert, App, Avatar, Button, Descriptions, Drawer, Popconfirm, Skeleton, Space, Tag } from 'antd';
import { ArrowRightOutlined, LinkedinOutlined, StopOutlined, UnlockOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { api, assetUrl, errorMessage } from '../api/client';
import type { UserDetail } from '../api/types';
import { IconTile, Initials, StatusTag, StepTag } from './common';

const label = (s?: string | null) => (s ? s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '—');

export default function UserDrawer({ userId, onClose }: { userId: number | null; onClose: () => void }) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const goNetwork = (view: 'requests' | 'connections') => { onClose(); navigate(`/connections?view=${view}&userId=${userId}`); };
  const q = useQuery({
    queryKey: ['user', userId],
    queryFn: () => api.get<UserDetail>(`/admin/users/${userId}`),
    enabled: userId !== null,
  });
  const setStatus = useMutation({
    mutationFn: (status: 'active' | 'blocked') => api.patch(`/admin/users/${userId}/status`, { status }),
    onSuccess: (_r, s) => {
      message.success(s === 'blocked' ? 'User blocked and signed out of all devices' : 'User unblocked');
      qc.invalidateQueries({ queryKey: ['user', userId] });
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  const u = q.data?.data;
  return (
    <Drawer
      open={userId !== null}
      onClose={onClose}
      width={560}
      title="User profile"
      extra={u && (u.status === 'blocked' ? (
        <Button icon={<UnlockOutlined />} loading={setStatus.isPending} onClick={() => setStatus.mutate('active')}>Unblock</Button>
      ) : (
        <Popconfirm title="Block this user?" description="They will be signed out and can't use the app until unblocked." okText="Block" okButtonProps={{ danger: true }} onConfirm={() => setStatus.mutate('blocked')}>
          <Button danger icon={<StopOutlined />} loading={setStatus.isPending}>Block</Button>
        </Popconfirm>
      ))}
    >
      {q.isError && <Alert type="error" showIcon message={errorMessage(q.error)} />}
      {q.isLoading && <Skeleton active avatar paragraph={{ rows: 8 }} />}
      {u && (
        <>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {u.photoUrl ? <Avatar size={64} src={assetUrl(u.photoUrl)} /> : <Initials name={u.fullName} size={64} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{u.fullName || 'Unnamed user'}</div>
              <div className="muted">{[u.work.jobTitle, u.work.company].filter(Boolean).join(' · ') || 'No work details yet'}</div>
              <Space size={4} style={{ marginTop: 6 }} wrap>
                <StatusTag status={u.status} />
                <StatusTag status={u.verificationStatus} />
                <StepTag step={u.onboarding.step} />
              </Space>
            </div>
          </div>

          {u.about && <p style={{ marginTop: 16, marginBottom: 0, color: '#0A1741', lineHeight: 1.55 }}>{u.about}</p>}

          <div className="section-title">Network</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { k: 'Connections', v: u.network.connections, go: 'connections' as const },
              { k: 'Requests sent', v: u.network.requestsSent.total, sub: `${u.network.requestsSent.accepted} accepted`, go: 'requests' as const },
              { k: 'Received', v: u.network.requestsReceived.total, sub: `${u.network.requestsReceived.pending} pending`, go: 'requests' as const },
              { k: 'Saved by', v: u.network.savedBy, sub: `saves ${u.network.saved}` },
            ].map((x) => (
              <button
                key={x.k}
                type="button"
                disabled={!x.go}
                onClick={() => x.go && goNetwork(x.go)}
                style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', textAlign: 'left', border: '1px solid #E1E7F2', borderRadius: 10, padding: '10px 12px', background: '#fff', cursor: x.go ? 'pointer' : 'default', color: 'inherit', font: 'inherit' }}
              >
                <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: '#0A1741' }}>{x.v}</div>
                <div className="muted" style={{ fontSize: 12 }}>{x.k}</div>
                {x.sub && <div className="muted" style={{ fontSize: 11 }}>{x.sub}</div>}
              </button>
            ))}
          </div>
          {u.network.requestsSent.last24h >= 20 && (
            <Alert style={{ marginTop: 10 }} type="warning" showIcon message={`Sent ${u.network.requestsSent.last24h} requests in the last 24 hours — check for spam.`} />
          )}
          {u.network.recentConnections.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {u.network.recentConnections.map((c) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                  {c.photoUrl ? <Avatar size={28} src={assetUrl(c.photoUrl)} /> : <Initials name={c.fullName} size={28} />}
                  <span style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600 }}>{c.fullName || 'Unnamed'}</span>
                    <span className="muted" style={{ fontSize: 12 }}>{c.jobTitle ? ` · ${c.jobTitle}` : ''}</span>
                  </span>
                  <span className="muted" style={{ fontSize: 12 }}>{dayjs(c.connectedAt).fromNow()}</span>
                </div>
              ))}
              <Button type="link" style={{ padding: 0 }} onClick={() => goNetwork('connections')}>
                View all connections <ArrowRightOutlined />
              </Button>
            </div>
          )}

          <div className="section-title">About</div>
          <Descriptions column={1} size="small" colon={false} styles={{ label: { width: 150, color: '#6577AB' } }}>
            <Descriptions.Item label="Phone">{u.phone || '—'}</Descriptions.Item>
            <Descriptions.Item label="Email">{u.email || '—'}</Descriptions.Item>
            <Descriptions.Item label="Date of birth">{u.dob ? `${dayjs(u.dob).format('D MMM YYYY')} (${dayjs().diff(u.dob, 'year')} yrs)` : '—'}</Descriptions.Item>
            <Descriptions.Item label="Gender">{label(u.gender)}</Descriptions.Item>
            <Descriptions.Item label="LinkedIn">
              {u.linkedinUrl ? <a href={/^https?:/.test(u.linkedinUrl) ? u.linkedinUrl : `https://${u.linkedinUrl}`} target="_blank" rel="noreferrer"><LinkedinOutlined /> View profile</a> : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Joined">{dayjs(u.createdAt).format('D MMM YYYY')}</Descriptions.Item>
          </Descriptions>

          <div className="section-title">Work</div>
          <Descriptions column={1} size="small" colon={false} styles={{ label: { width: 150, color: '#6577AB' } }}>
            <Descriptions.Item label="Job title">{u.work.jobTitle || '—'}</Descriptions.Item>
            <Descriptions.Item label="Industry">{u.work.industry?.name || '—'}</Descriptions.Item>
            <Descriptions.Item label="Company">{u.work.company || '—'}</Descriptions.Item>
            <Descriptions.Item label="Experience">{u.work.experienceLevel?.label || '—'}</Descriptions.Item>
            <Descriptions.Item label="Skills">{u.work.skills.length ? u.work.skills.map((s) => <span className="chip" key={s.id}>{s.name}</span>) : '—'}</Descriptions.Item>
          </Descriptions>

          <div className="section-title">Interests & goals</div>
          <div>{u.interests.length ? u.interests.map((i) => <span className="chip" key={i.id}>{i.name}</span>) : <span className="muted">No interests yet</span>}</div>
          <div style={{ marginTop: 8 }}>
            {u.reasons.map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <IconTile name={r.icon} size={16} /> {r.title}
              </div>
            ))}
          </div>

          <div className="section-title">Mindset</div>
          {u.mindset.length ? (
            <Descriptions column={1} size="small" colon={false} styles={{ label: { width: 230, color: '#6577AB' } }}>
              {u.mindset.map((m) => <Descriptions.Item key={m.questionId} label={m.question}><Tag bordered={false}>{m.answer}</Tag></Descriptions.Item>)}
            </Descriptions>
          ) : <span className="muted">Not answered yet</span>}

          <div className="section-title">Community</div>
          <Descriptions column={1} size="small" colon={false} styles={{ label: { width: 150, color: '#6577AB' } }}>
            <Descriptions.Item label="Location">{[u.community.locality?.name, u.community.city?.name].filter(Boolean).join(', ') || '—'}</Descriptions.Item>
            <Descriptions.Item label="Connect">{label(u.community.connectMode)}</Descriptions.Item>
            <Descriptions.Item label="Discovery distance">{u.community.radiusKm ? `${u.community.radiusKm} km` : '—'}</Descriptions.Item>
            <Descriptions.Item label="Availability">{u.community.availability.length ? u.community.availability.map(label).join(', ') : '—'}</Descriptions.Item>
            <Descriptions.Item label="Nearby discovery">{u.community.nearbyDiscovery ? 'Visible in KYN' : <Tag bordered={false}>Hidden from KYN</Tag>}</Descriptions.Item>
            <Descriptions.Item label="Open to connect">{u.community.openToConnect ? 'Yes' : <Tag bordered={false}>Not accepting requests</Tag>}</Descriptions.Item>
          </Descriptions>

          <div className="section-title">Verification history</div>
          {u.verifications.length ? u.verifications.map((v) => (
            <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #EDF1F8' }}>
              <span>
                <StatusTag status={v.status} />
                <span className="muted" style={{ fontSize: 12 }}>{dayjs(v.submittedAt).format('D MMM YYYY, HH:mm')}</span>
              </span>
              {v.reason && <span className="muted" style={{ fontSize: 12, maxWidth: 260, textAlign: 'right' }}>{v.reason}</span>}
            </div>
          )) : <span className="muted">No selfie submitted yet</span>}
        </>
      )}
    </Drawer>
  );
}
