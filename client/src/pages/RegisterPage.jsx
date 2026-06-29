import { useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, AtSign, Mail, Lock, Eye, EyeOff, UserPlus } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

const getStrength = (val) => {
  let score = 0;
  if (val.length >= 6) score++;
  if (val.length >= 10) score++;
  if (/[A-Z]/.test(val) && /[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  return score;
};

const strengthColor = (score) => {
  if (score <= 1) return "#ef4444";
  if (score <= 2) return "#f59e0b";
  return "#10b981";
};

const RegisterPage = () => {
  const [formData, setFormData] = useState({ username: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const { register, isLoading } = useAuthStore();

  const strength = getStrength(formData.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await register(formData);
  };

  const inputWrapStyle = (field) => ({
    display: "flex",
    alignItems: "center",
    background: "#0d0d1f",
    border: `1px solid ${focusedField === field ? "#7C3AED" : "rgba(255,255,255,0.08)"}`,
    borderRadius: 12,
    padding: "0 14px",
    gap: 10,
    transition: "border 0.2s",
  });

  const inputStyle = {
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#fff",
    fontSize: 14,
    padding: "13px 0",
    flex: 1,
    width: "100%",
  };

  const labelStyle = {
    display: "block",
    fontSize: 12,
    color: "#888",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#080818",
      padding: "1rem",
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Card */}
        <div style={{
          background: "#12122a",
          border: "1px solid rgba(124,58,237,0.2)",
          borderRadius: 20,
          padding: "2.5rem",
        }}>

          {/* Logo */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "2rem" }}>
            <div style={{
              width: 56, height: 56,
              background: "linear-gradient(135deg, #7C3AED, #5B21B6)",
              borderRadius: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 12,
            }}>
              <MessageCircle color="white" size={26} />
            </div>

            {/* Badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              background: "rgba(124,58,237,0.15)",
              border: "1px solid rgba(124,58,237,0.3)",
              color: "#a78bfa", fontSize: 11,
              padding: "3px 12px", borderRadius: 20,
              marginBottom: 10,
            }}>
              ✦ Free forever plan
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 600, color: "#fff", margin: 0 }}>Create your account</h1>
            <p style={{ fontSize: 13, color: "#888", marginTop: 4 }}>Start chatting in seconds</p>
          </div>

          <form onSubmit={handleSubmit}>

            {/* Username */}
            <div style={{ marginBottom: "1.2rem" }}>
              <label style={labelStyle}>Username</label>
              <div style={inputWrapStyle("username")}>
                <AtSign size={17} color="#555" />
                <input
                  type="text"
                  placeholder="yourname"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  onFocus={() => setFocusedField("username")}
                  onBlur={() => setFocusedField(null)}
                  style={inputStyle}
                  required
                />
                {formData.username.length >= 3 && (
                  <span style={{ color: "#10b981", fontSize: 18, lineHeight: 1 }}>✓</span>
                )}
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: "1.2rem" }}>
              <label style={labelStyle}>Email address</label>
              <div style={inputWrapStyle("email")}>
                <Mail size={17} color="#555" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: "1.2rem" }}>
              <label style={labelStyle}>Password</label>
              <div style={inputWrapStyle("password")}>
                <Lock size={17} color="#555" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  style={inputStyle}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
                >
                  {showPassword ? <EyeOff size={17} color="#555" /> : <Eye size={17} color="#555" />}
                </button>
              </div>

              {/* Strength bar */}
              {formData.password && (
                <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 2,
                      background: i <= strength ? strengthColor(strength) : "rgba(255,255,255,0.08)",
                      transition: "background 0.3s",
                    }} />
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%", padding: "14px",
                background: "#7C3AED", color: "#fff",
                border: "none", borderRadius: 12,
                fontSize: 15, fontWeight: 600,
                cursor: isLoading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: isLoading ? 0.7 : 1,
                transition: "background 0.2s",
              }}
              onMouseOver={(e) => { if (!isLoading) e.currentTarget.style.background = "#6D28D9"; }}
              onMouseOut={(e) => { e.currentTarget.style.background = "#7C3AED"; }}
            >
              {isLoading
                ? <div style={{ width: 20, height: 20, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                : <><UserPlus size={18} /> Create account</>
              }
            </button>
          </form>

          {/* Terms */}
          <p style={{ fontSize: 12, color: "#555", textAlign: "center", marginTop: "1rem", lineHeight: 1.6 }}>
            By creating an account you agree to our{" "}
            <a href="#" style={{ color: "#7C3AED", textDecoration: "none" }}>Terms</a> and{" "}
            <a href="#" style={{ color: "#7C3AED", textDecoration: "none" }}>Privacy Policy</a>
          </p>
        </div>

        {/* Footer */}
        <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: 13, color: "#666" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#7C3AED", textDecoration: "none", fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;