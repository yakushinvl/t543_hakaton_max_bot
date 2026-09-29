/**
 * Собственный набор цветных SVG-иконок вместо системных эмодзи.
 * Ключ — эмодзи (без вариационного селектора U+FE0F), значение — содержимое <svg viewBox="0 0 32 32">.
 * Иконки не используют id/градиенты, чтобы их можно было безопасно рендерить много раз на странице.
 */

const SKIN = '#f8c9a0';
const SKIN_DARK = '#e0a878';
const INK = '#2d2f3a';
const BLUE = '#4c8dff';
const BLUE_DARK = '#2f6fe0';
const PINK = '#ff5a8a';
const RED = '#ff5a5f';
const ORANGE = '#ff8a3d';
const YELLOW = '#ffc53d';
const GREEN = '#3fb86b';
const TEAL = '#2ed3b7';
const PURPLE = '#8e6cf0';
const GRAY = '#9aa3b5';
const LIGHT = '#e8ecf5';

// ---------- Хелперы ----------

/** Четырёхлучевая «искра» с вогнутыми гранями */
const spark = (cx: number, cy: number, r: number, fill: string) =>
  `<path d="M${cx} ${cy - r}Q${cx} ${cy} ${cx + r} ${cy}Q${cx} ${cy} ${cx} ${cy + r}Q${cx} ${cy} ${cx - r} ${cy}Q${cx} ${cy} ${cx} ${cy - r}Z" fill="${fill}"/>`;

/** Пятиконечная звезда */
const star5 = (cx: number, cy: number, R: number, r: number, fill: string) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${fill}" stroke-width="1.6" stroke-linejoin="round"/>`;
};

/** Фигурка человека: голова + плечи */
const person = (cx: number, cy: number, r: number, color: string, skin = SKIN) =>
  `<path d="M${cx - 1.9 * r} ${cy + 4.2 * r}a${1.9 * r} ${1.9 * r} 0 0 1 ${3.8 * r} 0z" fill="${color}"/>` +
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${skin}"/>`;

/** Портрет: плечи, лицо и глаза; волосы передаются слоями до/после лица */
const face = (opts: { shirt: string; hairBack?: string; hairFront?: string; extra?: string }) =>
  `<path d="M6 31c1-4.8 5-7 10-7s9 2.2 10 7z" fill="${opts.shirt}"/>` +
  (opts.hairBack || '') +
  `<rect x="14" y="20" width="4" height="4.5" fill="${SKIN_DARK}"/>` +
  `<circle cx="16" cy="15" r="8" fill="${SKIN}"/>` +
  (opts.hairFront || '') +
  `<circle cx="12.9" cy="15.6" r="1.1" fill="#3a2a20"/><circle cx="19.1" cy="15.6" r="1.1" fill="#3a2a20"/>` +
  `<path d="M13.6 18.8q2.4 1.9 4.8 0" stroke="#c0704f" stroke-width="1.3" fill="none" stroke-linecap="round"/>` +
  (opts.extra || '');

const shortHair = (c: string) =>
  `<path d="M8 14.5C8 9.3 11.5 6.5 16 6.5s8 2.8 8 8c-1.2-2.3-3-3.4-5.2-3.8-1.4 1.5-4.4 2.4-7.4 2.1-1.5.2-2.6.9-3.4 1.7z" fill="${c}"/>`;
const longHairBack = (c: string) =>
  `<path d="M6.5 15C6.5 9 10.5 5.8 16 5.8S25.5 9 25.5 15v11h-19z" fill="${c}"/>`;
const fringe = (c: string) =>
  `<path d="M8 14c.6-4.8 3.8-7.4 8-7.4s7.4 2.6 8 7.4c-3-.4-6.2-1.8-8-4-1.8 2.2-5 3.6-8 4z" fill="${c}"/>`;

/** Ладонь с растопыренными пальцами (центр ладони в 0,0 — поворачивается снаружи) */
const hand = (fill: string) =>
  `<rect x="-6.5" y="-2" width="13" height="11" rx="5" fill="${fill}"/>` +
  `<rect x="-6.3" y="-10" width="3" height="10" rx="1.5" fill="${fill}"/>` +
  `<rect x="-2.9" y="-12" width="3" height="12" rx="1.5" fill="${fill}"/>` +
  `<rect x=".5" y="-11.5" width="3" height="11.5" rx="1.5" fill="${fill}"/>` +
  `<rect x="3.8" y="-9" width="2.8" height="9" rx="1.4" fill="${fill}"/>` +
  `<rect x="-11" y="-1" width="3" height="8" rx="1.5" fill="${fill}" transform="rotate(-40 -9.5 3)"/>`;

