import { useEffect, useState } from 'react';
import { Avatar, Badge, Drawer, Dropdown, Grid, Layout, Menu, type MenuProps } from 'antd';
import { DashboardOutlined, LogoutOutlined, MenuOutlined, SafetyCertificateOutlined, ShareAltOutlined, TeamOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Stats } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { BrandMark } from '../components/common';
import { MANUAL_SELFIE_REVIEW } from '../config/features';
import { MASTER_TYPES } from '../config/masterData';

const { Sider, Header, Content } = Layout;

export default function AppLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const stats = useQuery({ queryKey: ['stats'], queryFn: () => api.get<Stats>('/admin/stats'), refetchInterval: 60_000 });
  const pending = stats.data?.data.users.pendingVerification ?? 0;

  const items: MenuProps['items'] = [
    { type: 'group', label: 'Overview', children: [{ key: '/', icon: <DashboardOutlined />, label: 'Dashboard' }] },
    {
      type: 'group',
      label: 'Moderation',
      children: [
        ...(MANUAL_SELFIE_REVIEW ? [{
          key: '/verifications',
          icon: <SafetyCertificateOutlined />,
          label: (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              Verifications
              {pending > 0 && <Badge count={pending} size="small" style={{ background: '#00CFAE', boxShadow: 'none' }} />}
            </span>
          ),
        }] : []),
        { key: '/users', icon: <TeamOutlined />, label: 'Users' },
        { key: '/connections', icon: <ShareAltOutlined />, label: 'Connections' },
      ],
    },
    {
      type: 'group',
      label: 'Master data',
      children: MASTER_TYPES.map((m) => ({ key: `/master/${m.type}`, icon: m.icon, label: m.title.replace(" (I'm here to…)", '') })),
    },
  ];

  const selected = pathname.startsWith('/master/') ? pathname : `/${pathname.split('/')[1]}`;

  // Laptop/desktop (lg ≥ 992px): fixed sidebar. Tablet/phone: ☰ button opens the menu as a drawer.
  const screens = Grid.useBreakpoint();
  const desktop = screens.lg !== false;
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [pathname, desktop]);

  const nav = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '22px 20px 18px' }}>
        <BrandMark size={44} />
        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, letterSpacing: 1.5, lineHeight: 1.3 }}>
          ADMIN
          <br />
          CONSOLE
        </div>
      </div>
      <Menu theme="dark" mode="inline" selectedKeys={[selected]} items={items} onClick={(e) => navigate(e.key)} style={{ borderInlineEnd: 0, background: 'transparent' }} />
      <div className="sider-footer">MEET • CONNECT • GROW</div>
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {desktop ? (
        <Sider width={248} className="app-sider" style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'auto' }}>
          {nav}
        </Sider>
      ) : (
        <Drawer
          placement="left"
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          width={264}
          closable={false}
          rootClassName="app-nav-drawer"
          styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
        >
          {nav}
        </Drawer>
      )}
      <Layout>
        <Header className="app-header">
          {!desktop && (
            <>
              <button type="button" className="nav-toggle" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
                <MenuOutlined />
              </button>
              <BrandMark size={28} />
            </>
          )}
          <div style={{ flex: 1 }} />
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                { key: 'role', label: <span className="muted">{admin?.role === 'super_admin' ? 'Super admin' : 'Admin'}</span>, disabled: true },
                { type: 'divider' },
                { key: 'logout', icon: <LogoutOutlined />, label: 'Log out', danger: true, onClick: () => void logout() },
              ],
            }}
          >
            <button type="button" style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 0, cursor: 'pointer', padding: 0 }}>
              <Avatar style={{ background: 'linear-gradient(135deg,#0668E8,#00CFAE)', fontWeight: 600 }}>{admin?.name?.[0]?.toUpperCase() ?? 'A'}</Avatar>
              <span style={{ textAlign: 'left', lineHeight: 1.2, display: screens.sm === false ? 'none' : undefined }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{admin?.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>{admin?.email}</div>
              </span>
            </button>
          </Dropdown>
        </Header>
        <Content>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
