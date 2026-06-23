import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message, type = "info", duration = 2600) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const api = useMemo(() => ({
    success: (message, duration) => showToast(message, "success", duration),
    error: (message, duration) => showToast(message, "error", duration),
    info: (message, duration) => showToast(message, "info", duration),
    remove: removeToast,
  }), [showToast, removeToast]);

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div style={toastContainerStyle}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              ...toastStyle,
              ...(toast.type === "success" ? successToastStyle : {}),
              ...(toast.type === "error" ? errorToastStyle : {}),
              ...(toast.type === "info" ? infoToastStyle : {}),
            }}
          >
            <div style={toastIconStyle}>
              {toast.type === "success" ? "✓" : toast.type === "error" ? "!" : "i"}
            </div>

            <div style={{ flex: 1, fontSize: "14px", fontWeight: 500 }}>
              {toast.message}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              style={toastCloseButtonStyle}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return ctx;
}

const toastContainerStyle = {
  position: "fixed",
  top: 18,
  right: 18,
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  zIndex: 999999,
  maxWidth: "360px",
};

const toastStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  minWidth: "280px",
  maxWidth: "360px",
  padding: "12px 14px",
  borderRadius: "14px",
  boxShadow: "0 14px 30px rgba(0,0,0,0.12)",
  border: "1px solid transparent",
  background: "#fff",
  color: "#111827",
};

const successToastStyle = {
  background: "#f0fdf4",
  borderColor: "#bbf7d0",
  color: "#166534",
};

const errorToastStyle = {
  background: "#fef2f2",
  borderColor: "#fecaca",
  color: "#991b1b",
};

const infoToastStyle = {
  background: "#eff6ff",
  borderColor: "#bfdbfe",
  color: "#1d4ed8",
};

const toastIconStyle = {
  width: "28px",
  height: "28px",
  borderRadius: "999px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  background: "rgba(255,255,255,0.7)",
  flexShrink: 0,
};

const toastCloseButtonStyle = {
  border: "none",
  background: "transparent",
  fontSize: "18px",
  lineHeight: 1,
  cursor: "pointer",
  color: "inherit",
  padding: 0,
};