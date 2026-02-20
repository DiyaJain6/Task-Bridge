import api from "../api/axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";

function Login() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const login = async () => {

    // stop empty login
    if (!email || !password) {
      alert("Enter email and password");
      return;
    }

    try {
      setLoading(true);
      console.log("Sending login request...");

      const res = await api.post("/auth/login", {
        email,
        password
      });

      console.log("LOGIN SUCCESS:", res.data);

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);

      // role navigation
      // role navigation
      const role = res.data.role;
      console.log("Redirecting for role:", role);

      switch (role) {
        case "ADMIN":
          navigate("/admin");
          break;
        case "MANAGER":
          navigate("/manager");
          break;
        case "USER":
          navigate("/user");
          break;
        default:
          console.warn("Unknown role:", role);
          navigate("/user"); // Fallback
      }

    } catch (err) {

      console.error("LOGIN FAILED:", err);

      if (err.response) {
        console.error("Server Error:", err.response.status, err.response.data);
        // If data is just a string (like "Invalid credentials"), show it.
        // If it's an object { message: "..." }, show that.
        const msg = typeof err.response.data === 'string'
          ? err.response.data
          : (err.response.data?.message || "Invalid credentials");
        alert("Login Failed: " + msg);
      } else if (err.request) {
        console.error("No Response:", err.request);
        alert("Server not responding. Check backend port 8081.");
      } else {
        console.error("Request Setup Error:", err.message);
        alert("Error connecting to server.");
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <Logo size={50} />
          <h2 style={{ marginTop: 20 }}>Welcome Back</h2>
          <p>Secure entry to the mission console.</p>
        </div>

        <div className="form-group">
          <label>Email Address</label>
          <input
            className="auth-input"
            placeholder="name@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <div className="password-wrapper">
            <input
              className="auth-input"
              placeholder="••••••••"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <span
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              role="button"
            >
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>
        </div>

        <div className="auth-options">
          <label>
            <input type="checkbox" /> Remember me
          </label>
          <span className="auth-forgot" onClick={() => navigate('/forgot-password')}>Forgot Password?</span>
        </div>

        <div className="btn-center-container">
          <button className="auth-button" onClick={login} disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </div>

        <p className="auth-footer">
          Don't have an account? <span onClick={() => navigate('/')}>Create Account</span>
        </p>
      </div>
    </div>
  );
}

export default Login;
