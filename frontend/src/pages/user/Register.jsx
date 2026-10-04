import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import logo from "../../assets/images/spi.png";

const IconUser = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconMail = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const IconPhone = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="5" y="2" width="14" height="20" rx="2" />
    <circle cx="12" cy="17" r="1" />
  </svg>
);

const IconEye = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",

    password: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const handleChange = (e) => {
    setError("");
    setNotice("");
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "email") {
      setOtp("");
      setOtpSent(false);
      setOtpVerified(false);
    }
  };

  const handleSendOtp = async () => {
    setError("");
    setNotice("");
    if (!formData.email.trim()) {
      setError("Enter your email address first.");
      return;
    }
    setOtpLoading(true);
    try {
      const { data } = await axios.post(
        "http://localhost:5000/api/user/send-otp",
        {
          email: formData.email,
        },
      );
      setOtpSent(true);
      setOtpVerified(false);
      setOtp("");
      setNotice(data.msg || "Verification code sent. Check your email.");
    } catch (err) {
      setError(
        err.response?.data?.msg || "Could not send the code. Please try again.",
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    setNotice("");
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit verification code.");
      return;
    }
    setOtpLoading(true);
    try {
      const { data } = await axios.post(
        "http://localhost:5000/api/user/verify-otp",
        {
          email: formData.email,
          otp,
        },
      );
      setOtpVerified(true);
      setNotice(data.msg || "Email verified.");
    } catch (err) {
      setError(
        err.response?.data?.msg ||
          "Could not verify the code. Please try again.",
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    if (!otpVerified) {
      setError("Verify your email before creating your account.");
      setLoading(false);
      return;
    }
    try {
      await axios.post("http://localhost:5000/api/user/register", formData);
      alert("Account created successfully! Please sign in.");
      navigate("/login");
    } catch (err) {
      setError(
        err.response?.data?.msg ||
          "Registration failed. Please check your details and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrap">
      <div className="auth-container" style={{ maxWidth: 520 }}>
        {/* Brand */}
        <div className="auth-logo-row">
          <div className="auth-logo-mark">
            <img src={logo} alt="Softpro Innovation" />
          </div>
          <div className="auth-brand">
            Softpro<span>TechMart</span>
          </div>
        </div>

        {/* Card */}
        <div className="auth-card-box">
          <h1 className="auth-card-title">
            Create an <span>account</span>
          </h1>
          <p className="auth-card-subtitle">
            Join thousands of makers — it&apos;s free and takes 30 seconds
          </p>

          {error && (
            <div className="error-alert">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ flexShrink: 0 }}
              >
                <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              {error}
            </div>
          )}
          {notice && (
            <div className="auth-success-alert" role="status">
              {notice}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* <div className="form-row-2"> */}
              <div className="form-field">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Arjun Sharma"
                  required
                  autoComplete="name"
                />
                <span className="field-icon">
                  <IconUser />
                </span>
              </div>
            {/* </div> */}

            <div className="form-field">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={otpVerified}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
              <span className="field-icon">
                <IconMail />
              </span>
            </div>

            {!otpVerified && (
              <div className="otp-actions">
                {!otpSent ? (
                  <button
                    type="button"
                    className="btn-auth"
                    onClick={handleSendOtp}
                    disabled={otpLoading || !formData.email.trim()}
                  >
                    {otpLoading ? "Sending code…" : "Send verification code"}
                  </button>
                ) : (
                  <>
                    <div className="form-field otp-field">
                      <label htmlFor="otp">Email verification code</label>
                      <input
                        id="otp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={otp}
                        onChange={(e) =>
                          setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                        }
                        placeholder="6-digit code"
                        aria-label="6-digit email verification code"
                      />
                    </div>
                    <button
                      type="button"
                      className="btn-auth"
                      onClick={handleVerifyOtp}
                      disabled={otpLoading || otp.length !== 6}
                    >
                      {otpLoading ? "Checking code…" : "Verify email"}
                    </button>
                    <button
                      type="button"
                      className="otp-resend"
                      onClick={handleSendOtp}
                      disabled={otpLoading}
                    >
                      Send a new code
                    </button>
                  </>
                )}
              </div>
            )}
            {otpVerified && (
              <div className="auth-success-alert" role="status">
                Email address verified
              </div>
            )}

            <div className="form-field">
              <label htmlFor="password">Create Password</label>
              <input
                id="password"
                type={showPwd ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 8 characters"
                required
                autoComplete="new-password"
              />
              <span
                className="field-icon"
                onClick={() => setShowPwd((p) => !p)}
              >
                {showPwd ? <IconEyeOff /> : <IconEye />}
              </span>
            </div>

            <div className="form-check-row" style={{ marginBottom: "1.5rem" }}>
              <input type="checkbox" id="terms" required />
              <label htmlFor="terms">
                I agree to the <a href="#!">Terms &amp; Conditions</a> and{" "}
                <a href="#!">Privacy Policy</a>
              </label>
            </div>

            <button
              type="submit"
              className="btn-auth"
              disabled={loading || !otpVerified}
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <div className="auth-divider">already a member?</div>

          <p className="auth-footer-text">
            Have an account? <Link to="/login">Sign in →</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
