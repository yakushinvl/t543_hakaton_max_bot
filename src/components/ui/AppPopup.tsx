import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Trash2,
  X,
} from 'lucide-react';
import { triggerHaptic } from '../../lib/maxBridge';
import './AppPopup.css';

export type PopupType = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  title?: string;
  message: string;
  type: PopupType;
  duration: number;
}

export interface ConfirmDialogOptions {
  id?: string;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  type?: PopupType;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export interface AlertDialogOptions {
  id?: string;
  title?: string;
  message: string;
  buttonText?: string;
  type?: PopupType;
  onClose?: () => void;
}

type DialogState =
  | { kind: 'confirm'; options: ConfirmDialogOptions }
  | { kind: 'alert'; options: AlertDialogOptions }
  | null;

// Subscribers for global imperative calls
type ToastListener = (toasts: ToastItem[]) => void;
type DialogListener = (dialog: DialogState) => void;

let activeToasts: ToastItem[] = [];
let activeDialog: DialogState = null;

const toastListeners = new Set<ToastListener>();
const dialogListeners = new Set<DialogListener>();

function notifyToasts() {
  toastListeners.forEach((l) => l([...activeToasts]));
}

function notifyDialog() {
  dialogListeners.forEach((l) => l(activeDialog));
}

/**
 * Показывает красивый всплывающий тост внутри интерфейса приложения (вместо window.alert)
 */
export function showAppToast(
  messageOrOptions: string | { title?: string; message: string; type?: PopupType; duration?: number },
  type: PopupType = 'info'
): void {
  const options =
    typeof messageOrOptions === 'string'
      ? { message: messageOrOptions, type }
      : {
          title: messageOrOptions.title,
          message: messageOrOptions.message,
          type: messageOrOptions.type || 'info',
          duration: messageOrOptions.duration,
        };

  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const item: ToastItem = {
    id,
    title: options.title,
    message: options.message,
    type: options.type || 'info',
    duration: options.duration || 3200,
  };

  // Тактильный отклик при отображении тоста
  if (item.type === 'success') {
    triggerHaptic('success');
  } else if (item.type === 'error') {
    triggerHaptic('error');
  } else if (item.type === 'warning') {
    triggerHaptic('warning');
  } else {
    triggerHaptic('light');
  }

  // Ограничиваем количество одновременных тостов для чистоты мобильного интерфейса
  activeToasts = [item, ...activeToasts.slice(0, 1)];
  notifyToasts();

  setTimeout(() => {
    dismissAppToast(id);
  }, item.duration);
}

/**
 * Закрывает тост по ID
 */
export function dismissAppToast(id?: string): void {
  if (!id) {
    activeToasts = [];
  } else {
    activeToasts = activeToasts.filter((t) => t.id !== id);
  }
  notifyToasts();
}

/**
 * Показывает модальный диалог подтверждения (вместо window.confirm)
 */
export function showAppConfirm(options: ConfirmDialogOptions): void {
  if (options.danger) {
    triggerHaptic('warning');
  } else {
    triggerHaptic('medium');
  }

  activeDialog = {
    kind: 'confirm',
    options,
  };
  notifyDialog();
}

/**
 * Показывает модальный попап-диалог с кнопкой "Понятно"
 */
export function showAppAlert(
  messageOrOptions: string | AlertDialogOptions,
  type: PopupType = 'info'
): void {
  triggerHaptic('light');

  const options: AlertDialogOptions =
    typeof messageOrOptions === 'string'
      ? { message: messageOrOptions, type }
      : messageOrOptions;

  activeDialog = {
    kind: 'alert',
    options,
  };
  notifyDialog();
}

/**
 * Закрывает текущий открытый диалог
 */
export function dismissAppDialog(): void {
  activeDialog = null;
  notifyDialog();
}

// Защита от случайных вызовов стандартного window.alert браузера ("website says...")
if (typeof window !== 'undefined') {
  window.alert = (message?: any) => {
    showAppToast(String(message ?? ''), 'info');
  };
}

/**
 * Корневой компонент для рендера попапов интерфейса приложения.
 * Монтируется один раз в App.tsx.
 */
export const AppPopupHost: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>(activeToasts);
  const [dialog, setDialog] = useState<DialogState>(activeDialog);

