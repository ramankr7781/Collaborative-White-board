import { useState } from "react";
import { register } from "../api/authApi";
import { useNavigate } from "react-router-dom";


function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
    const navigate = useNavigate();
    
  const handleRegister = async () => {
    try {
        
        if (!name || !email || !password) {
            alert("Please fill all fields");
            return;
        }

      await register({
        name,
        email,
        password,
      });

      alert("Registration Successful");

      const redirectPath =localStorage.getItem("redirectAfterLogin");

      if (redirectPath) {
        navigate(
          `/login`
        );
      } else {
        navigate("/login");
      }

    } catch (error) {
      console.log("REGISTER ERROR:", error);
      console.log("REGISTER RESPONSE:", error.response?.data);

      alert(
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Registration Failed"
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
          Create an Account
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
              Full Name
            </label>
            <input
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
            onClick={handleRegister}
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
            Register
          </button>

        </div>

        <div style={{ 
          marginTop: "24px", 
          textAlign: "center", 
          fontSize: "14px", 
          color: "#6b7280" 
        }}>
          <p style={{ margin: "0 0 8px 0" }}>
            Already have an account?
          </p>
          <button
            onClick={() => {
              navigate("/login");
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
            Sign In
          </button>
        </div>

      </div>
    </div>
  );
}

export default Register;