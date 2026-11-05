import type { ReactNode } from 'react';
import { Alert, Button, Col, Row, Skeleton } from 'antd';
import { ArrowRightOutlined, CheckCircleOutlined, ClockCircleOutlined, ShareAltOutlined, StopOutlined, TeamOutlined, UserAddOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import type { Stats } from '../api/types';
import { Bar, PageHeader } from '../components/common';
import { MASTER_TYPES } from '../config/masterData';
import { MANUAL_SELFIE_REVIEW } from '../config/features';

function Kpi({ label, value, hint, icon, tint, accent, onClick }: { label: string; value: number; hint?: string; icon: ReactNode; tint: string; accent?: boolean; onClick?: () => void }) {
  return (
    <div className={`kpi${accent ? ' accent' : ''}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined }}>
      <div className="icon" style={{ background: accent ? 'rgba(255,255,255,0.18)' : tint, color: accent ? '#fff' : undefined }}>{icon}</div>
      <div className="label">{label}</div>
      <div className="value mono">{value.toLocaleString('en-IN')}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

const STEP_NAMES = ['', 'About you', 'Your work', 'Interests', 'Mindset', 'Community', 'Selfie', 'Completed'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ['stats'], queryFn: () => api.get<Stats>('/admin/stats') });

  if (q.isError) return <div className="page"><Alert type="error" showIcon message={errorMessage(q.error)} /></div>;
  if (!q.data) return <div className="page"><Skeleton active paragraph={{ rows: 10 }} /></div>;
  const s = q.data.data;
  const u = s.users;

  // last 14 days, zero-filled
  const byDay = new Map(s.signupsByDay.map((d) => [d.day, d.users]));
  const days = Array.from({ length: 14 }, (_, i) => dayjs().subtract(13 - i, 'day').format('YYYY-MM-DD'));
  const maxDay = Math.max(1, ...days.map((d) => byDay.get(d) ?? 0));
  const funnel = new Map(s.onboardingFunnel.map((f) => [f.step, f.users]));
  // users who reached step N or beyond
  const reached = (n: number) => [...funnel.entries()].filter(([st]) => st >= n).reduce((a, [, c]) => a + c, 0);
  const maxInterest = Math.max(1, ...s.topInterests.map((t) => t.users));
  const n = s.network;
  const reqByDay = new Map(n.requestsByDay.map((d) => [d.day, d]));
  const maxReq = Math.max(1, ...days.map((d) => reqByDay.get(d)?.requests ?? 0));
  const reqTotal14 = days.reduce((a, d) => a + (reqByDay.get(d)?.requests ?? 0), 0);

  return (
    <div className="page">
      <PageHeader title="Dashboard" subtitle="How the SyyncIn community is growing" />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={8} xxl={4}><Kpi accent label="Total users" value={u.total} hint={`${u.newLast7Days} joined this week`} icon={<TeamOutlined />} tint="" onClick={() => navigate('/users')} /></Col>
        <Col xs={24} sm={12} xl={8} xxl={4}><Kpi label="Completed onboarding" value={u.onboarded} hint={u.total ? `${Math.round((u.onboarded / u.total) * 100)}% of users` : undefined} icon={<CheckCircleOutlined style={{ color: '#00BE9C' }} />} tint="#E6F9F4" /></Col>
        {MANUAL_SELFIE_REVIEW && (
        <Col xs={24} sm={12} xl={8} xxl={4}><Kpi label="Pending verification" value={u.pendingVerification} hint="Selfies waiting for review" icon={<ClockCircleOutlined style={{ color: '#D98C0D' }} />} tint="#FFF5E6" onClick={() => navigate('/verifications')} /></Col>
        )}
        <Col xs={24} sm={12} xl={8} xxl={4}><Kpi label="Verified members" value={u.verified} icon={<CheckCircleOutlined style={{ color: '#0668E8' }} />} tint="#EDF4FF" /></Col>
        <Col xs={24} sm={12} xl={8} xxl={4}><Kpi label="New (7 days)" value={u.newLast7Days} icon={<UserAddOutlined style={{ color: '#0668E8' }} />} tint="#EDF4FF" /></Col>
        <Col xs={24} sm={12} xl={8} xxl={4}><Kpi label="Blocked" value={u.blocked} icon={<StopOutlined style={{ color: '#D62B2B' }} />} tint="#FDECEC" onClick={() => navigate('/users?status=blocked')} /></Col>
      </Row>

      {MANUAL_SELFIE_REVIEW && u.pendingVerification > 0 && (
        <Alert
          style={{ marginTop: 16, borderRadius: 12 }}
          type="warning"
          showIcon
          message={`${u.pendingVerification} selfie${u.pendingVerification > 1 ? 's are' : ' is'} waiting for review`}
          action={<Button size="small" type="primary" onClick={() => navigate('/verifications')}>Review now</Button>}
        />
      )}

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xl={14}>
          <div className="panel panel-pad" style={{ height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Sign-ups · last 14 days</h3>
              <span className="muted mono">{days.reduce((a, d) => a + (byDay.get(d) ?? 0), 0)} total</span>
            </div>
            <div className="vbar-chart">
              {days.map((d) => {
                const n = byDay.get(d) ?? 0;
                return (
                  <div className="vbar" key={d} title={`${dayjs(d).format('D MMM')}: ${n}`}>
                    <span className="n">{n || ''}</span>
                    <div className={`col${n ? '' : ' zero'}`} style={{ height: `${n ? (n / maxDay) * 100 : 2}%` }} />
                    <span className="d">{dayjs(d).format('D')}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Col>
        <Col xs={24} xl={10}>
          <div className="panel panel-pad" style={{ height: '100%' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>Onboarding funnel</h3>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <div key={n} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span>{n < 7 ? `${n}. ` : ''}{STEP_NAMES[n]}</span>
                  <span className="mono muted">{reached(n)}</span>
                </div>
                <Bar value={reached(n)} max={Math.max(1, u.total)} />
              </div>
            ))}
          </div>
        </Col>
      </Row>

      <h3 style={{ margin: '28px 0 12px', fontSize: 16 }}>Networking</h3>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}><Kpi label="Connections" value={n.connections} hint={`${n.newConnections7d} new this week`} icon={<ShareAltOutlined style={{ color: '#0668E8' }} />} tint="#EDF4FF" onClick={() => navigate('/connections?view=connections')} /></Col>
        <Col xs={24} sm={12} xl={6}><Kpi label="Pending requests" value={n.requests.pending} hint="Waiting for a reply" icon={<ClockCircleOutlined style={{ color: '#D98C0D' }} />} tint="#FFF5E6" onClick={() => navigate('/connections?view=requests&status=pending')} /></Col>
        <Col xs={24} sm={12} xl={6}>
          <div className="kpi">
            <div className="icon" style={{ background: '#E6F9F4' }}><CheckCircleOutlined style={{ color: '#00BE9C' }} /></div>
            <div className="label">Acceptance rate</div>
            <div className="value mono">{n.acceptanceRate === null ? '—' : `${n.acceptanceRate}%`}</div>
            <div className="hint">{n.requests.accepted} accepted · {n.requests.declined} declined</div>
          </div>
        </Col>
        <Col xs={24} sm={12} xl={6}><Kpi label="Profile bookmarks" value={n.bookmarks} hint={`${n.hiddenFromDiscovery} hidden from KYN · ${n.notOpenToConnect} not accepting`} icon={<UserAddOutlined style={{ color: '#0668E8' }} />} tint="#EDF4FF" /></Col>
      </Row>
      <div className="panel panel-pad" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Connection requests · last 14 days</h3>
          <span className="muted" style={{ fontSize: 13 }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#0668E8', verticalAlign: 'middle', marginRight: 6 }} />Sent <span className="mono">{reqTotal14}</span>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#00CFAE', verticalAlign: 'middle', margin: '0 6px 0 14px' }} />Accepted
          </span>
        </div>
        <div className="vbar-chart">
          {days.map((d) => {
            const r = reqByDay.get(d);
            const total = r?.requests ?? 0;
            const acc = r?.accepted ?? 0;
            return (
              <div className="vbar" key={d} title={`${dayjs(d).format('D MMM')}: ${total} sent, ${acc} accepted`}>
                <span className="n">{total || ''}</span>
                <div className={`col${total ? '' : ' zero'}`} style={{ height: `${total ? (total / maxReq) * 100 : 2}%`, position: 'relative', overflow: 'hidden', ...(total ? { background: '#0668E8' } : {}) }}>
                  {acc > 0 && <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${(acc / total) * 100}%`, background: '#00CFAE' }} />}
                </div>
                <span className="d">{dayjs(d).format('D')}</span>
              </div>
            );
          })}
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xl={10}>
          <div className="panel panel-pad" style={{ height: '100%' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>Top interests</h3>
            {s.topInterests.length === 0 && <div className="muted">No selections yet.</div>}
            {s.topInterests.map((t) => (
              <div key={t.name} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span>{t.name}</span>
                  <span className="mono muted">{t.users}</span>
                </div>
                <Bar value={t.users} max={maxInterest} />
              </div>
            ))}
          </div>
        </Col>
        <Col xs={24} xl={14}>
          <div className="panel panel-pad" style={{ height: '100%' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>Master data</h3>
            <Row gutter={[12, 12]}>
              {MASTER_TYPES.map((m) => {
                const c = s.masterData[m.type] || { total: 0, active: 0 };
                return (
                  <Col xs={12} md={8} xl={6} key={m.type}>
                    <button
                      type="button"
                      onClick={() => navigate(`/master/${m.type}`)}
                      style={{ width: '100%', textAlign: 'left', border: '1px solid #E1E7F2', borderRadius: 10, padding: '12px 14px', background: '#fff', cursor: 'pointer' }}
                    >
                      <div style={{ color: '#0668E8', fontSize: 16 }}>{m.icon}</div>
                      <div style={{ fontWeight: 600, fontSize: 13, marginTop: 6, color: '#0A1741' }}>{m.title.replace(" (I'm here to…)", '')}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        <span className="mono">{c.active}</span> active · <span className="mono">{c.total}</span> total <ArrowRightOutlined style={{ fontSize: 10 }} />
                      </div>
                    </button>
                  </Col>
                );
              })}
            </Row>
          </div>
        </Col>
      </Row>
    </div>
  );
}
