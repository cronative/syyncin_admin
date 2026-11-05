import { useState } from 'react';
import { Alert, Button, Form, Input } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { BrandMark } from '../components/common';

export default function LoginPage() {
  const { admin, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string; expired?: boolean } };
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  if (admin) return <Navigate to={location.state?.from || '/'} replace />;

  const onFinish = async (v: { email: string; password: string }) => {
    setError(undefined);
    setLoading(true);
    try {
      await login(v.email.trim(), v.password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <section className="login-brand">
        <span className="ring" style={{ width: 520, height: 520, right: -160, top: 120 }} />
        <span className="ring" style={{ width: 360, height: 360, right: -80, top: 200 }} />
        <span className="ring" style={{ width: 200, height: 200, right: 0, top: 280 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <BrandMark size={64} />
        </div>
        <div style={{ position: 'relative', maxWidth: 440 }}>
          <div className="tagline">MEET <b>•</b> CONNECT <b>•</b> GROW</div>
          <h1 style={{ fontSize: 40, lineHeight: 1.15, margin: '16px 0 14px', fontWeight: 700, letterSpacing: -0.8 }}>
            Your next connection could be closer than you think.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
            Manage the people, interests and opportunities that power the SyyncIn community.
          </p>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, position: 'relative' }}>© {new Date().getFullYear()} SyyncIn · Admin console</div>
      </section>

      <section className="login-form">
        <div className="login-card">
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1.2, color: '#0668E8' }}>ADMIN CONSOLE</div>
          <h2 style={{ fontSize: 26, fontWeight: 700, margin: '8px 0 6px', color: '#0A1741' }}>Welcome back</h2>
          <p className="muted" style={{ margin: '0 0 28px' }}>Sign in with your admin account to continue.</p>

          {location.state?.expired && !error && <Alert type="info" showIcon message="Your session expired. Please sign in again." style={{ marginBottom: 16 }} />}
          {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

          <Form
            layout="vertical"
            requiredMark={false}
            onFinish={onFinish}
            size="large"
            // Dev only: pre-filled test admin (npm run admin:create). Not shipped in production builds.
            initialValues={import.meta.env.DEV ? { email: 'admin@syyncin.app', password: 'Admin#12345' } : undefined}
          >
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Enter a valid email.' }]}>
              <Input prefix={<MailOutlined className="muted" />} placeholder="admin@syyncin.app" autoComplete="username" autoFocus />
            </Form.Item>
            <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Enter your password.' }]}>
              <Input.Password prefix={<LockOutlined className="muted" />} placeholder="••••••••" autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 50, marginTop: 8 }}>
              Sign in
            </Button>
          </Form>
        </div>
      </section>
    </div>
  );
}
