import { useState, useEffect } from 'react';

export interface Toast {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info' | 'warning';
  details?: string;
}

let toastId = 0;
let toastListeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

export function showToast(message: string, type: Toast['type'] = 'info', details?: string) {
  const id = `toast-${toastId++}`;
  const toast: Toast = { id, message, type, details };
  toasts = [...toasts, toast];
  toastListeners.forEach(listener => listener(toasts));
  
  // Auto-remove after 10 seconds for errors, 5 seconds for others
  setTimeout(() => {
    removeToast(id);
  }, type === 'error' ? 10000 : 5000);
  
  return id;
}

export function removeToast(id: string) {
  toasts = toasts.filter(t => t.id !== id);
  toastListeners.forEach(listener => listener(toasts));
}

export function useToasts() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>(toasts);
  
  useEffect(() => {
    const listener = (newToasts: Toast[]) => setCurrentToasts(newToasts);
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  }, []);
  
  return currentToasts;
}

export function ToastContainer() {
  const toasts = useToasts();
  
  if (toasts.length === 0) return null;
  
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`
            min-w-[300px] max-w-[500px] p-4 rounded-lg shadow-lg border
            ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-900' : ''}
            ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-900' : ''}
            ${toast.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-900' : ''}
            ${toast.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-900' : ''}
          `}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="font-semibold">{toast.message}</div>
              {toast.details && (
                <div className="text-sm mt-1 opacity-75 whitespace-pre-wrap font-mono">
                  {toast.details}
                </div>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-4 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

