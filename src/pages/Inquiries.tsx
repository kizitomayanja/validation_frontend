import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  api,
  patch,
  post,
  type InquiryTicket,
  type TargetRole,
  type TicketCategory,
  type TicketMessage,
  type TicketStatus,
} from "../api";
import { useAuth } from "../auth";

const CATEGORY_META: Record<
  TicketCategory,
  { label: string; icon: string; target: TargetRole; roleLabel: string }
> = {
  clinical_terminology: {
    label: "Clinical Terminology",
    icon: "🩺",
    target: "reviewer",
    roleLabel: "Qualified Medical Doctors / Reviewers",
  },
  review_dispute: {
    label: "Review Dispute",
    icon: "⚖️",
    target: "reviewer",
    roleLabel: "Qualified Medical Doctors / Reviewers",
  },
  payout_issue: {
    label: "Payout / Cashout Issue",
    icon: "💰",
    target: "admin",
    roleLabel: "Platform Administrators",
  },
  role_request: {
    label: "Role Upgrade Request",
    icon: "⭐",
    target: "admin",
    roleLabel: "Platform Administrators",
  },
  general: {
    label: "General Platform Question",
    icon: "ℹ️",
    target: "admin",
    roleLabel: "Platform Administrators",
  },
};

const STATUS_META: Record<TicketStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "status-open" },
  in_progress: { label: "In Progress", className: "status-inprogress" },
  resolved: { label: "Resolved", className: "status-resolved" },
};