const heart = (fill: string) =>
  `<path d="M16 27.5S4.5 20.8 4.5 12.8A6.2 6.2 0 0 1 16 9.4a6.2 6.2 0 0 1 11.5 3.4c0 8-11.5 14.7-11.5 14.7z" fill="${fill}"/>` +
  `<path d="M8.5 11.5a3 3 0 0 1 3.5-2" stroke="#fff" stroke-opacity=".6" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;

// ---------- Иконки ----------

const ICONS: Record<string, string> = {
  // ===== Настроение (вопросы Флюгера) =====
  '✨': spark(13, 18, 10, YELLOW) + spark(24.5, 7.5, 5, '#ffd970') + spark(25, 24.5, 3, '#ffe39a'),
  '🛋':
    `<path d="M27 8v19" stroke="${GRAY}" stroke-width="1.6"/><ellipse cx="27" cy="27.5" rx="3" ry="1" fill="${GRAY}"/>` +
    `<path d="M23.8 3.5h6.4l1.6 5.5h-9.6z" fill="${YELLOW}"/><circle cx="27" cy="10.5" r="1.3" fill="#fff3b0"/>` +
    `<rect x="4" y="12" width="17" height="9" rx="3" fill="${BLUE}"/>` +
    `<rect x="1.5" y="16" width="5" height="9" rx="2" fill="${BLUE_DARK}"/><rect x="18.5" y="16" width="5" height="9" rx="2" fill="${BLUE_DARK}"/>` +
    `<rect x="5.5" y="19" width="14" height="5" rx="1.5" fill="#6aa4ff"/>` +
    `<path d="M4 25v2.5M21 25v2.5" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`,
  '⚡':
    `<path d="M19 2L6 18h8.5L12 30l13-17h-8.5z" fill="${YELLOW}"/>` +
    `<path d="M19 2l-5 11h11zM14.5 18L12 30l7-11z" fill="${ORANGE}" opacity=".55"/>`,
  '🌿':
    `<path d="M7 29C10 19 16 11 26 4" stroke="${GREEN}" stroke-width="1.8" fill="none" stroke-linecap="round"/>` +
    `<ellipse cx="11" cy="17" rx="5.5" ry="2.4" transform="rotate(-35 11 17)" fill="#7ccf6e"/>` +
    `<ellipse cx="20" cy="18" rx="5" ry="2.2" transform="rotate(20 20 18)" fill="#5bbd5e"/>` +
    `<ellipse cx="15.5" cy="9.5" rx="5" ry="2.2" transform="rotate(-60 15.5 9.5)" fill="#5bbd5e"/>` +
    `<ellipse cx="23.5" cy="10.5" rx="4.4" ry="2" transform="rotate(10 23.5 10.5)" fill="#7ccf6e"/>` +
    `<ellipse cx="8.5" cy="24.5" rx="4.2" ry="1.9" transform="rotate(25 8.5 24.5)" fill="#7ccf6e"/>`,

  // ===== Компания =====
  '🚶':
    `<circle cx="17.5" cy="5.5" r="3.2" fill="${SKIN}"/>` +
    `<path d="M14.5 18l-4 10M14.5 18l4.5 5 1 5.5" stroke="${INK}" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M16.5 10.5L14.5 18" stroke="${BLUE}" stroke-width="4.4" stroke-linecap="round"/>` +
    `<path d="M16 12.5l-4.5 4M16.5 12l4 4" stroke="${BLUE}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`,
  '💖':
    heart(PINK) + spark(26, 6, 3.5, YELLOW) + spark(5, 6.5, 2.4, '#ffd970'),
  '❤': heart('#ff3b5c'),
  '👥': person(20.5, 9, 4, '#8fb4ff') + person(12, 12, 4.4, BLUE),
  '👨‍👩‍👧':
    person(9.5, 8.5, 3.6, BLUE) +
    `<path d="M5.8 8.5c0-3 1.6-4.6 3.7-4.6s3.7 1.6 3.7 4.2c-1.4-.8-3.4-1.4-7.4.4z" fill="#3b2a20"/>` +
    `<path d="M18.4 9.5c0-3.4 1.8-5.4 4.1-5.4s4.1 2 4.1 5.4v3.5h-8.2z" fill="#6b3a22"/>` +
    person(22.5, 8.5, 3.6, PINK) +
    person(16, 17.5, 3, YELLOW) +
    `<circle cx="16" cy="14.2" r="1.6" fill="#a0522d"/>`,

  // ===== Категории и интересы =====
  '🎸':
    `<circle cx="11" cy="22" r="6.5" fill="${ORANGE}"/><circle cx="15.5" cy="17.5" r="4.6" fill="${ORANGE}"/>` +
    `<circle cx="12.6" cy="20.4" r="1.9" fill="#4a2a10"/>` +
    `<path d="M14 18.5L25.5 7" stroke="#7a4a24" stroke-width="2.6" stroke-linecap="round"/>` +
    `<rect x="23.5" y="2.5" width="6" height="4" rx="1.5" transform="rotate(45 26.5 4.5)" fill="#5b3413"/>` +
    `<path d="M8.5 24.5l2 2" stroke="#4a2a10" stroke-width="2" stroke-linecap="round"/>`,
  '🎨':
    `<path d="M16 4C9.2 4 4 9.1 4 15.6 4 22.4 9.1 28 15.2 28c2 0 2.6-1.4 2-2.7-.7-1.5.3-3.1 2-3.1h3c3.5 0 5.8-2.6 5.8-6C28 9.4 22.6 4 16 4z" fill="#f5c26b"/>` +
    `<circle cx="10" cy="12.5" r="2.3" fill="${RED}"/><circle cx="15.5" cy="9" r="2.3" fill="${BLUE}"/>` +
    `<circle cx="21.5" cy="11" r="2.3" fill="${TEAL}"/><circle cx="9.8" cy="19" r="2.3" fill="${PURPLE}"/>` +
    `<circle cx="20.5" cy="17.5" r="2" fill="#d9a24a"/>`,
  '🎭':
    `<g transform="rotate(14 21 13)"><path d="M14.5 6.5c4-1.5 9-1.5 13 0v6.5c0 5-3 8.5-6.5 8.5s-6.5-3.5-6.5-8.5z" fill="${PURPLE}"/>` +
    `<path d="M17 11.5q1.5 1.3 3 0M22 11.5q1.5 1.3 3 0" stroke="#2a1a55" stroke-width="1.4" fill="none" stroke-linecap="round"/>` +
    `<path d="M18 17.5q3-2.8 6 0" stroke="#2a1a55" stroke-width="1.4" fill="none" stroke-linecap="round"/></g>` +
    `<g transform="rotate(-12 10 17)"><path d="M3.5 10.5c4-1.5 9-1.5 13 0V17c0 5-3 8.5-6.5 8.5S3.5 22 3.5 17z" fill="${YELLOW}"/>` +
    `<path d="M6 15.5q1.5-1.5 3 0M11 15.5q1.5-1.5 3 0" stroke="#6a4000" stroke-width="1.4" fill="none" stroke-linecap="round"/>` +
    `<path d="M6.8 19.3q3.2 3.4 6.4 0" stroke="#6a4000" stroke-width="1.5" fill="none" stroke-linecap="round"/></g>`,
  '🎬':
    `<rect x="4" y="13" width="24" height="15" rx="2.5" fill="${INK}"/>` +
    `<path d="M8 17h16M8 21h10" stroke="#5c6070" stroke-width="1.6" stroke-linecap="round"/>` +
    `<g transform="rotate(-14 5 12)"><rect x="4" y="7" width="24" height="5" rx="1" fill="${INK}"/>` +
    `<path d="M8 7h3l-2 5H6zM15 7h3l-2 5h-3zM22 7h3l-2 5h-3z" fill="#fff"/></g>`,
  '🍕':
    `<path d="M16 29L4.2 7.5Q16 2 27.8 7.5z" fill="#ffd36b"/>` +
    `<path d="M4.2 7.5Q16 2 27.8 7.5l-1.6 3Q16 5.6 5.8 10.5z" fill="#e0913a"/>` +
    `<circle cx="12.5" cy="12.8" r="2.3" fill="#e8483f"/><circle cx="19.5" cy="13.5" r="2.1" fill="#e8483f"/>` +
    `<circle cx="16" cy="20" r="1.9" fill="#e8483f"/><ellipse cx="16.5" cy="10.5" rx="1.4" ry=".8" fill="${GREEN}"/>`,
  '🎪':
    `<path d="M16 5V1.5l4 1.3-4 1.3" fill="${YELLOW}"/>` +
    `<path d="M16 5L28 15H4z" fill="${RED}"/><path d="M16 5l-4 10h8z" fill="#fff"/>` +
    `<rect x="6" y="15" width="20" height="12" fill="#fff"/>` +
    `<path d="M6 15h4v12H6zM14 15h4v12h-4zM22 15h4v12h-4z" fill="${RED}"/>` +
    `<path d="M12.5 27l3.5-8 3.5 8z" fill="#3a2a5a"/>`,
  '🎉':
    `<path d="M4 28l6.5-15.5 9 9z" fill="${YELLOW}"/>` +
    `<path d="M7.2 20.3l4.5 4.5M9 16l7 7" stroke="${PINK}" stroke-width="2"/>` +
    `<path d="M15 12c1-3 4-3 4-6M20 16c3-1 4 1 7-1" stroke="${PURPLE}" stroke-width="1.8" fill="none" stroke-linecap="round"/>` +
    `<rect x="21" y="4" width="3" height="5" rx="1" transform="rotate(25 22.5 6.5)" fill="${TEAL}"/>` +
    `<rect x="24.5" y="11" width="3" height="4.5" rx="1" transform="rotate(-30 26 13)" fill="${BLUE}"/>` +
    `<circle cx="13" cy="6" r="1.6" fill="${RED}"/><circle cx="27" cy="21" r="1.6" fill="${YELLOW}"/><circle cx="18" cy="2.8" r="1.2" fill="${BLUE}"/>`,
  '🎤':
    `<path d="M16.5 15.5L6 26.5" stroke="${INK}" stroke-width="4.6" stroke-linecap="round"/>` +
    `<path d="M15 17l2.5 2.5" stroke="${GRAY}" stroke-width="3" stroke-linecap="round"/>` +
    `<circle cx="20.5" cy="11.5" r="6.5" fill="#b8c2d6"/>` +
    `<path d="M16.5 9l6.5 6.5M18.5 7l6.5 6.5M15 12.5l5 5" stroke="#8a94aa" stroke-width="1"/>` +
    `<circle cx="18.5" cy="9" r="1.6" fill="#fff" opacity=".8"/>`,
  '🏀':
    `<circle cx="16" cy="16" r="12" fill="${ORANGE}"/>` +
    `<path d="M4 16h24M16 4v24M8 7q5 9 0 18M24 7q-5 9 0 18" stroke="#7a3a10" stroke-width="1.4" fill="none"/>`,
  '⚽':
    `<circle cx="16" cy="16" r="12" fill="#fff" stroke="${INK}" stroke-width="1.6"/>` +
    `<polygon points="16,11.5 20.3,14.6 18.6,19.6 13.4,19.6 11.7,14.6" fill="${INK}"/>` +
    `<path d="M16 11.5V5.5M20.3 14.6l5.4-2M18.6 19.6l3.4 5M13.4 19.6l-3.4 5M11.7 14.6l-5.4-2" stroke="${INK}" stroke-width="1.4"/>` +
    `<path d="M13 4.6l3 1 3-1M25.2 10l.6 3.4 2.1 1M23.4 25.2l-1.4-.6-2.4 2.3M8.6 25.2l1.4-.6 2.4 2.3M6.8 10l-.6 3.4-2.1 1" fill="${INK}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>`,
  '🎲':
    `<rect x="13" y="3" width="15" height="15" rx="3.5" transform="rotate(15 20.5 10.5)" fill="${PURPLE}"/>` +
    `<circle cx="17.5" cy="7.5" r="1.4" fill="#fff"/><circle cx="23.5" cy="13" r="1.4" fill="#fff"/>` +
    `<rect x="4" y="11" width="16" height="16" rx="3.8" transform="rotate(-10 12 19)" fill="#fff" stroke="#cfd5e2" stroke-width="1.2"/>` +
    `<circle cx="8.5" cy="15.5" r="1.5" fill="${RED}"/><circle cx="12" cy="19" r="1.5" fill="${RED}"/><circle cx="15.5" cy="22.5" r="1.5" fill="${RED}"/>`,
  '💡':
    `<path d="M16 1.5v2.5M5 6.5l1.8 1.8M27 6.5l-1.8 1.8M2 16h2.5M27.5 16H30" stroke="${YELLOW}" stroke-width="1.8" stroke-linecap="round"/>` +
    `<path d="M16 5.5a8.5 8.5 0 0 0-5 15.4V23h10v-2.1a8.5 8.5 0 0 0-5-15.4z" fill="#ffd84a"/>` +
    `<path d="M13.5 20l1-6 1.5 2 1.5-2 1 6" stroke="#e0851a" stroke-width="1.3" fill="none" stroke-linejoin="round"/>` +
    `<rect x="11.5" y="23" width="9" height="3" rx="1" fill="#b8c2d6"/><rect x="13" y="26.5" width="6" height="2.5" rx="1.2" fill="${GRAY}"/>`,
  '🌲':
    `<rect x="14.5" y="24" width="3" height="5.5" rx="1" fill="#8b5a2b"/>` +
    `<path d="M16 2.5l7 8.5h-3.5l5.5 7h-3.5l5 6h-21l5-6H8l5.5-7H10z" fill="#3fb86b"/>` +
    `<path d="M16 2.5l7 8.5h-3.5l5.5 7h-3.5l5 6H16z" fill="#2c9a57"/>`,
  '🪩':
    `<path d="M16 1v5" stroke="${GRAY}" stroke-width="1.4"/>` +
    `<circle cx="16" cy="17" r="11" fill="#c9d6ea"/>` +
    `<ellipse cx="16" cy="17" rx="4.5" ry="11" fill="none" stroke="#8a97b0" stroke-width="1"/>` +
    `<ellipse cx="16" cy="17" rx="8.5" ry="11" fill="none" stroke="#8a97b0" stroke-width="1"/>` +
    `<path d="M7.5 10h17M5.4 14h21.2M5 18h22M6.2 22h19.6" stroke="#8a97b0" stroke-width="1"/>` +
    `<path d="M9.5 9.5l3 0 0 3-3 0z" fill="#fff"/>` + spark(25.5, 7, 3.4, YELLOW) + spark(5.5, 26, 2.4, PINK),
  '🎷':
    `<path d="M21 3.5V18a6.5 6.5 0 0 1-13 0v-1.5" stroke="#f2b632" stroke-width="5" fill="none" stroke-linecap="round"/>` +
    `<path d="M4 12.5h8l-1.2 4H5.2z" fill="#e09a18"/>` +
    `<path d="M21 3.5l4.5-1.8" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` +
    `<circle cx="21" cy="9" r="1.3" fill="#fff4c2"/><circle cx="21" cy="13" r="1.3" fill="#fff4c2"/><circle cx="20.4" cy="17.4" r="1.3" fill="#fff4c2"/>`,
  '🍷':
    `<path d="M10 3.5h12c0 7.5-2.2 12.5-6 12.5S10 11 10 3.5z" fill="#e4e8f0"/>` +
    `<path d="M10.4 8h11.2c-.5 5-2.5 8-5.6 8s-5.1-3-5.6-8z" fill="#c2185b"/>` +
    `<rect x="15" y="15.5" width="2" height="10" fill="#d0d6e2"/><ellipse cx="16" cy="26.5" rx="5.5" ry="1.8" fill="#d0d6e2"/>` +
    `<path d="M12 5.5q0 3 1 5" stroke="#fff" stroke-width="1.2" fill="none" stroke-linecap="round"/>`,
  '🧸':
    `<circle cx="8.5" cy="8" r="3.8" fill="#c98a4b"/><circle cx="23.5" cy="8" r="3.8" fill="#c98a4b"/>` +
    `<circle cx="8.5" cy="8" r="1.8" fill="#e8b27a"/><circle cx="23.5" cy="8" r="1.8" fill="#e8b27a"/>` +
    `<ellipse cx="16" cy="25" rx="8" ry="6" fill="#c98a4b"/><ellipse cx="16" cy="25.5" rx="4.5" ry="3.8" fill="#e8b27a"/>` +
    `<circle cx="16" cy="13.5" r="8" fill="#d6995a"/><ellipse cx="16" cy="16.5" rx="4" ry="3" fill="#f0c89a"/>` +
    `<circle cx="12.8" cy="12.3" r="1.2" fill="#3a2410"/><circle cx="19.2" cy="12.3" r="1.2" fill="#3a2410"/>` +
    `<ellipse cx="16" cy="15.4" rx="1.6" ry="1.1" fill="#3a2410"/>`,
  '🤝':
    `<rect x="0" y="12" width="7" height="10" rx="2" transform="rotate(-20 3.5 17)" fill="${BLUE}"/>` +
    `<rect x="25" y="12" width="7" height="10" rx="2" transform="rotate(20 28.5 17)" fill="${ORANGE}"/>` +
    `<path d="M6.5 13.5l5.5-3.5 4 2 4-2 5.5 3.5v6l-5.5 5.5h-7l-6.5-5.5z" fill="${SKIN}"/>` +
    `<path d="M11.5 17.5l3.5 3.5M14 15.5l4 4M16.5 13.5l3.5 3.5" stroke="${SKIN_DARK}" stroke-width="1.3" stroke-linecap="round"/>`,
  '♟':
    `<circle cx="16" cy="8" r="4.2" fill="${INK}"/><rect x="11" y="12.5" width="10" height="2.4" rx="1.2" fill="${INK}"/>` +
    `<path d="M12.8 15h6.4l2 7.5h-10.4z" fill="${INK}"/><rect x="8" y="22.5" width="16" height="5" rx="2" fill="${INK}"/>` +
    `<circle cx="14.6" cy="6.6" r="1.2" fill="#fff" opacity=".5"/>`,
  '🔭':
    `<path d="M16 17l-6 11.5M16 17l6 11.5M16 17v11.5" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` +
    `<g transform="rotate(-25 16 14)"><rect x="5" y="10" width="19" height="7" rx="2" fill="${BLUE}"/>` +
    `<rect x="22.5" y="8.8" width="4.5" height="9.4" rx="1.5" fill="${BLUE_DARK}"/><rect x="2.5" y="11.5" width="3" height="4" rx="1" fill="${INK}"/></g>` +
    spark(27, 4, 3, YELLOW),
  '📸':
    `<path d="M10 9.5l2-3.2h8l2 3.2z" fill="${INK}"/><rect x="3" y="9" width="26" height="17.5" rx="4" fill="#3a3f55"/>` +
    `<circle cx="16" cy="17.6" r="6.3" fill="#1f2230"/><circle cx="16" cy="17.6" r="4.3" fill="#8fb4ff"/>` +
    `<circle cx="14.6" cy="16.2" r="1.3" fill="#fff" opacity=".8"/><rect x="6" y="11.5" width="4" height="2.4" rx="1" fill="${YELLOW}"/>` +
    spark(27, 5, 4, YELLOW),
  '📚':
    `<rect x="4" y="6" width="6.5" height="21" rx="1.2" fill="${RED}"/><rect x="11" y="4" width="6.5" height="23" rx="1.2" fill="${BLUE}"/>` +
    `<rect x="19" y="7" width="6.5" height="20" rx="1.2" transform="rotate(12 22 17)" fill="${TEAL}"/>` +
    `<path d="M4 10h6.5M4 23h6.5M11 8h6.5M11 23h6.5" stroke="#fff" stroke-opacity=".7" stroke-width="1.2"/>` +
    `<rect x="3" y="27" width="26" height="2" rx="1" fill="${GRAY}"/>`,
  '🧘':
    `<ellipse cx="16" cy="24" rx="11.5" ry="4" fill="#6b4fd6"/>` +
    `<path d="M11.5 11.5h9l1.5 10.5h-12z" fill="${PURPLE}"/>` +
    `<path d="M12 12.5l-4.5 8M20 12.5l4.5 8" stroke="${SKIN}" stroke-width="2.6" stroke-linecap="round"/>` +
    `<circle cx="7.3" cy="21" r="1.8" fill="${SKIN}"/><circle cx="24.7" cy="21" r="1.8" fill="${SKIN}"/>` +
    `<circle cx="16" cy="6.5" r="3.6" fill="${SKIN}"/><path d="M12.6 5.8c.3-2.3 1.7-3.6 3.4-3.6s3.1 1.3 3.4 3.6c-2.2-.9-4.6-.9-6.8 0z" fill="#3b2a20"/>`,
  '🏎':
    `<path d="M2.5 13h5v6" stroke="${INK}" stroke-width="2" fill="none"/>` +
    `<path d="M3 21q0-4.5 5-5.5l5.5-3.5h6l4.5 3.5h4q2 0 2 2.2V21z" fill="#ff3b3b"/>` +
    `<path d="M14 12.8l-2.5 3h9l-2-3z" fill="#bfe0ff"/><circle cx="17" cy="18" r="1.9" fill="#fff"/>` +
    `<circle cx="9" cy="21.5" r="3.8" fill="${INK}"/><circle cx="24" cy="21.5" r="3.8" fill="${INK}"/>` +
    `<circle cx="9" cy="21.5" r="1.4" fill="#c0c6d4"/><circle cx="24" cy="21.5" r="1.4" fill="#c0c6d4"/>`,

  // ===== Люди =====
  '👤':
    `<circle cx="16" cy="11" r="6" fill="${GRAY}"/><path d="M5 28.5c1-6 5.5-9 11-9s10 3 11 9z" fill="${GRAY}"/>`,
  '🧑': face({ shirt: TEAL, hairFront: shortHair('#6b4226') }),
  '👦': face({
    shirt: BLUE,
    hairFront:
      shortHair('#8b5a2b') + `<path d="M11 9.5l1.5-3 1.5 2.5 2-3.5 2 3.5 1.5-2.5 1.5 3" fill="#8b5a2b"/>`,
  }),
  '👧': face({
    shirt: PINK,
    hairBack: `<circle cx="6.5" cy="15.5" r="3.6" fill="#a0522d"/><circle cx="25.5" cy="15.5" r="3.6" fill="#a0522d"/>`,
    hairFront: fringe('#a0522d') + `<path d="M21 6.5l3-2v4zM21 6.5l-3-2v4z" fill="${PINK}"/>`,
  }),
  '👩': face({ shirt: PURPLE, hairBack: longHairBack('#6b3a22'), hairFront: fringe('#6b3a22') }),
  '👱‍♀': face({ shirt: PURPLE, hairBack: longHairBack('#f2c14e'), hairFront: fringe('#f2c14e') }),
  '👨': face({
    shirt: BLUE_DARK,
    hairFront: shortHair('#3b2a20'),
    extra: `<path d="M11.6 13.4h2.6M17.8 13.4h2.6" stroke="#3b2a20" stroke-width="1.2" stroke-linecap="round"/>`,
  }),
  '🧔': face({
    shirt: GREEN,
    hairFront: shortHair('#6b4226'),
    extra:
      `<path d="M8.2 15.5c0 6 3.6 9.5 7.8 9.5s7.8-3.5 7.8-9.5c-1.5 3.2-3.4 3.8-7.8 3.8s-6.3-.6-7.8-3.8z" fill="#6b4226"/>` +
      `<path d="M14 19.6q2 1.2 4 0" stroke="${SKIN}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`,
  }),

  // ===== Аватарки и прочее =====
  '🌟':
    `<path d="M16 1v3M16 28v3M1 16h3M28 16h3M5.4 5.4l2 2M24.6 24.6l2 2M26.6 5.4l-2 2M7.4 24.6l-2 2" stroke="#ffd970" stroke-width="1.8" stroke-linecap="round"/>` +
    star5(16, 16.6, 10, 4.4, YELLOW) +
    `<circle cx="13" cy="13.5" r="1.3" fill="#fff" opacity=".8"/>`,
  '🚀':
    `<g transform="rotate(45 16 16)"><path d="M13 23h6l-3 8z" fill="${ORANGE}"/><path d="M14.3 23h3.4l-1.7 4.5z" fill="${YELLOW}"/>` +
    `<path d="M10.5 16.5l-4.5 5v3.5l4.5-2zM21.5 16.5l4.5 5v3.5l-4.5-2z" fill="${RED}"/>` +
    `<path d="M16 2c4.3 3.2 5.8 8.3 5.8 13.5v7.5H10.2v-7.5C10.2 10.3 11.7 5.2 16 2z" fill="${LIGHT}"/>` +
    `<circle cx="16" cy="12" r="2.8" fill="${BLUE}"/><circle cx="16" cy="12" r="1.2" fill="#bfe0ff"/></g>`,
  '🕶':
    `<path d="M3 13h26" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="M4 13h10v3.5c0 3-2.3 5-5 5s-5-2-5-5zM18 13h10v3.5c0 3-2.3 5-5 5s-5-2-5-5z" fill="#1f2230"/>` +
    `<path d="M6.5 15.5l3-1.5M20.5 15.5l3-1.5" stroke="#fff" stroke-opacity=".6" stroke-width="1.3" stroke-linecap="round"/>`,
  '☕':
    `<path d="M11 3.5c-1.5 1.5 1.5 2.5 0 4.5M16 2.5c-1.5 1.5 1.5 2.5 0 4.5M21 3.5c-1.5 1.5 1.5 2.5 0 4.5" stroke="${GRAY}" stroke-width="1.4" fill="none" stroke-linecap="round"/>` +
    `<ellipse cx="15" cy="27.5" rx="11" ry="2" fill="#d6dbe6"/>` +
    `<path d="M23 13.5h1.5a3.5 3.5 0 0 1 0 7H22" stroke="#f0e6da" stroke-width="2.4" fill="none"/>` +
    `<path d="M5.5 11h19v7.5a7.5 7.5 0 0 1-7.5 7.5h-4a7.5 7.5 0 0 1-7.5-7.5z" fill="#f0e6da"/>` +
    `<ellipse cx="15" cy="11" rx="9.5" ry="2" fill="#8b5a2b"/>`,
  '✈':
    `<g transform="rotate(45 16 16)"><path d="M16 2.5c1.2 0 2 1.2 2 3v6.5l10 6v2.7l-10-3v6l3 2.2v2.3l-5-1.5-5 1.5v-2.3l3-2.2v-6l-10 3V18l10-6V5.5c0-1.8.8-3 2-3z" fill="${BLUE}"/></g>`,
  '📅':
    `<rect x="4" y="6" width="24" height="22" rx="4" fill="#fff" stroke="#d0d5e0" stroke-width="1.2"/>` +
    `<path d="M4 10a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v3H4z" fill="${RED}"/>` +
    `<path d="M10 3.5v5M22 3.5v5" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` +
    `<circle cx="10" cy="18" r="1.3" fill="${GRAY}"/><circle cx="16" cy="18" r="1.3" fill="${GRAY}"/><circle cx="10" cy="23" r="1.3" fill="${GRAY}"/>` +
    `<rect x="19.5" y="16" width="5" height="5" rx="1.5" fill="${BLUE}"/>`,
  '📍':
    `<ellipse cx="16" cy="29" rx="4" ry="1.2" fill="#000" opacity=".15"/>` +
    `<path d="M16 29s-9-8.7-9-15.8a9 9 0 0 1 18 0C25 20.3 16 29 16 29z" fill="#ff4d5a"/>` +
    `<circle cx="16" cy="13" r="3.6" fill="#fff"/>`,
  '🎟':
    `<g transform="rotate(-18 16 16)"><path d="M3 9h26v4a3 3 0 0 0 0 6v4H3v-4a3 3 0 0 0 0-6z" fill="${YELLOW}"/>` +
    `<path d="M21 10v12" stroke="#fff" stroke-width="1.4" stroke-dasharray="2 2"/>` +
    `<path d="M8 13.5h9M8 18.5h6" stroke="#b77b00" stroke-width="1.6" stroke-linecap="round"/></g>`,
  '🗺':
    `<path d="M3 8l8.5-3 9 3L29 5v19.5l-8.5 3-9-3L3 27.5z" fill="#cfe8d0"/>` +
    `<path d="M11.5 5v19.5l9 3V8z" fill="#b8dcba"/>` +
    `<path d="M6 21c3-5 7 1 10-3s5-7 9-5" stroke="${RED}" stroke-width="1.6" stroke-dasharray="2.4 2" fill="none" stroke-linecap="round"/>` +
    `<path d="M25 13.5s-3-2.9-3-5.2a3 3 0 0 1 6 0c0 2.3-3 5.2-3 5.2z" fill="#ff4d5a"/>`,
  '💬':
    `<path d="M5 6h22a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H14l-6 5v-5H5a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z" fill="${BLUE}"/>` +
    `<circle cx="10" cy="14.5" r="1.8" fill="#fff"/><circle cx="16" cy="14.5" r="1.8" fill="#fff"/><circle cx="22" cy="14.5" r="1.8" fill="#fff"/>`,
  '🌪':
    `<path d="M3 5h26M6 10h20M9 15h15M12 20h10M14.5 25h6M16 29.5h2.5" stroke="#8fa4c8" stroke-width="2.6" stroke-linecap="round"/>` +
    `<path d="M8 5h10M10 10h8M13 20h4" stroke="#c9d6ea" stroke-width="2.6" stroke-linecap="round"/>`,
  '🏷':
    `<path d="M4 6.5v8.3l13.2 13.2a2 2 0 0 0 2.8 0l8-8a2 2 0 0 0 0-2.8L14.8 4H6.5A2.5 2.5 0 0 0 4 6.5z" fill="${YELLOW}"/>` +
    `<circle cx="9.5" cy="9.5" r="2.2" fill="#fff"/>`,
  '👁':
    `<path d="M2.5 16S7.5 7.5 16 7.5 29.5 16 29.5 16 24.5 24.5 16 24.5 2.5 16 2.5 16z" fill="#fff" stroke="${INK}" stroke-width="1.6"/>` +
    `<circle cx="16" cy="16" r="5.2" fill="${BLUE}"/><circle cx="16" cy="16" r="2.4" fill="${INK}"/><circle cx="14.4" cy="14.4" r="1.1" fill="#fff"/>`,
  '👋':
    `<g transform="translate(17 18) rotate(-18)">${hand(SKIN)}</g>` +
    `<path d="M4 7q-2 4 0 8M7.5 5q-1.5 3 0 6M27 20q2 4 0 8M24 22q1.3 2.5 0 5" stroke="${BLUE}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
  '🔒':
    `<path d="M10 14.5v-3.5a6 6 0 0 1 12 0v3.5" stroke="${GRAY}" stroke-width="3" fill="none"/>` +
    `<rect x="6.5" y="14" width="19" height="14.5" rx="3.5" fill="${YELLOW}"/>` +
    `<circle cx="16" cy="20" r="2.2" fill="#8a5a00"/><rect x="15" y="20.5" width="2" height="4" rx="1" fill="#8a5a00"/>`,
  '👍':
    `<rect x="4" y="14" width="6" height="14" rx="1.6" fill="${BLUE}"/>` +
    `<path d="M11 15l4-9.5c.7-1.6 3.5-1.3 3.5.8V13h7a2.5 2.5 0 0 1 2.4 3.2l-2.6 9A3 3 0 0 1 22.4 27.5H11z" fill="${SKIN}"/>` +
    `<path d="M19.5 18h7M19.5 22h6" stroke="${SKIN_DARK}" stroke-width="1.3" stroke-linecap="round"/>`,
  '🔥':
    `<path d="M16 2.5c1 5 8.5 8 8.5 16a8.5 8.5 0 0 1-17 0c0-4 2-6.4 3.2-8.4.5 2 1.5 3.2 2.6 3.7C13 9 15 6 16 2.5z" fill="#ff6a2b"/>` +
    `<path d="M16 14c.7 3 4.3 4.6 4.3 8.2a4.3 4.3 0 0 1-8.6 0c0-2.8 2.7-4.6 4.3-8.2z" fill="${YELLOW}"/>`,
  '😄':
    `<circle cx="16" cy="16" r="13" fill="#ffd24a"/>` +
    `<path d="M9.5 13q2-2.6 4 0M18.5 13q2-2.6 4 0" stroke="#5a3a00" stroke-width="1.7" fill="none" stroke-linecap="round"/>` +
    `<path d="M9 17.5h14a7 7 0 0 1-14 0z" fill="#5a2a10"/><path d="M12.5 22.5a4.5 3 0 0 1 7 0 7 7 0 0 1-7 0z" fill="#ff7a7a"/>`,
  '🙌':
    `<g transform="translate(10 19) rotate(-14) scale(.72)">${hand(SKIN)}</g>` +
    `<g transform="translate(22 19) rotate(14) scale(-.72 .72)">${hand(SKIN)}</g>` +
    `<path d="M16 3v3.5M9 4.5l1.2 2.5M23 4.5L21.8 7" stroke="${YELLOW}" stroke-width="1.8" stroke-linecap="round"/>`,
  '🏆':
    `<path d="M9 7H5.5a4 4 0 0 0 4 5.5M23 7h3.5a4 4 0 0 1-4 5.5" stroke="#e0a020" stroke-width="2" fill="none"/>` +
    `<path d="M9 4h14v7a7 7 0 0 1-14 0z" fill="${YELLOW}"/>` +
    `<rect x="14.5" y="17.5" width="3" height="5" fill="#e0a020"/><rect x="9.5" y="22.5" width="13" height="5.5" rx="1.5" fill="#c98a2b"/>` +
    star5(16, 10, 3, 1.3, '#fff3b0'),
};

// Синонимы
ICONS['✦'] = ICONS['✨'];

/** Нормализация: убираем вариационные селекторы U+FE0F */
const normalize = (e: string) => e.replace(/️/g, '');

export function hasEmojiIcon(emoji: string): boolean {
  return normalize(emoji) in ICONS;
}

/** Внутренняя разметка иконки (для вставки во вложенный <svg viewBox="0 0 32 32">) */
export function getEmojiInner(emoji: string): string | null {
  return ICONS[normalize(emoji)] ?? null;
}

/** Полная разметка <svg> для эмодзи, либо null, если иконки нет */
export function getEmojiSvg(emoji: string): string | null {
  const inner = ICONS[normalize(emoji)];
  if (!inner) return null;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="100%" height="100%">${inner}</svg>`;
}

