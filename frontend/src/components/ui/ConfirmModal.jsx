function ConfirmModal({
  open,
  title = "Are you sure?",
  message = "",
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "danger",
  onConfirm,
  onCancel,
  loading = false,
}) {
  if (!open) return null;

  const isDanger = confirmVariant === "danger";

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={topDecorWrap}>
          <div
            style={{
              ...decorLine,
              background: isDanger ? "#ef4444" : "#3b82f6",
            }}
          />
          <div
            style={{
              ...iconCircle,
              background: isDanger ? "#fee2e2" : "#dbeafe",
              color: isDanger ? "#dc2626" : "#2563eb",
            }}
          >
            {isDanger ? "!" : "?"}
          </div>
          <div
            style={{
              ...decorLine,
              background: isDanger ? "#ef4444" : "#3b82f6",
            }}
          />
        </div>

        <h2 style={titleStyle}>{title}</h2>
        {message && <p style={messageStyle}>{message}</p>}

        <div style={actionsStyle}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={cancelButtonStyle}
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              ...confirmButtonStyle,
              background: isDanger ? "#ef4444" : "#2563eb",
            }}
          >
            {loading ? "Please wait..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.35)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 999998,
  padding: "16px",
};

const modalStyle = {
  width: "min(460px, 94vw)",
  background: "#fff",
  borderRadius: "24px",
  padding: "28px 24px 22px",
  boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
  textAlign: "center",
};

const topDecorWrap = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 16,
  marginBottom: 18,
};

const decorLine = {
  height: 2,
  width: 100,
  borderRadius: 999,
  opacity: 0.8,
};

const iconCircle = {
  width: 62,
  height: 62,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 30,
  fontWeight: 800,
  flexShrink: 0,
};

const titleStyle = {
  margin: "0 0 10px",
  fontSize: "28px",
  fontWeight: 800,
  color: "#111827",
};

const messageStyle = {
  margin: "0 0 22px",
  fontSize: "15px",
  lineHeight: 1.6,
  color: "#4b5563",
};

const actionsStyle = {
  display: "flex",
  justifyContent: "center",
  gap: "12px",
  marginTop: "8px",
};

const cancelButtonStyle = {
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#374151",
  fontSize: "15px",
  fontWeight: 700,
  padding: "11px 20px",
  borderRadius: "12px",
  cursor: "pointer",
};

const confirmButtonStyle = {
  border: "none",
  color: "#fff",
  fontSize: "15px",
  fontWeight: 700,
  padding: "11px 20px",
  borderRadius: "12px",
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
};