import { useEffect, useState, type ReactNode } from 'react';
import { Image, Skeleton, Tag } from 'antd';
import {
  BookOpen, Briefcase, Camera, Code, Coffee, Dumbbell, Globe, GraduationCap, Handshake, Heart, Lightbulb,
  Megaphone, Music, Palette, Plane, Rocket, Sparkles, Star, TrendingUp, Users, type LucideIcon,
} from 'lucide-react';
import { api } from '../api/client';

/** Icon keys shared with the app (reasons / interests). */
export const ICONS: Record<string, LucideIcon> = {
  users: Users, bulb: Lightbulb, handshake: Handshake, graduation: GraduationCap, trend_up: TrendingUp, coffee: Coffee,
  star: Star, camera: Camera, heart: Heart, briefcase: Briefcase, code: Code, palette: Palette, rocket: Rocket,
  music: Music, book: BookOpen, plane: Plane, dumbbell: Dumbbell, globe: Globe, megaphone: Megaphone, sparkles: Sparkles,
};

export function IconTile({ name, size = 18 }: { name?: string | null; size?: number }) {
  const I = (name && ICONS[name]) || Sparkles;
  return (
    <span className="icon-tile">
      <I size={size} strokeWidth={1.8} />
    </span>
  );
}

/** SyyncIn logo (public/logo.png) on a white card so it reads on the dark sidebar / login panel. */
export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff',
        borderRadius: Math.round(size * 0.22),
        padding: Math.round(size * 0.12),
        lineHeight: 0,
      }}
    >
      <img src="/logo.png" alt="SyyncIn" style={{ height: size, width: 'auto', display: 'block' }} />
    </span>
  );
}

export function Wordmark({ light = true }: { light?: boolean }) {
  return (
    <span style={{ fontWeight: 700, fontSize: 20, letterSpacing: -0.3, color: light ? '#fff' : '#062D69' }}>
      Syync<span style={{ color: '#00CFAE' }}>In</span>
    </span>
  );
}

export function PageHeader({ title, subtitle, extra }: { title: ReactNode; subtitle?: ReactNode; extra?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 240 }}>
        <h1 className="page-title">{title}</h1>
        {subtitle && <div className="page-sub">{subtitle}</div>}
      </div>
      {extra}
    </div>
  );
}

const STATUS: Record<string, { color: string; label: string }> = {
  active: { color: 'success', label: 'Active' },
  inactive: { color: 'default', label: 'Inactive' },
  blocked: { color: 'error', label: 'Blocked' },
  pending: { color: 'warning', label: 'Pending' },
  verified: { color: 'success', label: 'Verified' },
  rejected: { color: 'error', label: 'Rejected' },
  none: { color: 'default', label: 'Not submitted' },
  accepted: { color: 'success', label: 'Accepted' },
  declined: { color: 'default', label: 'Declined' },
  withdrawn: { color: 'default', label: 'Withdrawn' },
};

export function StatusTag({ status }: { status: string }) {
  const s = STATUS[status] || { color: 'default', label: status };
  return (
    <Tag color={s.color} bordered={false} style={{ fontWeight: 500, borderRadius: 6 }}>
      {s.label}
    </Tag>
  );
}

const STEP_LABELS = ['', 'About you', 'Work', 'Interests', 'Mindset', 'Community', 'Selfie', 'Complete'];
export function StepTag({ step }: { step: number }) {
  if (step >= 7) return <Tag color="success" bordered={false} style={{ borderRadius: 6 }}>Complete</Tag>;
  return (
    <Tag bordered={false} style={{ borderRadius: 6 }}>
      Step {Math.min(step, 6)}/6 · {STEP_LABELS[step]}
    </Tag>
  );
}

export function Initials({ name, size = 36 }: { name?: string | null; size?: number }) {
  const t = (name || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  return (
    <span
      style={{
        width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg,#DDEBFF,#D7F7EF)',
        color: '#062D69', display: 'inline-grid', placeItems: 'center', fontWeight: 700, fontSize: size * 0.36, flex: 'none',
      }}
    >
      {t || '?'}
    </span>
  );
}

/** Loads an image that needs the admin bearer token (selfies). */
export function AuthImage({ src, alt }: { src: string; alt: string }) {
  const [url, setUrl] = useState<string>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let objectUrl: string | undefined;
    let alive = true;
    setUrl(undefined);
    setFailed(false);
    api.blob(src.replace(/^\/api\/v1/, ''))
      .then((b) => {
        objectUrl = URL.createObjectURL(b);
        if (alive) setUrl(objectUrl);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);
  if (failed) return <span className="muted" style={{ fontSize: 12 }}>Image unavailable</span>;
  if (!url) return <Skeleton.Image active style={{ width: '100%', height: '100%' }} />;
  return <Image src={url} alt={alt} width="100%" height="100%" style={{ objectFit: 'cover' }} />;
}

export function Bar({ value, max }: { value: number; max: number }) {
  return (
    <div className="bar-track">
      <div className="bar-fill" style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%` }} />
    </div>
  );
}