  useEffect(() => {
    toastListeners.add(setToasts);
    dialogListeners.add(setDialog);
    return () => {
      toastListeners.delete(setToasts);
      dialogListeners.delete(setDialog);
    };
  }, []);

  const handleConfirm = useCallback(async () => {
    if (dialog && dialog.kind === 'confirm') {
      const { onConfirm } = dialog.options;
      dismissAppDialog();
      try {
        await onConfirm();
      } catch (err) {
        console.error('Error in popup confirm action:', err);
      }
    }
  }, [dialog]);

  const handleCancel = useCallback(() => {
    if (dialog && dialog.kind === 'confirm') {
      dialog.options.onCancel?.();
    } else if (dialog && dialog.kind === 'alert') {
      dialog.options.onClose?.();
    }
    dismissAppDialog();
  }, [dialog]);

  // Закрытие диалога по Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dialog) {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialog, handleCancel]);

  return (
    <>
      {/* 1. Всплывающие тост-уведомления */}
      {toasts.length > 0 && (
        <div className="app-toast-container" aria-live="polite">
          {toasts.map((toast) => {
            const isSuccess = toast.type === 'success';
            const isError = toast.type === 'error';
            const isWarning = toast.type === 'warning';

            return (
              <div
                key={toast.id}
                className={`app-toast-item toast-${toast.type}`}
                onClick={() => dismissAppToast(toast.id)}
              >
                <div className="app-toast-icon-wrap">
                  {isSuccess && <CheckCircle2 size={18} />}
                  {isError && <AlertCircle size={18} />}
                  {isWarning && <AlertTriangle size={18} />}
                  {!isSuccess && !isError && !isWarning && <Info size={18} />}
                </div>

                <div className="app-toast-content">
                  {toast.title && <div className="app-toast-title">{toast.title}</div>}
                  <div className="app-toast-message">{toast.message}</div>
                </div>

                <button
                  type="button"
                  className="app-toast-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissAppToast(toast.id);
                  }}
                  aria-label="Закрыть"
                >
                  <X size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Модальный диалог подтверждения / уведомления */}
      {dialog && (
        <div className="app-dialog-overlay" onClick={handleCancel}>
          <div className="app-dialog-card" onClick={(e) => e.stopPropagation()}>
            {dialog.kind === 'confirm' && (
              <>
                <div className={`app-dialog-badge ${dialog.options.danger ? 'danger' : 'warning'}`}>
                  {dialog.options.danger ? <Trash2 size={26} /> : <AlertTriangle size={26} />}
                </div>

                <h3 className="app-dialog-title">
                  {dialog.options.title || 'Требуется подтверждение'}
                </h3>

                <p className="app-dialog-message">{dialog.options.message}</p>

                <div className="app-dialog-actions">
                  <button
                    type="button"
                    className="app-dialog-btn btn-cancel"
                    onClick={handleCancel}
                  >
                    {dialog.options.cancelText || 'Отмена'}
                  </button>

                  <button
                    type="button"
                    className={`app-dialog-btn ${dialog.options.danger ? 'btn-danger' : 'btn-primary'}`}
                    onClick={handleConfirm}
                  >
                    {dialog.options.confirmText || 'Подтвердить'}
                  </button>
                </div>
              </>
            )}

            {dialog.kind === 'alert' && (
              <>
                <div className={`app-dialog-badge ${dialog.options.type || 'info'}`}>
                  {dialog.options.type === 'error' && <AlertCircle size={26} />}
                  {dialog.options.type === 'warning' && <AlertTriangle size={26} />}
                  {dialog.options.type === 'success' && <CheckCircle2 size={26} />}
                  {(!dialog.options.type || dialog.options.type === 'info') && <Info size={26} />}
                </div>

                {dialog.options.title && (
                  <h3 className="app-dialog-title">{dialog.options.title}</h3>
                )}

                <p className="app-dialog-message">{dialog.options.message}</p>

                <div className="app-dialog-actions">
                  <button
                    type="button"
                    className="app-dialog-btn btn-primary"
                    onClick={handleCancel}
                  >
                    {dialog.options.buttonText || 'Понятно'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