export default function Inquiries() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Scopes: "my" (own tickets), "clinical" (reviewer queue), "ops" (admin queue)
  const isReviewer = user?.role === "reviewer" || user?.role === "admin";
  const isAdmin = user?.role === "admin";

  const initialScope = searchParams.get("scope") as "my" | "clinical" | "ops" | null;
  const [activeScope, setActiveScope] = useState<"my" | "clinical" | "ops">(
    initialScope || (isAdmin ? "ops" : isReviewer ? "clinical" : "my")
  );

  // Whenever the active user changes (e.g. persona switch), ensure activeScope is allowed and clear active ticket
  useEffect(() => {
    if (!user) return;
    if (user.role === "validator") {
      setActiveScope("my");
    } else if (user.role === "reviewer" && activeScope === "ops") {
      setActiveScope("clinical");
    }
    setSelectedTicketId(null);
    setActiveTicket(null);
  }, [user?.id, user?.role]);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tickets, setTickets] = useState<InquiryTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<InquiryTicket | null>(null);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New ticket modal state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<TicketCategory>("clinical_terminology");
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newSentenceId, setNewSentenceId] = useState<string>("");
  const [newPayoutId, setNewPayoutId] = useState<string>("");
  const [creatingTicket, setCreatingTicket] = useState(false);

  // Auto-open modal if URL has context params
  useEffect(() => {
    const cat = searchParams.get("category") as TicketCategory | null;
    const sentId = searchParams.get("sentence_id");
    const payId = searchParams.get("payout_id");

    if (cat && CATEGORY_META[cat]) {
      setNewCategory(cat);
      setIsNewModalOpen(true);
      if (sentId) {
        setNewSentenceId(sentId);
        setNewSubject(`Question regarding sentence #${sentId}`);
      }
      if (payId) {
        setNewPayoutId(payId);
        setNewSubject(`Inquiry regarding payout reference ${payId}`);
      }
    }
  }, [searchParams]);

  const handleScopeChange = (scope: "my" | "clinical" | "ops") => {
    if (scope === activeScope) return;
    setActiveScope(scope);
    setSelectedTicketId(null);
    setActiveTicket(null);
  };

  // Load ticket list
  const loadTickets = useCallback(
    async (selectId?: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await api<InquiryTicket[]>(`/tickets?scope=${activeScope}`);
        setTickets(data);
        if (data.length > 0) {
          const target = selectId && data.some((t) => t.id === selectId) ? selectId : data[0].id;
          setSelectedTicketId(target);
        } else {
          setSelectedTicketId(null);
          setActiveTicket(null);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load inquiries.");
      } finally {
        setLoading(false);
      }
    },
    [activeScope, user?.id]
  );

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Load active ticket detail
  const loadActiveTicket = useCallback(async (ticketId: string) => {
    setDetailLoading(true);
    try {
      const data = await api<InquiryTicket>(`/tickets/${ticketId}`);
      setActiveTicket(data);
    } catch (err: any) {
      setError(err.message || "Failed to load conversation thread.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTicketId) {
      loadActiveTicket(selectedTicketId);
    }
  }, [selectedTicketId, loadActiveTicket]);

  // Send message reply
  const handleSendReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !replyText.trim() || sendingReply) return;

    setSendingReply(true);
    try {
      const newMsg = await post<TicketMessage>(`/tickets/${selectedTicketId}/messages`, {
        message: replyText.trim(),
      });
      setReplyText("");
      // Update local activeTicket messages
      setActiveTicket((prev) =>
        prev
          ? {
              ...prev,
              messages: [...(prev.messages || []), newMsg],
              message_count: (prev.messages?.length || 0) + 1,
            }
          : prev
      );
      // Update tickets preview list
      setTickets((prev) =>
        prev.map((t) =>
          t.id === selectedTicketId
            ? {
                ...t,
                updated_at: newMsg.created_at,
                last_message_preview: newMsg.message.slice(0, 80),
                message_count: t.message_count + 1,
              }
            : t
        )
      );
    } catch (err: any) {
      setError(err.message || "Failed to send message.");
    } finally {
      setSendingReply(false);
    }
  };

  // Update status (e.g. resolve)
  const handleUpdateStatus = async (status: TicketStatus) => {
    if (!selectedTicketId) return;
    try {
      const updated = await patch<InquiryTicket>(`/tickets/${selectedTicketId}`, { status });
      setActiveTicket((prev) => (prev ? { ...prev, status } : prev));
      setTickets((prev) => prev.map((t) => (t.id === selectedTicketId ? { ...t, status } : t)));
    } catch (err: any) {
      setError(err.message || "Failed to update inquiry status.");
    }
  };

  // Create new ticket
  const handleCreateTicket = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim() || creatingTicket) return;

    setCreatingTicket(true);
    try {
      const created = await post<InquiryTicket>("/tickets", {
        category: newCategory,
        subject: newSubject.trim(),
        message: newMessage.trim(),
        sentence_id: newSentenceId.trim() ? Number(newSentenceId.trim()) : null,
        payout_id: newPayoutId.trim() || null,
      });

      setIsNewModalOpen(false);
      setNewSubject("");
      setNewMessage("");
      setNewSentenceId("");
      setNewPayoutId("");

      // Switch to "my" scope and select newly created ticket
      setActiveScope("my");
      await loadTickets(created.id);
    } catch (err: any) {
      setError(err.message || "Failed to create inquiry ticket.");
    } finally {
      setCreatingTicket(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="inquiries-page">
      {/* Top Header */}
      <header className="inquiries-header">
        <div>
          <h1 className="inquiries-title">💬 Communications & Inquiries</h1>
          <p className="inquiries-subtitle">
            Direct role-based routing. Clinical questions go directly to Doctors; payout and account
            issues go to Platform Administrators.
          </p>
        </div>

        <button
          type="button"
          className="primary new-inquiry-btn"
          onClick={() => setIsNewModalOpen(true)}
        >
          ➕ New Inquiry
        </button>
      </header>

      {error && (
        <div className="inquiry-error-banner" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Scope Navigation Tabs */}
      <div className="inquiry-tabs-bar">
        <div className="inquiry-scopes">
          <button
            type="button"
            className={`tab-chip ${activeScope === "my" ? "active" : ""}`}
            onClick={() => handleScopeChange("my")}
          >
            👤 My Inquiries
          </button>

          {isReviewer && (
            <button
              type="button"
              className={`tab-chip ${activeScope === "clinical" ? "active" : ""}`}
              onClick={() => handleScopeChange("clinical")}
            >
              🩺 Clinical Queue (Doctors)
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              className={`tab-chip ${activeScope === "ops" ? "active" : ""}`}
              onClick={() => handleScopeChange("ops")}
            >
              💰 Platform & Ops Queue (Admin)
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="status-filter-group">
          <label htmlFor="ticket-status-filter" className="muted" style={{ fontSize: "0.85rem" }}>
            Status:
          </label>
          <select
            id="ticket-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="status-filter-select"
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Main Two-Pane Split Layout */}
      <div className="inquiries-split-layout">
        {/* Left Pane: Ticket List */}
        <aside className="ticket-list-panel">
          {loading ? (
            <p className="muted pad-1">Loading inquiries…</p>
          ) : filteredTickets.length === 0 ? (
            <div className="ticket-list-empty pad-1">
              <p className="muted">No inquiries found in this queue.</p>
              {activeScope === "my" && (
                <button
                  type="button"
                  className="link"
                  onClick={() => setIsNewModalOpen(true)}
                  style={{ marginTop: "0.5rem" }}
                >
                  Create your first inquiry
                </button>
              )}
            </div>
          ) : (
            <ul className="ticket-items-list">
              {filteredTickets.map((t) => {
                const meta = CATEGORY_META[t.category] || CATEGORY_META.general;
                const statusMeta = STATUS_META[t.status];
                const isSelected = t.id === selectedTicketId;

                return (
                  <li
                    key={t.id}
                    className={`ticket-summary-item ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelectedTicketId(t.id)}
                  >
                    <div className="ticket-item-top">
                      <span className="ticket-category-pill">
                        {meta.icon} {meta.label}
                      </span>
                      <span className={`ticket-status-pill ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                    </div>

                    <h4 className="ticket-item-subject">{t.subject}</h4>

                    <p className="ticket-item-preview">{t.last_message_preview}</p>

                    <div className="ticket-item-footer">
                      <span className="ticket-meta-author">
                        {activeScope !== "my" ? `From: ${t.author_name}` : `Target: ${meta.target}`}
                      </span>
                      <span className="ticket-meta-time">
                        {new Date(t.updated_at).toLocaleDateString("en-UG", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Right Pane: Thread Details */}
        <section className="ticket-thread-panel">
          {!selectedTicketId || !activeTicket ? (
            <div className="thread-empty-state">
              <p className="muted">Select an inquiry from the left to view the conversation thread.</p>
            </div>
          ) : detailLoading ? (
            <p className="muted pad-1">Loading thread conversation…</p>
          ) : (
            <div className="thread-content-wrapper">
              {/* Thread Header */}
              <div className="thread-header">
                <div className="thread-header-main">
                  <div className="thread-meta-tags">
                    <span className="ticket-category-pill">
                      {CATEGORY_META[activeTicket.category]?.icon}{" "}
                      {CATEGORY_META[activeTicket.category]?.label}
                    </span>
                    <span
                      className={`ticket-status-pill ${STATUS_META[activeTicket.status]?.className}`}
                    >
                      {STATUS_META[activeTicket.status]?.label}
                    </span>
                    <span className="thread-routing-hint">
                      Routed to: <strong>{CATEGORY_META[activeTicket.category]?.roleLabel}</strong>
                    </span>
                  </div>

                  <h2 className="thread-title">{activeTicket.subject}</h2>

                  <div className="thread-author-bar">
                    <span>
                      Opened by <strong>{activeTicket.author_name}</strong> (
                      <span className={`role-badge-text role-${activeTicket.author_role}`}>
                        {activeTicket.author_role}
                      </span>
                      ) on{" "}
                      {new Date(activeTicket.created_at).toLocaleDateString("en-UG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>

                    {activeTicket.sentence_id && (
                      <span className="context-chip">
                        Sentence #{activeTicket.sentence_id}
                      </span>
                    )}

                    {activeTicket.payout_id && (
                      <span className="context-chip">
                        Payout: {activeTicket.payout_id}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status action button */}
                <div className="thread-status-actions">
                  {activeTicket.status !== "resolved" ? (
                    <button
                      type="button"
                      className="ghost resolve-btn"
                      onClick={() => handleUpdateStatus("resolved")}
                      title="Mark this inquiry as resolved"
                    >
                      ✓ Mark Resolved
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="ghost reopen-btn"
                      onClick={() => handleUpdateStatus("in_progress")}
                      title="Reopen inquiry"
                    >
                      ↺ Reopen Inquiry
                    </button>
                  )}
                </div>
              </div>

              {/* Message Stream */}
              <div className="thread-messages-stream">
                {activeTicket.messages?.map((msg) => {
                  const isCurrentUser = msg.sender_id === user?.id;
                  const isRoleDoctor = msg.sender_role === "reviewer";
                  const isRoleAdmin = msg.sender_role === "admin";

                  return (
                    <div
                      key={msg.id}
                      className={`thread-message-bubble ${
                        isCurrentUser ? "outgoing" : "incoming"
                      } ${isRoleDoctor ? "msg-doctor" : isRoleAdmin ? "msg-admin" : ""}`}
                    >
                      <div className="message-meta-header">
                        <strong className="message-sender-name">{msg.sender_name}</strong>
                        <span className={`nav-role-badge role-${msg.sender_role}`}>
                          {msg.sender_role === "reviewer"
                            ? "🩺 Doctor / Reviewer"
                            : msg.sender_role === "admin"
                            ? "💰 Admin"
                            : "✍️ Validator"}
                        </span>
                        <span className="message-timestamp">
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          ·{" "}
                          {new Date(msg.created_at).toLocaleDateString("en-UG", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>

                      <div className="message-body-text">{msg.message}</div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Composer */}
              <form onSubmit={handleSendReply} className="thread-composer">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={
                    activeTicket.status === "resolved"
                      ? "This inquiry is marked resolved. Replying will reopen it…"
                      : "Type your reply or explanation here…"
                  }
                  rows={3}
                  required
                />
                <div className="composer-actions">
                  <span className="composer-hint muted">
                    Press Shift+Enter for newline.
                  </span>
                  <button
                    type="submit"
                    className="primary"
                    disabled={sendingReply || !replyText.trim()}
                  >
                    {sendingReply ? "Sending…" : "Send Reply"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      </div>

      {/* New Inquiry Modal */}
      {isNewModalOpen && (
        <div className="modal-overlay" onClick={() => setIsNewModalOpen(false)}>
          <div className="modal-card inquiry-new-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Start New Inquiry</h2>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setIsNewModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="stack">
              <label>
                Inquiry Category
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as TicketCategory)}
                >
                  <option value="clinical_terminology">
                    🩺 Clinical Terminology (Ask a Doctor)
                  </option>
                  <option value="review_dispute">
                    ⚖️ Review Dispute (Dispute a rejection)
                  </option>
                  <option value="payout_issue">
                    💰 Payout or Cashout Issue
                  </option>
                  <option value="role_request">
                    ⭐ Role Upgrade Request
                  </option>
                  <option value="general">
                    ℹ️ General Platform Support
                  </option>
                </select>
              </label>

              {/* Dynamic Target Role Notice */}
              <div className="routing-notice-banner">
                <strong>Target Dispatch: </strong>
                This inquiry will be routed directly to{" "}
                <span className="routing-highlight">
                  {CATEGORY_META[newCategory].roleLabel}
                </span>
                .
              </div>

              <label>
                Subject
                <input
                  type="text"
                  required
                  placeholder="Summary of what you need help with"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                />
              </label>

              {(newCategory === "clinical_terminology" || newCategory === "review_dispute") && (
                <label>
                  Related Sentence ID <span className="muted">(Optional)</span>
                  <input
                    type="number"
                    placeholder="e.g. 14"
                    value={newSentenceId}
                    onChange={(e) => setNewSentenceId(e.target.value)}
                  />
                </label>
              )}

              {newCategory === "payout_issue" && (
                <label>
                  Related Payout Reference <span className="muted">(Optional)</span>
                  <input
                    type="text"
                    placeholder="e.g. po-101"
                    value={newPayoutId}
                    onChange={(e) => setNewPayoutId(e.target.value)}
                  />
                </label>
              )}

              <label>
                Message Details
                <textarea
                  required
                  rows={4}
                  placeholder="Explain your question or describe the situation with as much detail as possible…"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
              </label>

              <div className="modal-actions" style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setIsNewModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary"
                  disabled={creatingTicket || !newSubject.trim() || !newMessage.trim()}
                >
                  {creatingTicket ? "Submitting…" : "Send Inquiry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
