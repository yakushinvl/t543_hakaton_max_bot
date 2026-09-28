export interface MaxUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export interface MaxChat {
  id: number;
  type: 'DIALOG' | 'CHAT' | 'CHANNEL';
}

export interface MaxInitData {
  query_id?: string;
  user?: MaxUser;
  chat?: MaxChat;
  auth_date: number;
  hash: string;
  start_param?: string;
}

export interface MaxThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

export interface MaxBackButton {
  isVisible: boolean;
  onClick: (cb: () => void) => void;
  offClick: (cb: () => void) => void;
  show: () => void;
  hide: () => void;
}

export interface MaxHapticFeedback {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  selectionChanged: () => void;
}

export interface MaxWebApp {
  initData: string;
  initDataUnsafe: MaxInitData;
  version: string;
  platform: 'ios' | 'android' | 'desktop' | 'web';
  colorScheme: 'light' | 'dark';
  themeParams: MaxThemeParams;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  BackButton: MaxBackButton;
  HapticFeedback: MaxHapticFeedback;

  ready: () => void;
  expand: () => void;
  close: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  openMaxLink: (url: string) => void;
  sendData: (data: string) => void;
  onEvent: (eventType: string, eventHandler: (...args: any[]) => void) => void;
  offEvent: (eventType: string, eventHandler: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    WebApp?: MaxWebApp;
    max?: {
      webApp?: MaxWebApp;
    };
  }
}
