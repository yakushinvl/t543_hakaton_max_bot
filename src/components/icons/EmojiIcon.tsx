import React from 'react';
import { getEmojiInner, getEmojiSvg, splitByEmoji } from './emojiIcons';
import './EmojiIcon.css';

interface EmojiIconProps {
  /** Эмодзи-ключ, например '🎸' */
  e: string;
  /** Размер иконки (по умолчанию подстраивается под font-size родителя) */
  size?: number | string;
  className?: string;
}

/** Собственная SVG-иконка вместо системного эмодзи; неизвестные эмодзи выводятся как есть */
export const EmojiIcon: React.FC<EmojiIconProps> = ({ e, size, className = '' }) => {
  const svg = getEmojiSvg(e);
  if (!svg) return <span className={className}>{e}</span>;

  const style = size !== undefined ? { width: size, height: size } : undefined;
  return (
    <span
      className={`emoji-icon ${className}`.trim()}
      style={style}
      role="img"
      aria-hidden="true"
      // Разметка берётся только из статического набора иконок в emojiIcons.ts
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

/** Текст, в котором все известные эмодзи заменены на SVG-иконки */
export const EmojiText: React.FC<{ text: string; className?: string }> = ({ text, className }) => (
  <>
    {splitByEmoji(text).map((part, i) =>
      part.emoji ? (
        <EmojiIcon key={i} e={part.text} className={className} />
      ) : (
        <React.Fragment key={i}>{part.text}</React.Fragment>
      )
    )}
  </>
);

/** Иконка внутри другого SVG: центр в (cx, cy), сторона size */
export const SvgEmoji: React.FC<{ e: string; cx: number; cy: number; size: number }> = ({ e, cx, cy, size }) => {
  const inner = getEmojiInner(e);
  if (!inner) return null;
  return (
    <svg
      x={cx - size / 2}
      y={cy - size / 2}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      overflow="visible"
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
};
