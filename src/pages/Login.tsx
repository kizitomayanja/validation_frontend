import { useState, type FormEvent } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { post } from "../api";
import { useAuth } from "../auth";

export default function Login() {
  const { user, signIn, signUp } = useAuth();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"in" | "up" | "reset">(() => {
    const m = searchParams.get("mode");
    return m === "register" || m === "up" ? "up" : "in";
  });
  const [f, setF] = useState({ full_name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) {
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "reviewer") return <Navigate to="/review" replace />;
    return <Navigate to="/work" replace />;
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "reset") {
        await post("/auth/password-reset/request", { email: f.email }).catch(() => post("/auth/password-reset", { email: f.email }));
        setMessage("If an account exists for that email, password reset instructions will be sent.");
      } else if (mode === "in") {
        await signIn(f.email, f.password);
      } else {
        await signUp(f.full_name, f.email, f.password);
      }
    }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="login">
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <Link to="/" className="link hint">← Back to Mission & Overview</Link>
      </div>
      <h1>Ekyama</h1>
      <p className="lede">
        Correct Luganda translations of hospital medical dialogues.
        Every verified sentence teaches an AI doctor to speak our language with life-saving accuracy.
      </p>
      <form onSubmit={submit} className="card stack">
        {mode === "reset" ? (
          <>
            <h2>Reset your password</h2>
            <p className="muted">Enter your email and we’ll send password reset instructions if an account exists.</p>
            <label>Email<input type="email" required value={f.email} onChange={set("email")} autoComplete="email" /></label>
          </>
        ) : (
          <>
            {mode === "up" && <label>Full name<input required value={f.full_name} onChange={set("full_name")} autoComplete="name" placeholder="e.g. Amina Nabukeera" /></label>}
            <label>Email<input type="email" required value={f.email} onChange={set("email")} autoComplete="email" placeholder="name@example.com" /></label>
            <div className="password-field">
              <label htmlFor="login-password">Password</label>
              <span className="password-input">
                <input id="login-password" type={showPassword ? "text" : "password"} required minLength={8} value={f.password} onChange={set("password")} autoComplete={mode === "in" ? "current-password" : "new-password"} />
                <button type="button" className="password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </span>
            </div>
          </>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        {message && <p className="ok" role="status">{message}</p>}
        <button className="primary" disabled={busy}>
          {busy ? "Please wait…" : mode === "in" ? "Sign in to Dashboard" : mode === "up" ? "Create Validator Account" : "Send reset instructions"}
        </button>
        {mode === "in" && <button type="button" className="link" onClick={() => { setMode("reset"); setError(""); setMessage(""); }}>Forgot password?</button>}
        {mode !== "reset" ? (
          <button type="button" className="link" onClick={() => { setMode(mode === "in" ? "up" : "in"); setError(""); setMessage(""); }}>
            {mode === "in" ? "New here? Create a validator account" : "Already have an account? Sign in"}
          </button>
        ) : (
          <button type="button" className="link" onClick={() => { setMode("in"); setError(""); setMessage(""); }}>Back to sign in</button>
        )}
      </form>
    </div>
  );
}
