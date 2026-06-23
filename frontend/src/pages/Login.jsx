import { useState, useEffect } from "react";
import { login } from "../api/authApi";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/ui/ToastProvider";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (localStorage.getItem("token")) {
      navigate("/");
    }
  }, [navigate]);

  const handleLogin = async () => {
    try {
      setFormError("");

      if (!email || !password) {
        setFormError("Please fill all fields.");
        return;
      }

      setSubmitting(true);

      const res = await login({
        email,
        password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("name", res.data.user.name);

      toast.success("Logged in successfully");

      const redirectPath = localStorage.getItem("redirectAfterLogin");

      if (redirectPath) {
        localStorage.removeItem("redirectAfterLogin");
        navigate(redirectPath);
      } else {
        navigate("/");
      }
    } catch (error) {
      console.log(error);

      const msg =
        error.response?.data?.message ||
        "Login Failed";

      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#f9fafb",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "16px",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          padding: "40px",
          borderRadius: "16px",
          boxShadow:
            "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
          width: "100%",
          maxWidth: "380px",
          boxSizing: "border-box",
        }}
      >
        <h2
          style={{
            margin: "0 0 24px 0",
            fontSize: "24px",
            fontWeight: 700,
            color: "#111827",
            textAlign: "center",
          }}
        >
          Welcome Back
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                color: "#374151",
                marginBottom: "6px",
              }}
            >
              Email Address
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (formError) setFormError("");
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: `1px solid ${formError ? "#fca5a5" : "#d1d5db"}`,
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 500,
                color: "#374151",
                marginBottom: "6px",
              }}
            >
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (formError) setFormError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLogin();
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: `1px solid ${formError ? "#fca5a5" : "#d1d5db"}`,
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {formError && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                borderRadius: "8px",
                padding: "10px 12px",
                fontSize: "13px",
                fontWeight: 500,
              }}
            >
              {formError}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={submitting}
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "8px",
              backgroundColor: submitting ? "#93c5fd" : "#3b82f6",
              color: "white",
              fontWeight: 600,
              fontSize: "14px",
              border: "none",
              borderRadius: "8px",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Signing In..." : "Sign In"}
          </button>
        </div>

        <div
          style={{
            marginTop: "24px",
            textAlign: "center",
            fontSize: "14px",
            color: "#6b7280",
          }}
        >
          <p style={{ margin: "0 0 8px 0" }}>
            Don't have an account?
          </p>
          <button
            onClick={() => {
              navigate("/register");
            }}
            style={{
              backgroundColor: "transparent",
              border: "none",
              color: "#3b82f6",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Create an account
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;