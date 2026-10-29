import type { KeyboardEvent, PointerEvent } from 'react';
import styles from './Splitter.module.css';

interface SplitterProps {
  /** Current size of the panel the splitter resizes (px). */
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  onDragChange?: (dragging: boolean) => void;
  label: string;
  /** Maps the pointer's x to a value; defaults to x itself (panel starts at the window edge). */
  fromPointer?: (clientX: number) => number;
}

const KEY_STEP = 16;

/** Vertical drag handle on the right edge of a left-hand panel. Pointer and keyboard driven. */
export function Splitter({
  value,
  min,
  max,
  onChange,
  onDragChange,
  label,
  fromPointer,
}: SplitterProps) {
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    onDragChange?.(true);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    onChange(fromPointer ? fromPointer(e.clientX) : e.clientX);
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    onDragChange?.(false);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') onChange(value - KEY_STEP);
    else if (e.key === 'ArrowRight') onChange(value + KEY_STEP);
    else return;
    e.preventDefault();
  };

  return (
    <div
      className={styles.splitter}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    />
  );
}
