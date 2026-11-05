import type { ReactNode } from 'react';
import { Typography } from 'antd';
import {
  ApartmentOutlined, BankOutlined, BulbOutlined, EnvironmentOutlined, FlagOutlined, HeartOutlined,
  QuestionCircleOutlined, RiseOutlined, ToolOutlined,
} from '@ant-design/icons';
import type { BaseItem } from '../api/types';
import { IconTile } from '../components/common';

export type FieldKind = 'text' | 'textarea' | 'number' | 'icon' | 'industry' | 'city' | 'options';

export interface FieldDef {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  max?: number;
  placeholder?: string;
  createOnly?: boolean;
  help?: string;
}

export interface ColumnDef {
  key: string;
  title: string;
  render?: (row: BaseItem) => ReactNode;
  width?: number;
}

export interface MasterType {
  type: string;
  title: string;
  singular: string;
  description: string;
  icon: ReactNode;
  fields: FieldDef[];
  columns: ColumnDef[];
  primary: string; // field used as the row title
  filter?: 'industry' | 'city';
  usedBy: string;
  /** Text field that accepts several comma-separated values when adding (one item is created per value). */
  bulk?: string;
}

const text = (v: unknown) => (v === null || v === undefined || v === '' ? <span className="muted">—</span> : String(v));

