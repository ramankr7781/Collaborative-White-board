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
      navigate("/login");

    } catch (error) {
      console.log(error);
      alert(
        error.response?.data?.message ||
        "Registration Failed"
      );
    }
  };

  return (
    <>
      <h2>Register</h2>

      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) =>
          setName(e.target.value)
        }
      />

      <br />

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

      <button onClick={handleRegister}>
        Register
      </button>

      <p>
        Already have an account?
        </p>

        <button
        onClick={() => {
            navigate("/login");
        }}
        >
        Login
        </button>
    </>
  );
}

export default Register;