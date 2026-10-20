import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, post, ugx, type Balance, type PaymentMethod, type Payout, type Provider } from "../api";
import { useAuth } from "../auth";

// Accepts 07XXXXXXXX, 2567XXXXXXXX or +2567XXXXXXXX and returns +256XXXXXXXXX (Ugandan mobile numbers).
export function normalisePhone(v: string): string | null {
  const d = v.replace(/[\s-]/g, "");
  if (/^\+2567\d{8}$/.test(d)) return d;
  if (/^2567\d{8}$/.test(d)) return "+" + d;
  if (/^07\d{8}$/.test(d)) return "+256" + d.slice(1);
  return null;
}
const NAMES: Record<Provider, string> = { mtn: "MTN MoMo", airtel: "Airtel Money" };
const STATUS = { pending: "Awaiting payment", paid: "Paid", rejected: "Rejected", cancelled: "Cancelled" } as const;

export default function Profile() {
  const { user } = useAuth();
  const [bal, setBal] = useState<Balance | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [chosen, setChosen] = useState("");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [form, setForm] = useState({ provider: "mtn" as Provider, phone: "", name: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [b, m, p] = await Promise.all([api<Balance>("/me/balance"), api<PaymentMethod[]>("/me/payment-methods"), api<Payout[]>("/payouts")]);
    setBal(b); setMethods(m); setPayouts(p);
    setChosen((c) => (m.some((x) => x.id === c) ? c : m.find((x) => x.is_default)?.id ?? m[0]?.id ?? ""));
  }, []);
  useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(""); setNotice("");
    try { await fn(); await load(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const addMethod = (e: FormEvent) => {
    e.preventDefault();
    const phone = normalisePhone(form.phone);
    if (!phone) { setError("Enter a Ugandan number, like 0772 123456."); return; }
    run(async () => { await post("/me/payment-methods", { provider: form.provider, phone_number: phone, account_name: form.name.trim() }); setForm({ ...form, phone: "", name: "" }); });
  };

  const hasPending = payouts.some((p) => p.status === "pending");
  const short = bal ? bal.min_cashout_ugx - bal.available_ugx : 0;
  const withdrawAmount = bal
    ? customAmount.trim() === ""
      ? bal.available_ugx
      : Number(customAmount)
    : 0;
  const isCustomValid =
    !!bal &&
    !isNaN(withdrawAmount) &&
    Number.isInteger(withdrawAmount) &&
    withdrawAmount >= bal.min_cashout_ugx &&
    withdrawAmount <= bal.available_ugx;
  const remainingBalance = bal && isCustomValid ? Math.max(0, bal.available_ugx - withdrawAmount) : (bal?.available_ugx ?? 0);
  const canCash = !!chosen && short <= 0 && !hasPending && !busy && isCustomValid;

  const totalValidated = bal?.validated_count ?? 0;
  const verifiedCount = bal?.verified_count ?? 0;
  const pendingReviewCount = bal?.pending_review_count ?? Math.max(0, totalValidated - verifiedCount);
  const pendingReviewUgx = bal?.pending_review_ugx ?? (pendingReviewCount * 2000);
  const reviewPct = totalValidated > 0 ? Math.min(100, Math.round((verifiedCount / totalValidated) * 100)) : 0;
  const isThresholdReached = (bal?.available_ugx ?? 0) >= (bal?.min_cashout_ugx ?? 10000);
  const thresholdPct = bal && bal.min_cashout_ugx > 0 ? Math.min(100, Math.round((bal.available_ugx / bal.min_cashout_ugx) * 100)) : 0;

  const cashOut = () => run(async () => {
    await post("/payouts", { payment_method_id: chosen, amount_ugx: withdrawAmount });
    setCustomAmount("");
    setNotice("Withdrawal request submitted! Your payment of verified earnings will be sent to your mobile money account within 24 to 48 hours.");
  });

  if (!bal) return <p className="muted">{error || "Loading…"}</p>;

  return (
    <section className="profile">
      <h1>{user?.full_name}</h1>
      <p className="muted">{user?.email}</p>

      {/* Earnings Verification Disclaimer */}
      <div className="verification-payout-disclaimer">
        <strong>💡 Earnings Disclaimer:</strong> Translation earnings will be added to your ready cash-out balance as soon as your translations have been clinically verified by a reviewer. Once verified, you can withdraw your funds immediately.
      </div>

      {/* Translation Review Progress & Cashout Threshold */}
      <div className="card review-progress-card">
        <div className="review-progress-header">
          <div>
            <h2>Translation Review Progress</h2>
            <p className="hint">Track clinical verification of your submitted Luganda translations.</p>
          </div>
          <span className={`review-badge ${reviewPct === 100 && totalValidated > 0 ? "verified-all" : "in-progress"}`}>
            {reviewPct === 100 && totalValidated > 0 ? "✓ 100% Verified" : `${reviewPct}% Reviewed`}
          </span>
        </div>

        <div className="progress-section">
          <div className="progress-label-row">
            <span>
              <strong>{verifiedCount}</strong> of <strong>{totalValidated}</strong> translations verified
            </span>
            <span className="hint">
              {pendingReviewCount > 0
                ? `${pendingReviewCount} waiting for review (~${ugx(pendingReviewUgx)} pending)`
                : totalValidated > 0
                ? "All translations verified!"
                : "No translations submitted yet"}
            </span>
          </div>
          <div className="progress-bar-bg review-bar-bg">
            <div
              className={`progress-bar-fill ${reviewPct === 100 && totalValidated > 0 ? "forest" : "gold"}`}
              style={{ width: `${reviewPct}%` }}
            />
          </div>
          {reviewPct === 100 && totalValidated > 0 ? (
            <div className="review-bar-celebration">
              🎉 <strong>Review bar filled!</strong> All your submitted translations have been successfully verified and credited to your ready balance.
            </div>
          ) : pendingReviewCount > 0 ? (
            <div className="review-bar-hint">
              Reviewers verify clinical accuracy in the order received. As soon as each translation is verified, its reward is added to your ready balance.
            </div>
          ) : null}
        </div>

        <div className="threshold-section">
          <div className="threshold-label-row">
            <span className="threshold-title">
              {isThresholdReached
                ? "✓ Minimum Cashout Threshold Reached"
                : `Cashout Threshold (${ugx(bal.min_cashout_ugx)})`}
            </span>
            <span className="hint">
              {isThresholdReached
                ? `${ugx(bal.available_ugx)} ready to withdraw`
                : `Need ${ugx(short)} more verified earnings`}
            </span>
          </div>
          <div className="progress-bar-bg threshold-bar-bg">
            <div
              className={`progress-bar-fill ${isThresholdReached ? "forest" : "warning"}`}
              style={{ width: `${thresholdPct}%` }}
            />
          </div>
          {isThresholdReached ? (
            <p className="threshold-note success">
              ✓ <strong>Threshold reached!</strong> Your verified earnings meet or exceed the minimum requirement of {ugx(bal.min_cashout_ugx)}. You can cash out below.
            </p>
          ) : (
            <p className="threshold-note pending">
              ⚠️ Minimum cashout is <strong>{ugx(bal.min_cashout_ugx)}</strong>. Once more translations are verified and your balance hits the threshold, withdrawal unlocks.
            </p>
          )}
        </div>
      </div>

      <div className="card balance">
        <p className="label">Ready to cash out (verified)</p>
        <p className="big">{ugx(bal.available_ugx)}</p>
        <p className="muted">
          {hasPending ? "A cash-out is currently pending review and payment."
            : short > 0 ? `Verify ${ugx(short)} more to reach the ${ugx(bal.min_cashout_ugx)} minimum cashout.` : "You can cash out now."}
        </p>

        <div className="cashout-timing-notice">
          <strong>⏱️ Mobile Money Transfer:</strong> Once requested, your verified payout will be transferred to your registered mobile money account within <strong>24 to 48 hours</strong>.
        </div>

        {methods.length > 0 && (
          <label>Send to
            <select value={chosen} onChange={(e) => setChosen(e.target.value)}>
              {methods.map((m) => <option key={m.id} value={m.id}>{NAMES[m.provider]} {m.phone_number} ({m.account_name})</option>)}
            </select>
          </label>
        )}

        <div className="cashout-amount-container">
          <label htmlFor="custom-cashout-input">Amount to withdraw (UGX)</label>
          <div className="amount-input-row">
            <span className="amount-currency-label">UGX</span>
            <input
              id="custom-cashout-input"
              type="number"
              min={bal.min_cashout_ugx}
              max={bal.available_ugx}
              step={1000}
              placeholder={bal.available_ugx > 0 ? String(bal.available_ugx) : "0"}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              disabled={busy || short > 0 || hasPending}
              className="amount-input"
            />
          </div>

          <div className="amount-presets">
            <button
              type="button"
              className={`chip-btn ${customAmount === String(bal.min_cashout_ugx) ? "active" : ""}`}
              onClick={() => setCustomAmount(String(bal.min_cashout_ugx))}
              disabled={busy || short > 0 || hasPending}
            >
              Min ({ugx(bal.min_cashout_ugx)})
            </button>
            {bal.available_ugx > bal.min_cashout_ugx && (
              <button
                type="button"
                className={`chip-btn ${customAmount === String(Math.floor(bal.available_ugx / 2)) ? "active" : ""}`}
                onClick={() => setCustomAmount(String(Math.floor(bal.available_ugx / 2)))}
                disabled={busy || short > 0 || hasPending}
              >
                50% ({ugx(Math.floor(bal.available_ugx / 2))})
              </button>
            )}
            <button
              type="button"
              className={`chip-btn ${customAmount === "" || customAmount === String(bal.available_ugx) ? "active" : ""}`}
              onClick={() => setCustomAmount(String(bal.available_ugx))}
              disabled={busy || short > 0 || hasPending}
            >
              All / Max ({ugx(bal.available_ugx)})
            </button>
          </div>

          {customAmount.trim() !== "" && !isCustomValid && (
            <p className="cashout-calc-error">
              {withdrawAmount < bal.min_cashout_ugx
                ? `Minimum withdrawal amount is ${ugx(bal.min_cashout_ugx)}.`
                : `Amount cannot exceed your available balance of ${ugx(bal.available_ugx)}.`}
            </p>
          )}

          {isCustomValid && (
            <div className="cashout-calc-summary">
              <span>Remaining balance after cash-out:</span>
              <strong>{ugx(remainingBalance)}</strong>
            </div>
          )}
        </div>

        <button className="primary" disabled={!canCash} onClick={cashOut}>
          Cash out {isCustomValid ? ugx(withdrawAmount) : ugx(bal.available_ugx)}
        </button>
        {methods.length === 0 && <p className="muted">Add a mobile money account below to cash out.</p>}
        {notice && <p className="ok" role="status">{notice}</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </div>

      <dl className="stats profile-stats-grid">
        <div><dt>Verified earnings</dt><dd>{ugx(bal.total_earned_ugx)}</dd></div>
        <div><dt>Pending review</dt><dd>{ugx(pendingReviewUgx)}</dd></div>
        <div><dt>Waiting for payment</dt><dd>{ugx(bal.pending_ugx)}</dd></div>
        <div><dt>Paid to you</dt><dd>{ugx(bal.paid_out_ugx)}</dd></div>
        <div><dt>Translations done</dt><dd>{totalValidated}</dd></div>
        <div><dt>Clinically verified</dt><dd>{verifiedCount}</dd></div>
      </dl>

      <h2>Mobile money accounts</h2>
      <ul className="list">
        {methods.map((m) => (
          <li key={m.id} className="card row">
            <div><strong>{NAMES[m.provider]}</strong> {m.phone_number}<br /><span className="muted">Registered name: {m.account_name}</span></div>
            <button className="link" disabled={busy} onClick={() => run(() => api(`/me/payment-methods/${m.id}`, { method: "DELETE" }))}>Remove</button>
          </li>
        ))}
      </ul>
      <form onSubmit={addMethod} className="card stack">
        <label>Network
          <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value as Provider })}>
            <option value="mtn">MTN MoMo</option><option value="airtel">Airtel Money</option>
          </select>
        </label>
        <label>Mobile money number<input inputMode="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0772 123456" /></label>
        <label>Name registered on that number
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <span className="hint">Use the name the network shows, even if it differs from your own.</span>
        </label>
        <button className="ghost" disabled={busy}>Add account</button>
      </form>

      <h2>Cash-out history</h2>
      {payouts.length === 0 ? <p className="muted">No cash-outs yet.</p> : (
        <ul className="list">
          {payouts.map((p) => (
            <li key={p.id} className="card row" style={{ alignItems: "flex-start" }}>
              <div>
                <strong>{ugx(p.amount_ugx)}</strong> to {NAMES[p.provider]} {p.phone_number}<br />
                <span className="muted">{new Date(p.requested_at).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })}</span>
                {p.status === "pending" && (
                  <div className="hint" style={{ color: "var(--forest)", marginTop: "0.25rem", fontSize: "0.82rem" }}>
                    ⏳ Under clinical review. Sent within 24–48 hours upon successful verification.
                  </div>
                )}
                <div style={{ marginTop: "0.4rem" }}>
                  <Link
                    to={`/inquiries?category=payout_issue&payout_id=${encodeURIComponent(p.id)}`}
                    className="payout-inquiry-link"
                    title="Need help or have an issue regarding this payout?"
                  >
                    💬 Inquire about this payout
                  </Link>
                </div>
              </div>
              <span className={`tag ${p.status}`}>{STATUS[p.status]}</span>
            </li>
          ))}
        </ul>
      )}

    </section>
  );
}
