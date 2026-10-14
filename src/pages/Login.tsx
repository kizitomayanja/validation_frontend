import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { post } from "../api";
import { useAuth } from "../auth";

export default function Login() {
  const { user, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"in" | "up" | "reset">("in");
  const [f, setF] = useState({ full_name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/work" replace />;

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
      <h1>Ekyama</h1>
      <p className="lede">Correct Luganda translations of medical conversations. Every sentence you finish earns you money.</p>
      <form onSubmit={submit} className="card stack">
        {mode === "reset" ? (
          <>
            <h2>Reset your password</h2>
            <p className="muted">Enter your email and we’ll send password reset instructions if an account exists.</p>
            <label>Email<input type="email" required value={f.email} onChange={set("email")} autoComplete="email" /></label>
          </>
        ) : (
          <>
            {mode === "up" && <label>Full name<input required value={f.full_name} onChange={set("full_name")} autoComplete="name" /></label>}
            <label>Email<input type="email" required value={f.email} onChange={set("email")} autoComplete="email" /></label>
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
        <button className="primary" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Send reset instructions"}</button>
        {mode === "in" && <button type="button" className="link" onClick={() => { setMode("reset"); setError(""); setMessage(""); }}>Forgot password?</button>}
        {mode !== "reset" ? (
          <button type="button" className="link" onClick={() => { setMode(mode === "in" ? "up" : "in"); setError(""); setMessage(""); }}>
            {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
          </button>
        ) : (
          <button type="button" className="link" onClick={() => { setMode("in"); setError(""); setMessage(""); }}>Back to sign in</button>
        )}
      </form>
    </div>
  );
}
