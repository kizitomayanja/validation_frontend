import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { post } from "../api";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Password reset token is missing from the link.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await post("/auth/password-reset/confirm", {
        token,
        new_password: password,
      });
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message || "Could not reset password. The link may have expired.");
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="login">
        <h1>Ekyama</h1>
        <div className="card stack">
          <h2>Invalid Link</h2>
          <p className="error">This password reset link is invalid or incomplete.</p>
          <Link to="/login" className="primary button-link">Back to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login">
      <h1>Ekyama</h1>
      <form onSubmit={submit} className="card stack">
        <h2>Choose a new password</h2>
        {success ? (
          <>
            <p className="ok" role="status">Your password has been reset successfully. You can now sign in with your new password.</p>
            <Link to="/login" className="primary button-link">Proceed to sign in</Link>
          </>
        ) : (
          <>
            <p className="muted">Enter a secure new password for your validator account (min 8 characters).</p>
            <div className="password-field">
              <label htmlFor="new-password">New password</label>
              <span className="password-input">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </span>
            </div>
            <label>Confirm new password
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="primary" disabled={busy}>
              {busy ? "Saving…" : "Reset password"}
            </button>
            <Link to="/login" className="link">Cancel and back to sign in</Link>
          </>
        )}
      </form>
    </div>
  );
}
