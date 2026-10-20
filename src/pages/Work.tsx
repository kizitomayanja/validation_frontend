import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, post, ugx, type Sentence } from "../api";

const CLAIM_SECONDS = 15 * 60; // 15-minute claim lease

export default function Work() {
  const [s, setS] = useState<Sentence | null>(null);
  const [text, setText] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "empty" | "saving">("loading");
  const [error, setError] = useState("");
  const [session, setSession] = useState({ count: 0, earned: 0 });
  const [flash, setFlash] = useState("");
  const [timeLeft, setTimeLeft] = useState(CLAIM_SECONDS);

  const next = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      const n = await api<Sentence | undefined>("/work/next");
      if (!n) {
        setS(null);
        setState("empty");
        return;
      }
      setS(n);
      setText("");
      setTimeLeft(CLAIM_SECONDS);
      setState("ready");
    } catch (e) {
      setError((e as Error).message);
      setState("empty");
    }
  }, []);

  useEffect(() => {
    next();
  }, [next]);

  // Claim countdown timer
  useEffect(() => {
    if (state !== "ready" || !s) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setError("Your 15-minute claim window has expired. Someone else may claim this sentence.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state, s]);

  const submit = async () => {
    if (!s || !text.trim()) {
      setError("The translation can't be empty.");
      return;
    }

    setState("saving");
    setError("");
    try {
      const r = await post<{ reward_ugx: number }>(`/work/${s.id}/submit`, {
        clean_lug: text.trim(),
        confirmed_unchanged: true,
      });
      setSession((x) => ({ count: x.count + 1, earned: x.earned + r.reward_ugx }));
      setFlash(`Saved. You earned ${ugx(r.reward_ugx)}.`);
      await next();
    } catch (e) {
      setError((e as Error).message);
      setState("ready");
    }
  };

  const skip = async () => {
    if (s) {
      await post(`/work/${s.id}/skip`).catch(() => {});
      next();
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const sec = secs % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return (
    <section className="work">
      <div className="medical-note">
        <strong>Medical Quality Notice:</strong> This dataset trains AI translators used in hospital clinics. Accuracy is critical for diagnosis and patient safety. Verify medical symptoms, dosage terms, and clinical intent.
      </div>

      <p className="session" aria-live="polite">
        {flash || "Read the clinical source sentence, provide the Luganda translation, then save."}
        {session.count > 0 && <span className="muted"> This session: {session.count} done, {ugx(session.earned)}</span>}
      </p>

      {state === "loading" && <p className="muted">Fetching your next sentence…</p>}
      {state === "empty" && (
        <div className="card">
          <p>{error || "No sentences are waiting right now (or campaign budget has been reached)."}</p>
          <button className="primary" onClick={next}>Check again</button>
        </div>
      )}

      {s && (state === "ready" || state === "saving") && (
        <div className="pair">
          <article className="card source">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".5rem" }}>
              <h2>English clinical source</h2>
              <span className={`timer ${timeLeft < 120 ? "warning" : ""}`} title="Time remaining on this sentence claim">
                Claim: {formatTimer(timeLeft)}
              </span>
            </div>
            <p className="sentence">{s.noisy_english}</p>
            <div className="stub">
              <span className="reward">{ugx(s.reward_ugx)}</span>
              <span className={`tag ${s.difficulty}`}>{s.difficulty}</span>
            </div>
          </article>

          <article className="card">
            <h2><label htmlFor="lug">Luganda translation</label></h2>
            <textarea
              id="lug"
              lang="lg"
              value={text}
              placeholder="Enter your Luganda translation here…"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={6}
            />

            {error && <p className="error" role="alert">{error}</p>}

            <div className="actions">
              <button className="primary" onClick={submit} disabled={state === "saving"}>
                {state === "saving" ? "Saving…" : "Save translation"}
              </button>
              <button className="ghost" onClick={skip} disabled={state === "saving"}>
                Skip sentence
              </button>
              <Link
                to={`/inquiries?category=clinical_terminology&sentence_id=${s.id}`}
                className="doctor-inquiry-btn"
                title="Unsure of clinical terminology or diagnosis phrasing? Ask a qualified doctor reviewer."
              >
                🩺 Ask a Doctor
              </Link>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
