import { useCallback, useEffect, useState, type FormEvent } from "react";
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
  const cashOut = () => run(async () => {
    await post("/payouts", { payment_method_id: chosen });
    setNotice("Withdrawal request submitted! Your translations will undergo clinical review. Once reviews are successfully approved, your payment will be sent to your mobile money within 24 to 48 hours.");
  });

  if (!bal) return <p className="muted">{error || "Loading…"}</p>;
  const hasPending = payouts.some((p) => p.status === "pending");
  const short = bal.min_cashout_ugx - bal.available_ugx;
  const canCash = !!chosen && short <= 0 && !hasPending && !busy;

  return (
    <section className="profile">
      <h1>{user?.full_name}</h1>
      <p className="muted">{user?.email}</p>

      <div className="card balance">
        <p className="label">Ready to cash out</p>
        <p className="big">{ugx(bal.available_ugx)}</p>
        <p className="muted">
          {hasPending ? "A cash-out is currently pending review and payment."
            : short > 0 ? `Earn ${ugx(short)} more to reach the ${ugx(bal.min_cashout_ugx)} minimum.` : "You can cash out now."}
        </p>

        <div className="cashout-timing-notice">
          <strong>⏱️ Withdrawal Timeline:</strong> Once requested, your translations undergo clinical review for accuracy. If reviews are verified successfully, money is transferred to your mobile money account within <strong>24 to 48 hours</strong>.
        </div>

        {methods.length > 0 && (
          <label>Send to
            <select value={chosen} onChange={(e) => setChosen(e.target.value)}>
              {methods.map((m) => <option key={m.id} value={m.id}>{NAMES[m.provider]} {m.phone_number} ({m.account_name})</option>)}
            </select>
          </label>
        )}
        <button className="primary" disabled={!canCash} onClick={cashOut}>Cash out {ugx(bal.available_ugx)}</button>
        {methods.length === 0 && <p className="muted">Add a mobile money account below to cash out.</p>}
        {notice && <p className="ok" role="status">{notice}</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </div>


      <dl className="stats">
        <div><dt>Total earned</dt><dd>{ugx(bal.total_earned_ugx)}</dd></div>
        <div><dt>Waiting for payment</dt><dd>{ugx(bal.pending_ugx)}</dd></div>
        <div><dt>Paid to you</dt><dd>{ugx(bal.paid_out_ugx)}</dd></div>
        <div><dt>Sentences done</dt><dd>{bal.validated_count}</dd></div>
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
              </div>
              <span className={`tag ${p.status}`}>{STATUS[p.status]}</span>
            </li>
          ))}
        </ul>
      )}

    </section>
  );
}
