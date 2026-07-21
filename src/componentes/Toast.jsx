import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

const ToastContext = createContext(null);

let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    delete timersRef.current[id];
  }, []);

  const addToast = useCallback(
    (message, type = "error") => {
      const id = ++toastIdCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
      timersRef.current[id] = setTimeout(() => removeToast(id), 5000);
      return id;
    },
    [removeToast],
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast--${toast.type}`}
            onClick={() => removeToast(toast.id)}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const addToast = useContext(ToastContext);

  // Fallback seguro para tests que renderizan componentes sin ToastProvider
  if (!addToast) {
    return {
      error: () => {},
      success: () => {},
      info: () => {},
      warning: () => {},
    };
  }

  return {
    error: (message) => addToast(message, "error"),
    success: (message) => addToast(message, "success"),
    info: (message) => addToast(message, "info"),
    warning: (message) => addToast(message, "warning"),
  };
}
