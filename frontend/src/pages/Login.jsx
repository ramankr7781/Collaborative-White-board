import { useState } from "react";
import { login } from "../api/authApi";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

function Login() {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

    const navigate = useNavigate();

    useEffect(() => {
        if (localStorage.getItem("token")) {
            navigate("/");
        }
    }, [navigate]);


  const handleLogin = async () => {
    try {
        
      if (!email || !password) {
          alert("Please fill all fields");
          return;
      }

      const res = await login({
      email,
      password,
      });

      localStorage.setItem("token",res.data.token);
      localStorage.setItem("name", res.data.user.name);

      const redirectPath =localStorage.getItem("redirectAfterLogin");

      if (redirectPath) {
        localStorage.removeItem(
          "redirectAfterLogin"
        );
        navigate(
          redirectPath
        );
      } else {
        navigate("/");
      }

    } catch (error) {
        console.log(error);
        alert(
            error.response?.data?.message ||
            "Login Failed"
        );
    }
    };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      backgroundColor: "#f9fafb",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      <div style={{
        backgroundColor: "#ffffff",
        padding: "40px",
        borderRadius: "12px",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        width: "100%",
        maxWidth: "380px",
        boxSizing: "border-box"
      }}>
        
        <h2 style={{
          margin: "0 0 24px 0",
          fontSize: "24px",
          fontWeight: 600,
          color: "#111827",
          textAlign: "center"
        }}>
          Welcome Back
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s"
              }}
            />
          </div>

          <button 
            onClick={handleLogin}
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "8px",
              backgroundColor: "#3b82f6",
              color: "white",
              fontWeight: 600,
              fontSize: "14px",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "background-color 0.2s"
            }}
          >
            Sign In
          </button>

        </div>

        <div style={{ 
          marginTop: "24px", 
          textAlign: "center", 
          fontSize: "14px", 
          color: "#6b7280" 
        }}>
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
              padding: 0
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