export const MASTER_TYPES: MasterType[] = [
  {
    type: 'industries',
    title: 'Industries',
    singular: 'Industry',
    description: 'Shown in Step 2 · Your work → Industry dropdown.',
    icon: <BankOutlined />,
    primary: 'name',
    bulk: 'name',
    fields: [{ name: 'name', label: 'Name', kind: 'text', required: true, max: 100, placeholder: 'e.g. Information Technology, Healthcare, Education' }],
    columns: [{ key: 'name', title: 'Name' }],
    usedBy: 'users and skills',
  },
  {
    type: 'experience-levels',
    title: 'Experience levels',
    singular: 'Experience level',
    description: 'Shown in Step 2 · Years of experience dropdown.',
    icon: <RiseOutlined />,
    primary: 'label',
    fields: [
      { name: 'label', label: 'Label', kind: 'text', required: true, max: 50, placeholder: 'e.g. 3–5 years' },
      { name: 'minYears', label: 'Min years', kind: 'number' },
      { name: 'maxYears', label: 'Max years', kind: 'number', help: 'Leave empty for open-ended (e.g. 10+).' },
    ],
    columns: [
      { key: 'label', title: 'Label' },
      { key: 'range', title: 'Range', width: 160, render: (r) => <span className="mono">{text(r.minYears)} – {r.maxYears == null ? '∞' : String(r.maxYears)} yrs</span> },
    ],
    usedBy: 'users',
  },
  {
    type: 'skills',
    title: 'Skills',
    singular: 'Skill',
    description: 'Searchable in Step 2 · Skills (users pick up to 5).',
    icon: <ToolOutlined />,
    primary: 'name',
    bulk: 'name',
    filter: 'industry',
    fields: [
      { name: 'name', label: 'Name', kind: 'text', required: true, max: 80, placeholder: 'e.g. Flutter, React, Node.js' },
      { name: 'industryId', label: 'Industry (optional)', kind: 'industry', help: 'Skills with an industry are suggested first for users in that industry.' },
    ],
    columns: [
      { key: 'name', title: 'Name' },
      { key: 'industryName', title: 'Industry', width: 240, render: (r) => text(r.industryName) },
    ],
    usedBy: 'users',
  },
  {
    type: 'interests',
    title: 'Interests',
    singular: 'Interest',
    description: 'Chips in Step 3 · Your interests (users pick at least 3).',
    icon: <HeartOutlined />,
    primary: 'name',
    bulk: 'name',
    fields: [
      { name: 'name', label: 'Name', kind: 'text', required: true, max: 60, placeholder: 'e.g. Startups, Travel, Music' },
      { name: 'icon', label: 'Icon (optional)', kind: 'icon' },
    ],
    columns: [
      { key: 'name', title: 'Name', render: (r) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>{r.icon ? <IconTile name={r.icon as string} size={16} /> : null}{String(r.name)}</span> },
    ],
    usedBy: 'users',
  },
  {
    type: 'reasons',
    title: "Reasons (I'm here to…)",
    singular: 'Reason',
    description: "Cards in Step 3 · I'm here to… (users pick 1–3).",
    icon: <FlagOutlined />,
    primary: 'title',
    fields: [
      { name: 'title', label: 'Title', kind: 'text', required: true, max: 80, placeholder: 'e.g. Grow my network' },
      { name: 'subtitle', label: 'Description', kind: 'text', required: true, max: 160, placeholder: 'e.g. Meet professionals beyond my circle' },
      { name: 'icon', label: 'Icon', kind: 'icon', required: true },
    ],
    columns: [
      {
        key: 'title',
        title: 'Reason',
        render: (r) => (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
            <IconTile name={r.icon as string} />
            <span>
              <div style={{ fontWeight: 500 }}>{String(r.title)}</div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{String(r.subtitle)}</Typography.Text>
            </span>
          </span>
        ),
      },
    ],
    usedBy: 'users',
  },
  {
    type: 'mindset-questions',
    title: 'Mindset questions',
    singular: 'Question',
    description: 'Step 4 · Your mindset. Every active question must be answered — expand a row to manage its options.',
    icon: <QuestionCircleOutlined />,
    primary: 'question',
    fields: [
      { name: 'question', label: 'Question', kind: 'text', required: true, max: 160, placeholder: 'e.g. What motivates you most?' },
      { name: 'options', label: 'Answer options', kind: 'options', createOnly: true, help: '2–6 options. You can add more later.' },
    ],
    columns: [
      { key: 'question', title: 'Question' },
      { key: 'options', title: 'Options', width: 120, render: (r) => <span className="mono">{(r.options as unknown[] | undefined)?.length ?? 0}</span> },
    ],
    usedBy: 'user answers',
  },
  {
    type: 'cities',
    title: 'Cities',
    singular: 'City',
    description: 'Step 5 · Your community → City search.',
    icon: <EnvironmentOutlined />,
    primary: 'name',
    fields: [
      { name: 'name', label: 'City', kind: 'text', required: true, max: 80, placeholder: 'e.g. Ahmedabad' },
      { name: 'state', label: 'State', kind: 'text', required: true, max: 80, placeholder: 'e.g. Gujarat' },
      { name: 'lat', label: 'Latitude', kind: 'number' },
      { name: 'lng', label: 'Longitude', kind: 'number' },
    ],
    columns: [
      { key: 'name', title: 'City' },
      { key: 'state', title: 'State', width: 180 },
      { key: 'localityCount', title: 'Localities', width: 110, render: (r) => <span className="mono">{String(r.localityCount ?? 0)}</span> },
    ],
    usedBy: 'users or localities',
  },
  {
    type: 'localities',
    title: 'Localities',
    singular: 'Locality',
    description: 'Step 5 · Neighbourhood or locality (filtered by city).',
    icon: <ApartmentOutlined />,
    primary: 'name',
    bulk: 'name',
    filter: 'city',
    fields: [
      { name: 'cityId', label: 'City', kind: 'city', required: true },
      { name: 'name', label: 'Locality', kind: 'text', required: true, max: 100, placeholder: 'e.g. South Bopal, Bopal, Satellite' },
    ],
    columns: [
      { key: 'name', title: 'Locality' },
      { key: 'cityName', title: 'City', width: 200 },
    ],
    usedBy: 'users',
  },
];

export const MASTER_BY_TYPE = Object.fromEntries(MASTER_TYPES.map((m) => [m.type, m]));
export const masterIcon = { default: <BulbOutlined /> };
