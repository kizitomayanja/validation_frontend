import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth";

export default function Login() {
  const { user, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [f, setF] = useState({ full_name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/work" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError("");
    try { mode === "in" ? await signIn(f.email, f.password) : await signUp(f.full_name, f.email, f.password); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="login">
      <h1>Ekyama</h1>
      <p className="lede">Correct Luganda translations of medical conversations. Every sentence you finish earns you money.</p>
      <form onSubmit={submit} className="card stack">
        {mode === "up" && <label>Full name<input required value={f.full_name} onChange={set("full_name")} autoComplete="name" /></label>}
        <label>Email<input type="email" required value={f.email} onChange={set("email")} autoComplete="email" /></label>
        <label>Password<input type="password" required minLength={8} value={f.password} onChange={set("password")} autoComplete={mode === "in" ? "current-password" : "new-password"} /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</button>
        <button type="button" className="link" onClick={() => { setMode(mode === "in" ? "up" : "in"); setError(""); }}>
          {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
