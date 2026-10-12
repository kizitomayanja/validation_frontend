import { useCallback, useEffect, useState } from "react";
import { api, post, ugx, type Sentence } from "../api";

export default function Work() {
  const [s, setS] = useState<Sentence | null>(null);
  const [text, setText] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "empty" | "saving">("loading");
  const [error, setError] = useState("");
  const [session, setSession] = useState({ count: 0, earned: 0 });
  const [flash, setFlash] = useState("");

  const next = useCallback(async () => {
    setState("loading"); setError("");
    try {
      const n = await api<Sentence | undefined>("/work/next");
      if (!n) { setS(null); setState("empty"); return; }
      setS(n); setText(n.attempted); setState("ready");
    } catch (e) { setError((e as Error).message); setState("empty"); }
  }, []);
  useEffect(() => { next(); }, [next]);

  const submit = async () => {
    if (!s || !text.trim()) { setError("The translation can't be empty."); return; }
    setState("saving"); setError("");
    try {
      const r = await post<{ reward_ugx: number }>(`/work/${s.id}/submit`, { clean_lug: text.trim() });
      setSession((x) => ({ count: x.count + 1, earned: x.earned + r.reward_ugx }));
      setFlash(`Saved. You earned ${ugx(r.reward_ugx)}.`);
      await next();
    } catch (e) { setError((e as Error).message); setState("ready"); }
  };
  const skip = async () => { if (s) { await post(`/work/${s.id}/skip`).catch(() => {}); next(); } };

  return (
    <section className="work">
      <p className="session" aria-live="polite">
        {flash || "Check each sentence, fix the Luganda, then save."}
        {session.count > 0 && <span className="muted"> This session: {session.count} done, {ugx(session.earned)}</span>}
      </p>
      {state === "loading" && <p className="muted">Fetching your next sentence…</p>}
      {state === "empty" && (
        <div className="card"><p>{error || "No sentences are waiting right now."}</p><button className="primary" onClick={next}>Check again</button></div>
      )}
      {s && (state === "ready" || state === "saving") && (
        <div className="pair">
          <article className="card source">
            <h2>English</h2>
            <p className="sentence">{s.noisy_english}</p>
            <div className="stub">
              <span className="reward">{ugx(s.reward_ugx)}</span>
              <span className={`tag ${s.difficulty}`}>{s.difficulty}</span>
            </div>
          </article>
          <article className="card">
            <h2><label htmlFor="lug">Luganda translation</label></h2>
            <textarea id="lug" lang="lg" value={text} onChange={(e) => setText(e.target.value)} rows={6} />
            <button type="button" className="link" onClick={() => setText(s.attempted)} disabled={text === s.attempted}>Restore original</button>
            {error && <p className="error" role="alert">{error}</p>}
            <div className="actions">
              <button className="primary" onClick={submit} disabled={state === "saving"}>{state === "saving" ? "Saving…" : "Save translation"}</button>
              <button className="ghost" onClick={skip} disabled={state === "saving"}>Skip sentence</button>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
