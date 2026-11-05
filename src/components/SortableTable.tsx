import { createContext, useContext, useMemo, type CSSProperties, type HTMLAttributes } from 'react';
import { Button } from 'antd';
import { HolderOutlined } from '@ant-design/icons';
import type { DraggableSyntheticListeners } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface RowCtx {
  setActivatorNodeRef?: (el: HTMLElement | null) => void;
  listeners?: DraggableSyntheticListeners;
}
const RowContext = createContext<RowCtx>({});

export function DragHandle() {
  const { setActivatorNodeRef, listeners } = useContext(RowContext);
  return (
    <Button
      type="text"
      size="small"
      className="drag-handle"
      icon={<HolderOutlined />}
      ref={setActivatorNodeRef}
      aria-label="Drag to reorder"
      {...listeners}
    />
  );
}

interface RowProps extends HTMLAttributes<HTMLTableRowElement> {
  'data-row-key': string | number;
}

/** Table body row that can be dragged (antd Table `components.body.row`). */
export function SortableRow(props: RowProps) {
  const id = Number(props['data-row-key']);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = {
    ...props.style,
    transform: CSS.Translate.toString(transform),
    transition,
    ...(isDragging ? { position: 'relative', zIndex: 9, background: '#F0F6FD', boxShadow: '0 6px 20px rgba(6,45,105,0.12)' } : {}),
  };
  const ctx = useMemo<RowCtx>(() => ({ setActivatorNodeRef, listeners }), [setActivatorNodeRef, listeners]);
  return (
    <RowContext.Provider value={ctx}>
      <tr {...props} ref={setNodeRef} style={style} {...attributes} />
    </RowContext.Provider>
  );
}
