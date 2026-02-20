import api from "../api/axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";

function Register() {
  const [form, setForm] = useState({ role: "USER" });
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const register = async () => {
    if (!form.name || !form.email || !form.password) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      await api.post("/auth/register", form);
      alert("Registered Successfully! Redirecting to Login...");
      navigate("/login");
    } catch (err) {
      console.error("Registration failed", err);
      if (err.response && err.response.data) {
        // Display backend error message (e.g. "Email already exists")
        alert("Registration Failed: " + (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data)));
      } else {
        alert("Server not responding. Please check: 1. Backend is running. 2. Database is connected.");
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <Logo size={50} />
          <h2 style={{ marginTop: 20 }}>Bridge the Gap</h2>
          <p>Initialize your connection to the task-ready network.</p>
        </div>

        <div className="form-group">
          <label>Full Name</label>
          <input
            className="auth-input"
            placeholder="e.g. John Doe"
            value={form.name || ''}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Email Address</label>
          <input
            className="auth-input"
            placeholder="name@company.com"
            value={form.email || ''}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <div className="password-wrapper">
            <input
              className="auth-input"
              placeholder="••••••••"
              type={showPassword ? "text" : "password"}
              value={form.password || ''}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
            <span
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>
        </div>

        <div className="form-group">
          <label>Role</label>
          <select
            className="auth-input"
            value={form.role}
            onChange={e => setForm({ ...form, role: e.target.value })}
          >
            <option value="USER">User</option>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        <div className="btn-center-container">
          <button className="auth-button" onClick={register}>
            Create Account
          </button>
        </div>

        <p className="auth-footer">
          Already have an account? <span onClick={() => navigate('/login')}>Sign In</span>
        </p>
      </div>
    </div>
  );
}

export default Register;
