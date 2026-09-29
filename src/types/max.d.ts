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
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void | Promise<any>;
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void | Promise<any>;
  selectionChanged: () => void | Promise<any>;
}

export interface MaxLocationData {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  course?: number | null;
  speed?: number | null;
  horizontal_accuracy?: number | null;
  vertical_accuracy?: number | null;
  course_accuracy?: number | null;
  speed_accuracy?: number | null;
}

export interface MaxLocationManager {
  isInited: boolean;
  isLocationAvailable: boolean;
  isAccessRequested: boolean;
  isAccessGranted: boolean;
  init: (callback?: () => void) => void | Promise<void>;
  getLocation: (
    callback?: (location: MaxLocationData | null) => void
  ) => void | Promise<MaxLocationData | null>;
  openSettings: () => void;
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
  LocationManager?: MaxLocationManager;

  ready: () => void;
  expand: () => void;
  close: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  openMaxLink: (url: string) => void;
  sendData: (data: string) => void;
  postEvent?: (eventType: string, eventData?: any) => void;
  requestLocation?: (callback?: (location: any) => void) => Promise<any> | void;
  getLocation?: (callback?: (location: any) => void) => Promise<any> | void;
  onEvent: (eventType: string, eventHandler: (...args: any[]) => void) => void;
  offEvent: (eventType: string, eventHandler: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    WebApp?: MaxWebApp;
    max?: {
      webApp?: MaxWebApp;
      requestLocation?: (callback?: (location: any) => void) => Promise<any> | void;
      getLocation?: (callback?: (location: any) => void) => Promise<any> | void;
    };
  }
}
