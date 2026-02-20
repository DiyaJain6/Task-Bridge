import api from "../api/axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [captchaCode, setCaptchaCode] = useState("");
    const navigate = useNavigate();

    const handleReset = async (e) => {
        e.preventDefault();
        if (!email) {
            setError("Please enter your email address.");
            return;
        }

        try {
            setLoading(true);
            setError("");
            setMessage("");

            const res = await api.post("/auth/forgot-password", { email: email.trim() });
            const { message: msg, code } = res.data;
            setMessage(msg);
            setCaptchaCode(code);
            // Don't auto-navigate yet so they can see the code
        } catch (err) {
            console.error("Reset failed", err);

            let errMsg = "Failed to send reset link. Please try again.";
            if (err.response && err.response.data) {
                errMsg = typeof err.response.data === 'string'
                    ? err.response.data
                    : (err.response.data.message || JSON.stringify(err.response.data));
            } else if (err.request) {
                errMsg = "Server not responding. Please try again later.";
            }

            setError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>Reset Password</h2>
                    <p>Enter your email to receive a 6-digit verification code</p>
                </div>

                {message && <div className="success-message" style={{ color: "var(--primary)", marginBottom: "16px", textAlign: "center", fontWeight: "600" }}>{message}</div>}
                {error && <div className="error-message" style={{ color: "var(--danger)", marginBottom: "16px", textAlign: "center", fontWeight: "600" }}>{error}</div>}

                <form onSubmit={handleReset}>
                    <div className="form-group">
                        <label>Email Address</label>
                        <input
                            className="auth-input"
                            type="email"
                            placeholder="name@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    {captchaCode && (
                        <div className="captcha-display" style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            padding: '20px',
                            borderRadius: '12px',
                            textAlign: 'center',
                            marginBottom: '24px',
                            border: '1px dashed var(--primary)'
                        }}>
                            <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '8px', textTransform: 'uppercase' }}>Your Reset Code (Captcha)</p>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', letterSpacing: '8px', color: 'var(--primary)' }}>{captchaCode}</div>
                            <button
                                type="button"
                                className="auth-button"
                                style={{ marginTop: '16px', background: 'var(--primary)', color: 'white' }}
                                onClick={() => navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`)}
                            >
                                Proceed to Reset
                            </button>
                        </div>
                    )}

                    {!captchaCode && (
                        <div className="btn-center-container">
                            <button className="auth-button" type="submit" disabled={loading}>
                                {loading ? "Generating..." : "Generate Reset Code"}
                            </button>
                        </div>
                    )}
                </form>

                <p className="auth-footer" style={{ marginTop: "24px" }}>
                    Remember your password? <span onClick={() => navigate('/login')}>Sign In</span>
                </p>
            </div>
        </div>
    );
}

export default ForgotPassword;
