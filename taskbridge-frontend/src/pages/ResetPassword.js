import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Logo from '../components/Logo';

function ResetPassword() {
    const [searchParams] = useSearchParams();
    const email = searchParams.get('email');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleReset = async () => {
        if (!otp || !password || !confirmPassword) {
            alert("Please fill in all fields (OTP and Passwords).");
            return;
        }

        if (password !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/reset-password', { email, password, otp });
            alert("Password updated successfully! Please login with your new credentials.");
            navigate('/login');
        } catch (err) {
            console.error("Reset failed", err);
            const msg = err.response?.data || "Failed to reset password. Please verify your OTP.";
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <Logo size={50} />
                    <h2 style={{ marginTop: 20 }}>Secure Your Account</h2>
                    <p>Enter the 6-digit code sent to <strong>{email}</strong></p>
                </div>

                <div className="form-group">
                    <label>6-Digit OTP</label>
                    <input
                        className="auth-input"
                        placeholder="123456"
                        maxLength="6"
                        style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px' }}
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    />
                </div>

                <div className="form-group">
                    <label>New Password</label>
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
                            style={{ cursor: 'pointer' }}
                        >
                            {showPassword ? "🙈" : "👁️"}
                        </span>
                    </div>
                </div>

                <div className="form-group">
                    <label>Confirm Password</label>
                    <div className="password-wrapper">
                        <input
                            className="auth-input"
                            placeholder="••••••••"
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                        />
                        <span
                            className="password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{ cursor: 'pointer' }}
                        >
                            {showPassword ? "🙈" : "👁️"}
                        </span>
                    </div>
                </div>

                <div className="btn-center-container">
                    <button
                        className="auth-button"
                        onClick={handleReset}
                        disabled={loading}
                    >
                        {loading ? "Updating..." : "Update Password"}
                    </button>
                </div>

                <p className="auth-footer">
                    Remembered your password? <span onClick={() => navigate('/login')}>Back to Login</span>
                </p>
            </div>
        </div>
    );
}

export default ResetPassword;
