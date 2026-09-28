import React, { useState, useRef, useMemo } from 'react';
import { getAllInterests, type InterestConfigItem } from '../../config/interests.config';
import { triggerHaptic } from '../../lib/maxBridge';
import { Check } from 'lucide-react';
import './AppleWatchGrid.css';

interface AppleWatchGridProps {
  selectedInterests: string[];
  onToggle: (id: string) => void;
}

interface HexSpherePos {
  item: InterestConfigItem;
  x: number;
  y: number;
}

// Генерация концентрических шестиугольников по часовой стрелке с равным шагом
function getHexLatticePositions(count: number, spacing: number): { x: number; y: number }[] {
  const result: { x: number; y: number }[] = [];
  if (count <= 0) return result;

  // Центр (0, 0)
  result.push({ x: 0, y: 0 });
  if (result.length >= count) return result;

  const sin60 = Math.sqrt(3) / 2;
  let ring = 1;

  while (result.length < count) {
    // 6 угловых вершин шестиугольника радиуса ring (начиная с 12 часов по часовой стрелке)
    const corners = [
      { x: 0, y: -ring * spacing },                        // 12 часов
      { x: ring * spacing * sin60, y: -0.5 * ring * spacing }, // 2 часа
      { x: ring * spacing * sin60, y: 0.5 * ring * spacing },  // 4 часа
      { x: 0, y: ring * spacing },                         // 6 часов
      { x: -ring * spacing * sin60, y: 0.5 * ring * spacing }, // 8 часов
      { x: -ring * spacing * sin60, y: -0.5 * ring * spacing },// 10 часов
    ];

    for (let c = 0; c < 6; c++) {
      const c1 = corners[c];
      const c2 = corners[(c + 1) % 6];
      for (let s = 0; s < ring; s++) {
        const x = c1.x + (s / ring) * (c2.x - c1.x);
        const y = c1.y + (s / ring) * (c2.y - c1.y);
        result.push({ x: Math.round(x), y: Math.round(y) });
        if (result.length >= count) return result;
      }
    }
    ring++;
  }

  return result;
}

export const AppleWatchGrid: React.FC<AppleWatchGridProps> = ({
  selectedInterests,
  onToggle,
}) => {
  const SPACING = 106; // Равное расстояние между центрами соседних сфер

  const spherePositions = useMemo<HexSpherePos[]>(() => {
    const list = getAllInterests();
    const coords = getHexLatticePositions(list.length, SPACING);
    return list.map((item, idx) => ({
      item,
      x: coords[idx].x,
      y: coords[idx].y,
    }));
  }, []);

  // Перемещение (Drag / Pan) и Масштабирование (Zoom)
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  // Для жеста pinch-to-zoom (двумя пальцами)
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartScale = useRef(1);

  const clamp = (val: number, max: number) => Math.max(-max, Math.min(max, val));
  const clampScale = (s: number) => Math.max(0.74, Math.min(1.28, Math.round(s * 100) / 100));

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    hasMoved.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

    if (Math.hypot(dx, dy) > 5) {
      hasMoved.current = true;
    }

    setPan({
      x: clamp(panStart.current.x + dx, 260),
      y: clamp(panStart.current.y + dy, 260),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Колесо мыши / трекпад для масштабирования
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.0015;
    setScale((prev) => clampScale(prev + delta));
  };

  // Жест pinch-to-zoom двумя пальцами на смартфонах
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDist.current = dist;
      pinchStartScale.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDist.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / pinchStartDist.current;
      setScale(clampScale(pinchStartScale.current * factor));
    }
  };

  const handleTouchEnd = () => {
    pinchStartDist.current = null;
  };

  const handleSphereClick = (item: InterestConfigItem) => {
    if (hasMoved.current) return;
    triggerHaptic('selection');
    onToggle(item.id);
  };

  return (
    <div
      className="apple-watch-container"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="hex-pattern-board"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
        }}
      >
        {spherePositions.map(({ item, x, y }) => {
          const isSelected = selectedInterests.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              className={`hex-sphere-bubble ${isSelected ? 'selected' : ''}`}
              style={{
                transform: `translate3d(calc(${x}px - 50%), calc(${y}px - 50%), 0)`,
              }}
              onClick={() => handleSphereClick(item)}
              aria-label={item.label}
            >
              <div className="sphere-inner">
                <span className="sphere-emoji">{item.emoji}</span>
                <span className="sphere-label">{item.label}</span>
                {isSelected && (
                  <div className="sphere-check">
                    <Check size={13} strokeWidth={3} color="#ffffff" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Плавное градиентное пропадание только сверху и снизу в цвет фона */}
      <div className="apple-watch-edge-fade edge-top" />
      <div className="apple-watch-edge-fade edge-bottom" />
    </div>
  );
};
