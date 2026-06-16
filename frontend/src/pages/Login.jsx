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


        localStorage.setItem(
        "token",
        res.data.token
        );

        navigate("/");

    } catch (error) {
        console.log(error);
        alert(
            error.response?.data?.message ||
            "Login Failed"
        );
    }
    };

  return (
    <>
      <h2>Login</h2>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) =>
          setEmail(e.target.value)
        }
      />

      <br />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) =>
          setPassword(e.target.value)
        }
      />

      <br />

      <button onClick={handleLogin}>
        Login
      </button>

        <p>
        Don't have an account?
        </p>

        <button
        onClick={() => {
            navigate("/register");
        }}
        >
            Register
        </button>
            </>
  );
}

export default Login;