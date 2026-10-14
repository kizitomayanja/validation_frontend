import { useEffect, useState } from "react";
import { api, post, ReviewSentence, ugx } from "../api";

export default function Review() {
  const [queue, setQueue] = useState<ReviewSentence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [editedLuganda, setEditedLuganda] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadQueue = async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await api<ReviewSentence[]>("/review/queue");
      setQueue(items);
      setCurrentIndex(0);
      if (items.length > 0) {
        setEditedLuganda(items[0].clean_lug);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load clinical review queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

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
    } catch (err: any) {
      setError(err?.message || "Failed to reject sentence.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && queue.length === 0) {
    return <p className="center muted">Loading clinical review queue…</p>;
  }

  return (
    <div className="review-container">
      <div className="review-header">
        <div>
          <h1>Clinical & Linguistic Review</h1>
          <p className="hint">
            Verify English-to-Luganda medical translations for clinical precision, accuracy, and hospital safety.
          </p>
        </div>
        <div className="row" style={{ gap: "0.5rem" }}>
          <span className="queue-pill">
            {queue.length} {queue.length === 1 ? "sentence" : "sentences"} waiting
          </span>
          <button className="ghost" onClick={loadQueue} disabled={loading}>
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

      {!currentSentence ? (
        <div className="card center review-empty-card">
          <h2>🎉 Review Queue is Clear!</h2>
          <p className="muted" style={{ maxWidth: "28rem", margin: "0.5rem auto 1.5rem" }}>
            All submitted translations have been clinically checked and verified.
            Validators are actively working on remaining sentences.
          </p>
          <button className="ghost" onClick={loadQueue}>
            Check for New Submissions
          </button>
        </div>
      ) : (
        <div className="card review-card">
          <div className="review-meta-bar">
            <div className="row" style={{ gap: "0.75rem", flexWrap: "wrap" }}>
              <span className="sentence-id-tag">Sentence #{currentSentence.id}</span>
              <span className={`tag ${currentSentence.difficulty}`}>{currentSentence.difficulty}</span>
              <span className="reward-tag">{ugx(currentSentence.reward_ugx)}</span>
            </div>
            <div className="validator-info hint">
              Translated by <strong>{currentSentence.validator_name}</strong> •{" "}
              {new Date(currentSentence.validated_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
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