// Регулярка для поиска известных эмодзи в произвольном тексте (длинные ключи — первыми)
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const KEYS_RE = new RegExp(
  `(${Object.keys(ICONS)
    .sort((a, b) => b.length - a.length)
    .map((k) => Array.from(k).map((ch) => `${escapeRe(ch)}\\uFE0F?`).join(''))
    .join('|')})`,
  'gu'
);

/** Разбивает строку на куски: текст и эмодзи, для которых есть иконка */
export function splitByEmoji(text: string): { text: string; emoji?: boolean }[] {
  const parts: { text: string; emoji?: boolean }[] = [];
  let last = 0;
  for (const m of text.matchAll(KEYS_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) parts.push({ text: text.slice(last, idx) });
    parts.push({ text: m[0], emoji: true });
    last = idx + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

// ---------- Для canvas (метки карты) ----------

const imageCache = new Map<string, HTMLImageElement>();

/** Картинка иконки для отрисовки в canvas; загружается асинхронно, поэтому проверяйте img.complete */
export function getEmojiImage(emoji: string): HTMLImageElement | null {
  const key = normalize(emoji);
  const cached = imageCache.get(key);
  if (cached) return cached;
  const svg = getEmojiSvg(key);
  if (!svg || typeof Image === 'undefined') return null;
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  imageCache.set(key, img);
  return img;
}
