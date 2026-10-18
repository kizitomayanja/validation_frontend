import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, post, ReviewSentence, ReviewValidator, ugx } from "../api";

export default function Review() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryUser = searchParams.get("username") || searchParams.get("validator") || "";

  const [queue, setQueue] = useState<ReviewSentence[]>([]);
  const [validators, setValidators] = useState<ReviewValidator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Review by specific username / validator filter
  const [selectedUsername, setSelectedUsername] = useState<string>(queryUser);
  const [searchInput, setSearchInput] = useState<string>(queryUser);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [editedLuganda, setEditedLuganda] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sync state if searchParams change externally (e.g. browser navigation or deep link)
  useEffect(() => {
    const q = searchParams.get("username") || searchParams.get("validator") || "";
    if (q !== selectedUsername) {
      setSelectedUsername(q);
      setSearchInput(q);
    }
  }, [searchParams]);

  const loadValidators = async () => {
    try {
      const data = await api<ReviewValidator[]>("/review/validators");
      setValidators(data);
    } catch {
      // Graceful fallback if endpoint is not supported
    }
  };

  const loadQueue = async (usernameFilter?: string) => {
    try {
      setLoading(true);
      setError(null);
      const queryParam =
        usernameFilter && usernameFilter.trim()
          ? `?username=${encodeURIComponent(usernameFilter.trim())}`
          : "";
      const items = await api<ReviewSentence[]>(`/review/queue${queryParam}`);
      setQueue(items);
      setCurrentIndex(0);
      if (items.length > 0) {
        setEditedLuganda(items[0].clean_lug);
      }
      loadValidators();
    } catch (err: any) {
      setError(err?.message || "Failed to load clinical review queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue(selectedUsername);
  }, [selectedUsername]);

  const handleSelectValidator = (username: string) => {
    setSelectedUsername(username);
    setSearchInput(username);
    if (username) {
      setSearchParams({ username });
    } else {
      setSearchParams({});
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = searchInput.trim();
    setSelectedUsername(trimmed);
    if (trimmed) {
      setSearchParams({ username: trimmed });
    } else {
      setSearchParams({});
    }
  };

  const handleClearFilter = () => {
    setSelectedUsername("");
    setSearchInput("");
    setSearchParams({});
  };


  const currentSentence = queue[currentIndex] || null;

  useEffect(() => {
    if (currentSentence) {
      setEditedLuganda(currentSentence.clean_lug);
      setShowRejectDialog(false);
      setRejectionReason("");
    }
  }, [currentIndex, currentSentence?.id]);

  const handleApprove = async () => {
    if (!currentSentence) return;
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      // Check if text was edited
      if (editedLuganda.trim() !== currentSentence.clean_lug.trim()) {
        await post<ReviewSentence>(`/review/${currentSentence.id}/edit`, {
          clean_lug: editedLuganda.trim(),
        });
        setSuccess(`Sentence #${currentSentence.id} edited and verified!`);
      } else {
        await post<ReviewSentence>(`/review/${currentSentence.id}/approve`);
        setSuccess(`Sentence #${currentSentence.id} approved as verified!`);
      }

      // Remove approved item from queue
      const updatedQueue = queue.filter((_, idx) => idx !== currentIndex);
      setQueue(updatedQueue);
      if (currentIndex >= updatedQueue.length) {
        setCurrentIndex(Math.max(0, updatedQueue.length - 1));
      }
      loadValidators();
    } catch (err: any) {
      setError(err?.message || "Failed to approve sentence.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!currentSentence) return;
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      await post(`/review/${currentSentence.id}/reject`, {
        rejection_reason: rejectionReason.trim() || undefined,
      });

      setSuccess(`Sentence #${currentSentence.id} rejected and returned to validator pool.`);
      const updatedQueue = queue.filter((_, idx) => idx !== currentIndex);
      setQueue(updatedQueue);
      setShowRejectDialog(false);
      setRejectionReason("");
      if (currentIndex >= updatedQueue.length) {
        setCurrentIndex(Math.max(0, updatedQueue.length - 1));
      }
      loadValidators();
    } catch (err: any) {
      setError(err?.message || "Failed to reject sentence.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalWaiting = validators.reduce((acc, v) => acc + v.count, 0) || queue.length;

  return (
    <div className="review-container">
      {/* Targeted Contributor Direct Review Context Bar */}
      {selectedUsername && (
        <div className="review-context-banner">
          <div className="context-left">
            <span className="direct-badge">Direct Review Mode</span>
            <span className="context-user-label">Auditing submissions for:</span>
            <strong>{selectedUsername}</strong>
            <span className="context-count-tag">
              ({queue.length} {queue.length === 1 ? "sentence" : "sentences"} waiting)
            </span>
          </div>
          <div className="context-actions">
            <Link to="/admin?tab=payouts" className="small-btn ghost-btn" style={{ textDecoration: "none" }}>
              ← Return to Payout Requests
            </Link>
            <Link to="/admin?tab=users" className="small-btn ghost-btn" style={{ textDecoration: "none" }}>
              ← Return to User Roles
            </Link>
            <button className="link clear-filter-btn" onClick={handleClearFilter} style={{ fontSize: "0.85rem" }}>
              Clear Filter
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="review-header">

        <div>
          <h1>Clinical & Linguistic Review</h1>
          <p className="hint">
            Verify English-to-Luganda medical translations for clinical precision, accuracy, and hospital safety.
          </p>
        </div>
        <div className="row" style={{ gap: "0.5rem" }}>
          <span className="queue-pill">
            {totalWaiting} {totalWaiting === 1 ? "sentence" : "sentences"} waiting
          </span>
          <button className="ghost" onClick={() => loadQueue(selectedUsername)} disabled={loading}>
            {loading ? "…" : "↻ Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <p className="error">{error}</p>
          <button className="link" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {success && (
        <div className="success-banner">
          <p className="ok">{success}</p>
          <button className="link" onClick={() => setSuccess(null)}>Dismiss</button>
        </div>
      )}

      {/* Review By Username / Validator Filter Card */}
      <div className="review-filter-bar">
        <div className="review-filter-row">
          <span className="review-filter-label">Filter by Validator:</span>

          {/* Quick Select by Active Validator */}
          <select
            className="validator-select"
            value={selectedUsername}
            onChange={(e) => handleSelectValidator(e.target.value)}
            aria-label="Select validator"
          >
            <option value="">👥 All Validators ({totalWaiting} waiting)</option>
            {validators.map((v) => (
              <option key={v.id} value={v.name}>
                👤 {v.name} ({v.count} {v.count === 1 ? "sentence" : "sentences"})
              </option>
            ))}
          </select>

          {/* Search by Username / Email */}
          <form onSubmit={handleSearchSubmit} className="username-search-group">
            <input
              type="text"
              className="username-search-input"
              placeholder="Search username or email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit" className="primary small-btn" disabled={loading}>
              Filter
            </button>
            {selectedUsername && (
              <button type="button" className="ghost small-btn" onClick={handleClearFilter}>
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Active Filter Pill */}
        {selectedUsername && (
          <div className="filter-active-pill">
            <span>
              Targeting validator: <strong>"{selectedUsername}"</strong> ({queue.length}{" "}
              {queue.length === 1 ? "sentence" : "sentences"} in queue)
            </span>
            <button type="button" className="clear-filter-btn" onClick={handleClearFilter}>
              Show All
            </button>
          </div>
        )}
      </div>

      {/* Main Review Station */}
      {loading && queue.length === 0 ? (
        <p className="center muted">Loading clinical review queue…</p>
      ) : !currentSentence ? (
        <div className="card center review-empty-card">
          <h2>
            {selectedUsername ? `No Pending Items for "${selectedUsername}"` : "🎉 Review Queue is Clear!"}
          </h2>
          <p className="muted" style={{ maxWidth: "28rem", margin: "0.5rem auto 1.5rem" }}>
            {selectedUsername
              ? `There are no unverified translations waiting for "${selectedUsername}". You can select another validator or review all submissions.`
              : "All submitted translations have been clinically checked and verified. Validators are actively working on remaining sentences."}
          </p>
          {selectedUsername ? (
            <button className="primary" onClick={handleClearFilter}>
              View All Waiting Sentences ({totalWaiting})
            </button>
          ) : (
            <button className="ghost" onClick={() => loadQueue()}>
              Check for New Submissions
            </button>
          )}
        </div>
      ) : (
        <div className="card review-card">
          {/* Non-linear Sentence Navigator / Jumper */}
          <div className="review-nav-strip">
            <div className="queue-progress-info">
              <span>Sentence {currentIndex + 1} of {queue.length}</span>
              {selectedUsername && <span className="tag easy">Filtered</span>}
            </div>

            {/* Jump directly to any sentence in the queue */}
            <select
              className="sentence-jump-select"
              value={currentIndex}
              onChange={(e) => setCurrentIndex(Number(e.target.value))}
              aria-label="Jump directly to specific sentence"
              title="Jump directly to another sentence in the queue"
            >
              {queue.map((item, idx) => (
                <option key={item.id} value={idx}>
                  #{item.id} — {item.validator_name} ({item.difficulty.toUpperCase()}) — "{item.noisy_english.slice(0, 32)}…"
                </option>
              ))}
            </select>

            {/* Fast Previous / Next controls */}
            <div className="queue-nav-buttons">
              <button
                type="button"
                className="queue-nav-btn"
                onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : queue.length - 1))}
                disabled={queue.length <= 1 || submitting}
                title="Go to previous sentence"
              >
                ← Prev
              </button>
              <button
                type="button"
                className="queue-nav-btn"
                onClick={() => setCurrentIndex((prev) => (prev + 1) % queue.length)}
                disabled={queue.length <= 1 || submitting}
                title="Go to next sentence"
              >
                Next →
              </button>
            </div>
          </div>

          <div className="review-meta-bar">
            <div className="row" style={{ gap: "0.75rem", flexWrap: "wrap" }}>
              <span className="sentence-id-tag">Sentence #{currentSentence.id}</span>
              <span className={`tag ${currentSentence.difficulty}`}>{currentSentence.difficulty}</span>
              <span className="reward-tag">{ugx(currentSentence.reward_ugx)}</span>
            </div>
            <div className="validator-info hint">
              Translated by{" "}
              <button
                type="button"
                className="link"
                style={{ fontWeight: 700, padding: 0 }}
                onClick={() => handleSelectValidator(currentSentence.validator_name)}
                title={`Filter all entries by ${currentSentence.validator_name}`}
              >
                {currentSentence.validator_name}
              </button>
              {currentSentence.validator_email && (
                <span className="validator-email-hint"> ({currentSentence.validator_email})</span>
              )}{" "}
              • {new Date(currentSentence.validated_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
            </div>
          </div>

          <div className="review-comparison-grid">
            <div className="review-box source-box">
              <label className="box-label">Original English Clinical Prompt</label>
              <blockquote className="sentence-display english-text">
                {currentSentence.noisy_english}
              </blockquote>
            </div>

            <div className="review-box ai-attempt-box">
              <label className="box-label">Initial AI Attempt (Uncorrected)</label>
              <div className="sentence-display ai-text">
                {currentSentence.attempted}
              </div>
            </div>
          </div>

          <div className="review-box edit-box" style={{ marginTop: "1rem" }}>
            <div className="row" style={{ marginBottom: "0.4rem" }}>
              <label className="box-label">
                Validator's Luganda Translation (Editable for clinical refinement)
              </label>
              {editedLuganda.trim() !== currentSentence.clean_lug.trim() && (
                <span className="tag medium">Modified by reviewer</span>
              )}
            </div>
            <textarea
              rows={3}
              value={editedLuganda}
              onChange={(e) => setEditedLuganda(e.target.value)}
              placeholder="Correct medical terminology or phrasing if necessary…"
            />
            <span className="hint">
              Ensure medical terms (e.g. puleesa, asthma, sukaali, okuziyira, omusaayi) are culturally and clinically accurate.
            </span>
          </div>

          {showRejectDialog ? (
            <div className="rejection-box" style={{ marginTop: "1rem" }}>
              <h4>Reject and Return Sentence to Validator Pool</h4>
              <p className="hint">
                Rejecting removes the unverified translation and returns the sentence to the queue for other validators.
                Reward credits are revoked.
              </p>
              <input
                type="text"
                placeholder="Reason for rejection (e.g. Inaccurate clinical translation of chest pain)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                autoFocus
              />
              <div className="actions" style={{ marginTop: "0.5rem" }}>
                <button
                  type="button"
                  className="reject-btn"
                  onClick={handleReject}
                  disabled={submitting}
                >
                  {submitting ? "Rejecting…" : "Confirm Rejection"}
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setShowRejectDialog(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="actions review-actions-bar" style={{ marginTop: "1.2rem" }}>
              <button
                type="button"
                className="primary approve-btn"
                onClick={handleApprove}
                disabled={submitting || !editedLuganda.trim()}
              >
                {submitting
                  ? "Saving…"
                  : editedLuganda.trim() !== currentSentence.clean_lug.trim()
                  ? "✓ Save Edit & Mark Verified"
                  : "✓ Approve as Verified"}
              </button>

              <button
                type="button"
                className="ghost reject-trigger-btn"
                onClick={() => setShowRejectDialog(true)}
                disabled={submitting}
              >
                ✕ Reject Translation
              </button>

              {queue.length > 1 && (
                <button
                  type="button"
                  className="ghost skip-btn"
                  onClick={() => setCurrentIndex((prev) => (prev + 1) % queue.length)}
                  disabled={submitting}
                  style={{ marginLeft: "auto" }}
                >
                  Next in Queue →
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
