import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AdminOverview,
  AdminPayout,
  AdminUser,
  api,
  DatasetExportStats,
  downloadExportCsv,
  patch,
  post,
  Role,
  Settings,
  ugx,
  UserQualityProfile,
  UserSentenceDetail,
} from "../api";
import { useAuth } from "../auth";
import { AiHintTooltip } from "../components/AiHintTooltip";

export default function Admin() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab") as any;
  const initialTab = ["overview", "payouts", "users", "export"].includes(urlTab) ? urlTab : "overview";

  const [tab, setTab] = useState<"overview" | "payouts" | "users" | "export">(initialTab);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [payouts, setPayouts] = useState<AdminPayout[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [exportStats, setExportStats] = useState<DatasetExportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Cross-component user quality & review inspection state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [qualityProfile, setQualityProfile] = useState<UserQualityProfile | null>(null);
  const [loadingQuality, setLoadingQuality] = useState(false);
  const [qualityError, setQualityError] = useState<string | null>(null);

  // Direct review on clicked sentence inside the quality popup
  const [inspectSentence, setInspectSentence] = useState<UserSentenceDetail | null>(null);
  const [directReviewLuganda, setDirectReviewLuganda] = useState("");
  const [directReviewRejecting, setDirectReviewRejecting] = useState(false);
  const [directReviewRejectReason, setDirectReviewRejectReason] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);

  // Sync tab with URL search parameter
  useEffect(() => {
    const t = searchParams.get("tab") as any;
    if (t && ["overview", "payouts", "users", "export"].includes(t) && t !== tab) {
      setTab(t);
    }
  }, [searchParams]);

  const switchTab = (newTab: "overview" | "payouts" | "users" | "export") => {
    setTab(newTab);
    setSearchParams({ tab: newTab });
  };

  const handleInspectUser = async (userId: string) => {
    try {
      setSelectedUserId(userId);
      setInspectSentence(null);
      setDirectReviewRejecting(false);
      setReviewSuccessMsg(null);
      setLoadingQuality(true);
      setQualityError(null);
      const data = await api<UserQualityProfile>(`/admin/users/${userId}/quality`);
      setQualityProfile(data);
    } catch (err: any) {
      setQualityError(err?.message || "Failed to load contributor quality profile.");
    } finally {
      setLoadingQuality(false);
    }
  };

  const handleCloseQualityModal = () => {
    setSelectedUserId(null);
    setQualityProfile(null);
    setQualityError(null);
    setInspectSentence(null);
    setDirectReviewRejecting(false);
    setReviewSuccessMsg(null);
  };

  const handleInspectSentence = (s: UserSentenceDetail) => {
    setInspectSentence(s);
    setDirectReviewLuganda(s.clean_lug);
    setDirectReviewRejecting(false);
    setDirectReviewRejectReason("");
    setReviewSuccessMsg(null);
  };

  const handleBackToSentenceList = () => {
    setInspectSentence(null);
    setDirectReviewRejecting(false);
    setReviewSuccessMsg(null);
  };

  const handleDirectApprove = async () => {
    if (!inspectSentence || !qualityProfile) return;
    try {
      setReviewSubmitting(true);
      setReviewSuccessMsg(null);
      const isEdited = directReviewLuganda.trim() !== inspectSentence.clean_lug.trim();
      if (isEdited) {
        await post(`/review/${inspectSentence.id}/edit`, { clean_lug: directReviewLuganda.trim() });
      } else {
        await post(`/review/${inspectSentence.id}/approve`);
      }

      const updatedList = qualityProfile.recent_sentences.map((s) => {
        if (s.id === inspectSentence.id) {
          return {
            ...s,
            clean_lug: directReviewLuganda.trim(),
            verified: true,
            verified_by_name: user?.full_name || "Admin",
            verified_at: new Date().toISOString(),
          };
        }
        return s;
      });

      const verifiedCount = updatedList.filter((s) => s.verified).length;
      const totalCount = updatedList.length;
      const newAccuracy = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 1000) / 10 : 0;

      setQualityProfile({
        ...qualityProfile,
        recent_sentences: updatedList,
        verified_count: verifiedCount,
        accuracy_rate: newAccuracy,
        pending_review_count: Math.max(0, totalCount - verifiedCount),
      });

      setInspectSentence((prev) =>
        prev
          ? {
              ...prev,
              clean_lug: directReviewLuganda.trim(),
              verified: true,
              verified_by_name: user?.full_name || "Admin",
              verified_at: new Date().toISOString(),
            }
          : null
      );

      // Keep top-level users and payouts in sync
      setUsers((prev) =>
        prev.map((u) => (u.id === qualityProfile.id ? { ...u, verified_count: verifiedCount, accuracy_rate: newAccuracy } : u))
      );
      setPayouts((prev) =>
        prev.map((p) => (p.user_id === qualityProfile.id ? { ...p, verified_count: verifiedCount, accuracy_rate: newAccuracy } : p))
      );

      setReviewSuccessMsg(`Sentence #${inspectSentence.id} approved and clinically verified!`);
    } catch (err: any) {
      alert("Failed to approve sentence: " + (err?.message || "Unknown error"));
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleDirectReject = async () => {
    if (!inspectSentence || !qualityProfile) return;
    try {
      setReviewSubmitting(true);
      await post(`/review/${inspectSentence.id}/reject`, {
        rejection_reason: directReviewRejectReason.trim() || undefined,
      });

      const updatedList = qualityProfile.recent_sentences.filter((s) => s.id !== inspectSentence.id);
      const verifiedCount = updatedList.filter((s) => s.verified).length;
      const totalCount = updatedList.length;
      const newAccuracy = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 1000) / 10 : 0;

      setQualityProfile({
        ...qualityProfile,
        recent_sentences: updatedList,
        verified_count: verifiedCount,
        accuracy_rate: newAccuracy,
        pending_review_count: Math.max(0, totalCount - verifiedCount),
      });

      setInspectSentence(null);
      setDirectReviewRejecting(false);
      setDirectReviewRejectReason("");
      setReviewSuccessMsg(`Sentence #${inspectSentence.id} rejected and returned to queue.`);

      setUsers((prev) =>
        prev.map((u) => (u.id === qualityProfile.id ? { ...u, verified_count: verifiedCount, accuracy_rate: newAccuracy } : u))
      );
      setPayouts((prev) =>
        prev.map((p) => (p.user_id === qualityProfile.id ? { ...p, verified_count: verifiedCount, accuracy_rate: newAccuracy } : p))
      );
    } catch (err: any) {
      alert("Failed to reject sentence: " + (err?.message || "Unknown error"));
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Budget configuration form state
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetCapInput, setBudgetCapInput] = useState<string>("");
  const [rateInput, setRateInput] = useState<string>("");
  const [minCashoutInput, setMinCashoutInput] = useState<string>("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Payout actions dialog state
  const [payoutFilter, setPayoutFilter] = useState<"all" | "pending" | "paid" | "rejected">("pending");
  const [activePayoutAction, setActivePayoutAction] = useState<{ id: string; action: "pay" | "reject" } | null>(null);
  const [actionInput, setActionInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // User management search state
  const [userSearch, setUserSearch] = useState("");
  const [userUpdatingId, setUserUpdatingId] = useState<string | null>(null);

  // Dataset export form state
  const [exportScope, setExportScope] = useState<"verified_only" | "all_validated">("verified_only");
  const [exportOnlyNew, setExportOnlyNew] = useState(true);
  const [exportMarkExported, setExportMarkExported] = useState(true);
  const [downloadingExport, setDownloadingExport] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);

      setError(null);
      const [ov, st, po, us, es] = await Promise.all([
        api<AdminOverview>("/admin/overview"),
        api<Settings>("/admin/settings"),
        api<AdminPayout[]>("/admin/payouts"),
        api<AdminUser[]>("/admin/users"),
        api<DatasetExportStats>("/admin/export/stats").catch(() => null),
      ]);
      setOverview(ov);
      setSettings(st);
      setPayouts(po);
      setUsers(us);
      if (es) setExportStats(es);

      setBudgetCapInput(st.max_budget_ugx !== null ? String(st.max_budget_ugx) : "");
      setRateInput(String(st.rate_ugx));
      setMinCashoutInput(String(st.min_cashout_ugx));
    } catch (err: any) {
      setError(err?.message || "Failed to load admin dashboard data.");

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      setError(null);
      setSuccess(null);

      const parsedCap = budgetCapInput.trim() === "" ? null : parseInt(budgetCapInput, 10);
      const parsedRate = parseInt(rateInput, 10);
      const parsedMinCashout = parseInt(minCashoutInput, 10);

      if (parsedCap !== null && (isNaN(parsedCap) || parsedCap < 0)) {
        setError("Please enter a valid budget cap or leave blank for unlimited.");
        return;
      }
      if (isNaN(parsedRate) || parsedRate <= 0) {
        setError("Translation rate must be greater than zero.");
        return;
      }
      if (isNaN(parsedMinCashout) || parsedMinCashout <= 0) {
        setError("Minimum cashout must be greater than zero.");
        return;
      }

      const updated = await patch<Settings>("/admin/settings", {
        max_budget_ugx: parsedCap,
        rate_ugx: parsedRate,
        min_cashout_ugx: parsedMinCashout,
      });

      setSettings(updated);
      setEditingBudget(false);
      setSuccess("Project budget configuration saved successfully.");
      // Refresh overview with new numbers
      const ov = await api<AdminOverview>("/admin/overview");
      setOverview(ov);
    } catch (err: any) {
      setError(err?.message || "Failed to update budget settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleMarkPaid = async (payoutId: string) => {
    if (!actionInput.trim()) {
      setError("Please provide the mobile money transaction reference.");
      return;
    }
    try {
      setActionLoading(true);
      setError(null);
      const updated = await post<AdminPayout>(`/admin/payouts/${payoutId}/mark-paid`, {
        provider_reference: actionInput.trim(),
      });
      setPayouts((prev) => prev.map((p) => (p.id === payoutId ? updated : p)));
      setActivePayoutAction(null);
      setActionInput("");
      setSuccess("Payout marked as paid with transaction reference.");
      // Refresh overview
      const ov = await api<AdminOverview>("/admin/overview");
      setOverview(ov);
    } catch (err: any) {
      setError(err?.message || "Failed to mark payout as paid.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPayout = async (payoutId: string) => {
    if (!actionInput.trim()) {
      setError("Please provide a reason for rejecting the payout.");
      return;
    }
    try {
      setActionLoading(true);
      setError(null);
      const updated = await post<AdminPayout>(`/admin/payouts/${payoutId}/reject`, {
        reason: actionInput.trim(),
      });
      setPayouts((prev) => prev.map((p) => (p.id === payoutId ? updated : p)));
      setActivePayoutAction(null);
      setActionInput("");
      setSuccess("Payout rejected and funds returned to validator balance.");
      const ov = await api<AdminOverview>("/admin/overview");
      setOverview(ov);
    } catch (err: any) {
      setError(err?.message || "Failed to reject payout.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: Role) => {
    try {
      setUserUpdatingId(userId);
      setError(null);
      const updated = await patch<AdminUser>(`/admin/users/${userId}`, { role: newRole });
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      setSuccess(`User role updated to ${newRole}.`);
      const ov = await api<AdminOverview>("/admin/overview");
      setOverview(ov);
    } catch (err: any) {
      setError(err?.message || "Failed to update user role.");
    } finally {
      setUserUpdatingId(null);
    }
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      setUserUpdatingId(userId);
      setError(null);
      const updated = await patch<AdminUser>(`/admin/users/${userId}`, { is_active: !currentActive });
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      setSuccess(`User account ${!currentActive ? "reactivated" : "deactivated"}.`);
    } catch (err: any) {
      setError(err?.message || "Failed to toggle user active status.");
    } finally {
      setUserUpdatingId(null);
    }
  };

  const handleDownloadDataset = async () => {
    try {
      setDownloadingExport(true);
      setError(null);
      setSuccess(null);
      const res = await downloadExportCsv(exportScope, exportOnlyNew, exportMarkExported);
      setSuccess(`Dataset CSV successfully downloaded (${res.filename}).`);
      const es = await api<DatasetExportStats>("/admin/export/stats").catch(() => null);
      if (es) setExportStats(es);
    } catch (err: any) {
      setError(err?.message || "Failed to download dataset export.");
    } finally {
      setDownloadingExport(false);
    }
  };

  const filteredPayouts = payouts.filter((p) => {

    if (payoutFilter === "all") return true;
    return p.status === payoutFilter;
  });

  const pendingPayoutCount = payouts.filter((p) => p.status === "pending").length;

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.includes(q);
  });

  if (loading && !overview) {
    return <p className="center muted">Loading executive administration control center…</p>;
  }

  const budgetSpent = overview?.total_earned_ugx ?? 0;
  const budgetCap = overview?.max_budget_ugx ?? null;
  const budgetRemaining = overview?.remaining_budget_ugx ?? null;
  const budgetSpentPct = budgetCap ? Math.min(100, Math.round((budgetSpent / budgetCap) * 100)) : null;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>Administration & Oversight</h1>
          <p className="hint">Total project budget management, payout authorizations, and user role allocations.</p>
        </div>
        <button className="ghost" onClick={loadData} disabled={loading}>
          {loading ? "Refreshing…" : "↻ Refresh Data"}
        </button>
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

      {/* Budget Exhaustion Warning Banner */}
      {overview?.is_budget_exhausted && (
        <div className="budget-alert-banner">
          <strong>⚠️ Project Budget Cap Reached:</strong> Total translation payouts and claims ({ugx(budgetSpent)})
          have reached the project limit ({ugx(budgetCap!)}). Sentence validations are automatically paused until the
          budget is increased.
        </div>
      )}

      {/* Total Project Budget Card */}
      <section className="card budget-control-card">
        <div className="row" style={{ alignItems: "flex-start" }}>
          <div>
            <h2>Project Budget & Financial Pool</h2>
            <p className="hint">Configure the maximum allocation for the crowdsourced Luganda medical translation campaign.</p>
          </div>
          <button className="ghost" onClick={() => setEditingBudget(!editingBudget)}>
            {editingBudget ? "Close Budget Editor" : "⚙ Set / Adjust Budget"}
          </button>
        </div>

        <div className="budget-metrics-grid">
          <div className="metric-box">
            <span className="metric-label">Total Budget Cap</span>
            <span className="metric-value">{budgetCap !== null ? ugx(budgetCap) : "Unlimited (No Cap)"}</span>
          </div>
          <div className="metric-box">
            <span className="metric-label">Total Spent / Earned</span>
            <span className="metric-value">{ugx(budgetSpent)}</span>
          </div>
          <div className="metric-box">
            <span className="metric-label">Remaining Funds</span>
            <span className={`metric-value ${overview?.is_budget_exhausted ? "danger-text" : "safe-text"}`}>
              {budgetRemaining !== null ? ugx(budgetRemaining) : "Unlimited"}
            </span>
          </div>
          <div className="metric-box">
            <span className="metric-label">Pending Payouts</span>
            <span className="metric-value warning-text">{ugx(overview?.pending_payouts_ugx ?? 0)}</span>
          </div>
        </div>

        {budgetCap !== null && budgetSpentPct !== null && (
          <div className="budget-progress-container">
            <div className="row hint" style={{ marginBottom: "0.25rem" }}>
              <span>Budget utilization: {budgetSpentPct}%</span>
              <span>{ugx(budgetSpent)} of {ugx(budgetCap)}</span>
            </div>
            <div className="progress-bar-bg">
              <div
                className={`progress-bar-fill ${budgetSpentPct >= 95 ? "danger" : budgetSpentPct >= 80 ? "warning" : "forest"}`}
                style={{ width: `${budgetSpentPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Budget Editor Panel */}
        {editingBudget && (
          <form className="budget-edit-form" onSubmit={handleSaveBudget}>
            <h3>Set Project Budget & Translation Parameters</h3>
            <div className="budget-inputs-row">
              <label>
                Maximum Project Budget (UGX)
                <input
                  type="number"
                  min="0"
                  step="50000"
                  placeholder="e.g. 10000000 (leave blank for unlimited)"
                  value={budgetCapInput}
                  onChange={(e) => setBudgetCapInput(e.target.value)}
                />
                <span className="hint">Leave empty for unlimited budget. Once reached, validations halt.</span>
              </label>

              <label>
                Base Rate (UGX per cost unit)
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  required
                />
                <span className="hint">Current formula: reward = max(100, cost * rate).</span>
              </label>

              <label>
                Minimum Cashout (UGX)
                <input
                  type="number"
                  min="500"
                  step="500"
                  value={minCashoutInput}
                  onChange={(e) => setMinCashoutInput(e.target.value)}
                  required
                />
                <span className="hint">Minimum balance required for a validator to request mobile money.</span>
              </label>
            </div>

            <div className="actions" style={{ marginTop: "1rem" }}>
              <button type="submit" className="primary" disabled={savingSettings}>
                {savingSettings ? "Saving Settings…" : "Save Budget Configuration"}
              </button>
              <button type="button" className="ghost" onClick={() => setEditingBudget(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Navigation Tabs */}
      <div className="admin-tabs">
        <button
          className={`tab-btn ${tab === "overview" ? "active" : ""}`}
          onClick={() => switchTab("overview")}
        >
          📊 Campaign Overview
        </button>
        <button
          className={`tab-btn ${tab === "payouts" ? "active" : ""}`}
          onClick={() => switchTab("payouts")}
        >
          💸 Payout Requests
          {pendingPayoutCount > 0 && <span className="counter-badge">{pendingPayoutCount}</span>}
        </button>
        <button
          className={`tab-btn ${tab === "users" ? "active" : ""}`}
          onClick={() => switchTab("users")}
        >
          👥 User Roles & Access ({users.length})
        </button>
        <button
          className={`tab-btn ${tab === "export" ? "active" : ""}`}
          onClick={() => switchTab("export")}
        >
          📥 Dataset Export
          {exportStats && exportStats.unexported_verified > 0 && (
            <span className="counter-badge">{exportStats.unexported_verified} new</span>
          )}
        </button>
      </div>

      {/* TAB 1: EXECUTIVE CAMPAIGN OVERVIEW */}
      {tab === "overview" && overview && (
        <div className="tab-pane">
          <div className="overview-kpi-grid">
            <div className="card kpi-card">
              <h2>Sentences Validated</h2>
              <p className="kpi-number">{overview.validated_sentences} / {overview.total_sentences}</p>
              <div className="progress-bar-bg" style={{ margin: "0.5rem 0" }}>
                <div className="progress-bar-fill forest" style={{ width: `${overview.completion_percentage}%` }} />
              </div>
              <p className="hint">{overview.completion_percentage}% of clinical dataset translated</p>
            </div>

            <div className="card kpi-card">
              <h2>Clinically Verified</h2>
              <p className="kpi-number">{overview.verified_sentences} / {overview.total_sentences}</p>
              <div className="progress-bar-bg" style={{ margin: "0.5rem 0" }}>
                <div className="progress-bar-fill gold" style={{ width: `${overview.verified_percentage}%` }} />
              </div>
              <p className="hint">{overview.verified_percentage}% reviewed & verified by medical experts</p>
            </div>

            <div className="card kpi-card">
              <h2>Awaiting Clinical Review</h2>
              <p className="kpi-number">{overview.validated_sentences - overview.verified_sentences}</p>
              <p className="hint">Validated sentences waiting in reviewer queue</p>
            </div>

            <div className="card kpi-card">
              <h2>Community Team</h2>
              <div className="roles-breakdown">
                <div><span className="role-tag validator">Validators</span> <strong>{overview.validators_count}</strong></div>
                <div><span className="role-tag reviewer">Reviewers</span> <strong>{overview.reviewers_count}</strong></div>
                <div><span className="role-tag admin">Admins</span> <strong>{overview.admins_count}</strong></div>
              </div>
              <p className="hint" style={{ marginTop: "0.5rem" }}>Total accounts: {overview.total_users}</p>
            </div>
          </div>

          {/* Quality & Review Oversight in Campaign Overview */}
          <div className="card" style={{ marginTop: "1.5rem" }}>
            <div className="row" style={{ alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h2 style={{ margin: 0 }}>Contributor Quality &amp; Review Oversight</h2>
                <p className="hint">Audit translation accuracy and jump directly into reviewing contributor submissions.</p>
              </div>
              <Link to="/review" className="primary-btn small-btn" style={{ textDecoration: "none" }}>
                🩺 Open Review Station →
              </Link>
            </div>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Contributor</th>
                    <th>Role</th>
                    <th>Validated</th>
                    <th>Clinical Accuracy</th>
                    <th>Earned</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0, 5).map((u) => (
                    <tr key={u.id} className="clickable-row" onClick={() => handleInspectUser(u.id)}>
                      <td>
                        <button
                          className="link-style-btn"
                          onClick={(e) => { e.stopPropagation(); handleInspectUser(u.id); }}
                          title="Click to view detailed translation reviews and accuracy breakdown"
                        >
                          <strong>{u.full_name}</strong> ↗
                        </button>
                        <div className="hint">{u.email}</div>
                      </td>
                      <td><span className={`role-tag ${u.role}`}>{u.role}</span></td>
                      <td>{u.validated_count}</td>
                      <td>
                        <strong>{u.accuracy_rate ?? 0}%</strong>
                        <span className="hint" style={{ marginLeft: "0.35rem" }}>({u.verified_count ?? 0} verified)</span>
                      </td>
                      <td><strong>{ugx(u.total_earned_ugx)}</strong></td>
                      <td>
                        <button
                          className="small-btn ghost-btn"
                          onClick={(e) => { e.stopPropagation(); handleInspectUser(u.id); }}
                          title="View submitted translations and audit quality"
                        >
                          Audit Quality ↗
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* TAB 2: MOBILE MONEY PAYOUT REQUESTS */}
      {tab === "payouts" && (
        <div className="tab-pane">
          <div className="payout-filters-row">
            <div className="filter-group">
              <button
                className={`sub-tab-btn ${payoutFilter === "pending" ? "active" : ""}`}
                onClick={() => setPayoutFilter("pending")}
              >
                Pending ({payouts.filter((p) => p.status === "pending").length})
              </button>
              <button
                className={`sub-tab-btn ${payoutFilter === "paid" ? "active" : ""}`}
                onClick={() => setPayoutFilter("paid")}
              >
                Paid ({payouts.filter((p) => p.status === "paid").length})
              </button>
              <button
                className={`sub-tab-btn ${payoutFilter === "rejected" ? "active" : ""}`}
                onClick={() => setPayoutFilter("rejected")}
              >
                Rejected ({payouts.filter((p) => p.status === "rejected").length})
              </button>
              <button
                className={`sub-tab-btn ${payoutFilter === "all" ? "active" : ""}`}
                onClick={() => setPayoutFilter("all")}
              >
                All ({payouts.length})
              </button>
            </div>
          </div>

          {filteredPayouts.length === 0 ? (
            <div className="card center">
              <p className="muted">No payout requests in the "{payoutFilter}" queue.</p>
            </div>
          ) : (
            <div className="card table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Requested</th>
                    <th>Validator</th>
                    <th>Amount</th>
                    <th>Payment Account</th>
                    <th>Sentences</th>
                    <th>Status</th>
                    <th>Actions / Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayouts.map((p) => (
                    <tr key={p.id}>
                      <td className="hint">{new Date(p.requested_at).toLocaleDateString()} {new Date(p.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>
                        <button
                          className="link-style-btn"
                          onClick={() => handleInspectUser(p.user_id)}
                          title="Click to view detailed translation reviews and accuracy breakdown"
                        >
                          <strong>{p.user_name}</strong> ↗
                        </button>
                        <div className="hint">{p.user_email}</div>
                        {p.accuracy_rate !== undefined && (
                          <div style={{ marginTop: "0.2rem" }}>
                            <button
                              type="button"
                              className="accuracy-mini-pill-btn"
                              onClick={() => handleInspectUser(p.user_id)}
                              title="Click to view detailed translation reviews and accuracy breakdown"
                            >
                              <span className={`accuracy-mini-pill ${(p.accuracy_rate ?? 0) >= 80 ? "high" : "med"}`}>
                                {p.accuracy_rate}% accuracy ({p.verified_count ?? 0}/{p.sentence_count} verified) ↗
                              </span>
                            </button>
                          </div>
                        )}
                      </td>
                      <td><strong>{ugx(p.amount_ugx)}</strong></td>
                      <td>
                        <span className={`provider-badge ${p.provider}`}>{p.provider.toUpperCase()}</span>
                        <div>{p.phone_number}</div>
                        <div className="hint">{p.account_name}</div>
                      </td>
                      <td>
                        <strong>{p.sentence_count}</strong>
                        <div className="hint">{Math.max(0, p.sentence_count - (p.verified_count ?? 0))} pending QA</div>
                      </td>
                      <td>
                        <span className={`tag ${p.status}`}>{p.status}</span>
                      </td>
                      <td>
                        {p.status === "pending" ? (
                          <div className="action-buttons-cell">
                            {activePayoutAction?.id === p.id ? (
                              <div className="inline-action-modal">
                                <div>
                                  <strong>{activePayoutAction.action === "pay" ? "Confirm Mobile Money Payment" : "Reject Payout"}</strong>
                                  <input
                                    type="text"
                                    placeholder={activePayoutAction.action === "pay" ? "e.g. MTN MOMO Tx Ref (MOM-84291)" : "Reason for rejection (e.g. Account name mismatch)"}
                                    value={actionInput}
                                    onChange={(e) => setActionInput(e.target.value)}
                                    autoFocus
                                  />
                                </div>
                                <div className="actions" style={{ marginTop: "0.4rem" }}>
                                  <button
                                    className={activePayoutAction.action === "pay" ? "primary" : "reject-btn"}
                                    onClick={() => activePayoutAction.action === "pay" ? handleMarkPaid(p.id) : handleRejectPayout(p.id)}
                                    disabled={actionLoading}
                                  >
                                    {actionLoading ? "Processing…" : activePayoutAction.action === "pay" ? "Confirm Paid" : "Confirm Reject"}
                                  </button>
                                  <button className="ghost" onClick={() => { setActivePayoutAction(null); setActionInput(""); }}>
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="actions" style={{ marginTop: 0 }}>
                                <button
                                  className="small-btn primary-btn"
                                  onClick={() => { setActivePayoutAction({ id: p.id, action: "pay" }); setActionInput(""); }}
                                >
                                  ✓ Mark Paid
                                </button>
                                <button
                                  className="small-btn danger-btn"
                                  onClick={() => { setActivePayoutAction({ id: p.id, action: "reject" }); setActionInput(""); }}
                                >
                                  ✕ Reject
                                </button>
                              </div>
                            )}
                          </div>
                        ) : p.status === "paid" ? (
                          <div>
                            <div className="hint">
                              <strong>Tx:</strong> {p.provider_reference || "N/A"}
                              {p.processed_at && <div>{new Date(p.processed_at).toLocaleDateString()}</div>}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="hint danger-text">
                              <strong>Reason:</strong> {p.rejection_reason || "Unspecified"}
                            </div>
                            <button
                              className="link-style-btn hint"
                              style={{ marginTop: "0.35rem", fontSize: "0.82rem" }}
                              onClick={() => handleInspectUser(p.user_id)}
                            >
                              📊 View Quality Profile
                            </button>
                          </div>
                        )}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: USER ROLES & ACCESS MANAGEMENT */}
      {tab === "users" && (
        <div className="tab-pane">
          <div className="user-search-row">
            <input
              type="text"
              placeholder="Search users by name, email, or role…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="card table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Contributor</th>
                  <th>System Role</th>
                  <th>Clinical Accuracy</th>
                  <th>Validated</th>
                  <th>Total Earned</th>
                  <th>Paid Out</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className={!u.is_active ? "row-deactivated" : ""}>
                    <td>
                      <button
                        className="link-style-btn"
                        onClick={() => handleInspectUser(u.id)}
                        title="Click to view detailed quality profile and submitted translations"
                      >
                        <strong>{u.full_name}</strong> ↗
                      </button>
                      <div className="hint">{u.email}</div>
                    </td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                        disabled={userUpdatingId === u.id}
                        className={`role-select role-${u.role}`}
                      >
                        <option value="validator">Validator (Translations)</option>
                        <option value="reviewer">Reviewer (Clinical QA)</option>
                        <option value="admin">Admin (Total Oversight)</option>
                      </select>
                    </td>
                    <td>
                      <strong>{u.accuracy_rate ?? 0}%</strong>
                      <div className="hint">{u.verified_count ?? 0} of {u.validated_count} verified</div>
                    </td>
                    <td>{u.validated_count}</td>
                    <td><strong>{ugx(u.total_earned_ugx)}</strong></td>
                    <td>{ugx(u.paid_out_ugx)}</td>
                    <td>
                      <button
                        className={`small-btn ${u.is_active ? "ghost-danger-btn" : "activate-btn"}`}
                        onClick={() => handleToggleActive(u.id, u.is_active)}
                        disabled={userUpdatingId === u.id}
                      >
                        {u.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                    <td>
                      <button
                        className="small-btn ghost-btn"
                        onClick={() => handleInspectUser(u.id)}
                        title="View accuracy profile & submitted translations"
                      >
                        Audit Quality ↗
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

          </div>
        </div>
      )}

      {/* TAB 4: DATASET EXTRACTION & CSV EXPORT */}
      {tab === "export" && (
        <div className="tab-pane">
          <div className="overview-kpi-grid">
            <div className="card kpi-card">
              <h2>New Verified for AI Training</h2>
              <p className="kpi-number" style={{ color: "var(--color-primary, #1e5a43)" }}>
                {exportStats?.unexported_verified ?? 0}
              </p>
              <p className="hint">Verified sentences ready for export (not yet extracted)</p>
            </div>

            <div className="card kpi-card">
              <h2>Total Verified Corpus</h2>
              <p className="kpi-number">{exportStats?.total_verified ?? 0}</p>
              <p className="hint">Passed second-pass clinical review</p>
            </div>

            <div className="card kpi-card">
              <h2>Total Validated Corpus</h2>
              <p className="kpi-number">{exportStats?.total_validated ?? 0}</p>
              <p className="hint">All sentences translated by contributors</p>
            </div>

            <div className="card kpi-card">
              <h2>Last Dataset Export</h2>
              <p className="kpi-number" style={{ fontSize: "1.1rem", marginTop: "0.5rem" }}>
                {exportStats?.last_export_at ? new Date(exportStats.last_export_at).toLocaleDateString() : "Never"}
              </p>
              <p className="hint">
                {exportStats?.last_export_at ? new Date(exportStats.last_export_at).toLocaleTimeString() : "No prior exports"}
              </p>
            </div>
          </div>

          <div className="card export-configuration-card" style={{ marginTop: "1.5rem" }}>
            <div className="export-card-header">
              <div>
                <h2>Extract Dataset for Hospital AI Training (CSV)</h2>
                <p className="hint">
                  Download bilingual clinical dialogues (English &amp; Luganda) formatted for fine-tuning offline hospital AI models.
                </p>
              </div>
            </div>

            <div className="export-form-section" style={{ marginTop: "1.25rem" }}>
              <div className="export-section-title">1. Quality Scope</div>
              <div className="export-radio-group">
                <label className={`export-radio-card ${exportScope === "verified_only" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="exportScope"
                    value="verified_only"
                    checked={exportScope === "verified_only"}
                    onChange={() => setExportScope("verified_only")}
                  />
                  <div className="radio-content">
                    <strong>Verified Translations Only (Recommended for AI Training)</strong>
                    <span className="hint">
                      Includes only translations reviewed and certified by qualified medical/linguistic reviewers.
                    </span>
                  </div>
                </label>

                <label className={`export-radio-card ${exportScope === "all_validated" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="exportScope"
                    value="all_validated"
                    checked={exportScope === "all_validated"}
                    onChange={() => setExportScope("all_validated")}
                  />
                  <div className="radio-content">
                    <strong>All Validated Translations</strong>
                    <span className="hint">
                      Includes all submitted translations, including those currently pending clinical QA review.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="export-form-section" style={{ marginTop: "1.5rem" }}>
              <div className="export-section-title">2. Export Options &amp; State Tracking</div>
              <div className="export-checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={exportOnlyNew}
                    onChange={(e) => setExportOnlyNew(e.target.checked)}
                  />
                  <div>
                    <strong>Export only new sentences since last export</strong>
                    <div className="hint">
                      Prevents duplicate training pairs across model iterations by selecting only sentences without a prior export timestamp.
                    </div>
                  </div>
                </label>

                <label className="checkbox-label" style={{ marginTop: "0.75rem" }}>
                  <input
                    type="checkbox"
                    checked={exportMarkExported}
                    onChange={(e) => setExportMarkExported(e.target.checked)}
                  />
                  <div>
                    <strong>Mark extracted sentences as exported</strong>
                    <div className="hint">
                      Updates the sentence record timestamp so subsequent "new only" exports will only extract future translations.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="export-action-bar" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border, #e5e7eb)" }}>
              <button
                type="button"
                className="primary-btn"
                style={{ padding: "0.75rem 1.75rem", fontSize: "1rem" }}
                onClick={handleDownloadDataset}
                disabled={downloadingExport}
              >
                {downloadingExport ? "Generating CSV Stream…" : "⬇️ Download CSV Dataset"}
              </button>
              <span className="hint" style={{ marginLeft: "1rem" }}>
                Target: <strong>{exportScope === "verified_only" ? (exportOnlyNew ? (exportStats?.unexported_verified ?? 0) : (exportStats?.total_verified ?? 0)) : (exportOnlyNew ? (exportStats?.unexported_validated ?? 0) : (exportStats?.total_validated ?? 0))} sentences</strong> ready for extraction.
              </span>
            </div>
          </div>

          {/* Past Exports Audit History */}
          <div className="card table-container" style={{ marginTop: "1.5rem" }}>
            <h2 style={{ padding: "1rem 1rem 0.5rem" }}>Dataset Export History</h2>
            {exportStats?.recent_exports && exportStats.recent_exports.length > 0 ? (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date &amp; Time</th>
                    <th>Exported By</th>
                    <th>Sentence Count</th>
                    <th>Scope</th>
                    <th>Filter</th>
                    <th>File Name</th>
                  </tr>
                </thead>
                <tbody>
                  {exportStats.recent_exports.map((exp) => (
                    <tr key={exp.id}>
                      <td className="hint">{new Date(exp.created_at).toLocaleString()}</td>
                      <td><strong>{exp.exported_by_name}</strong></td>
                      <td><strong>{exp.sentence_count.toLocaleString()}</strong></td>
                      <td>
                        <span className={`status-pill ${exp.scope === "verified_only" ? "status-paid" : "status-pending"}`}>
                          {exp.scope === "verified_only" ? "Verified QA Only" : "All Validated"}
                        </span>
                      </td>
                      <td className="hint">{exp.only_new ? "New Delta Only" : "Full Cumulative"}</td>
                      <td className="mono" style={{ fontSize: "0.85rem" }}>{exp.file_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="hint center" style={{ padding: "1.5rem" }}>
                No past dataset exports recorded yet. When you download a dataset, an audit log will be retained here.
              </p>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CONTRIBUTOR QUALITY & TRANSLATION REVIEWS DRILLDOWN */}
      {selectedUserId && (
        <div className="modal-backdrop">
          <div className="modal-dialog quality-profile-modal">
            <div className="modal-header">
              <div>
                <h2>Contributor Quality &amp; Translation Oversight</h2>
                <p className="hint">Audit translation accuracy and verify clinical quality directly.</p>
              </div>
              <button className="ghost close-modal-btn" onClick={handleCloseQualityModal} title="Close window" aria-label="Close modal">✕</button>
            </div>

            {loadingQuality && <p className="center muted">Loading contributor review profile…</p>}
            {qualityError && <p className="error center">{qualityError}</p>}

            {qualityProfile && (
              <div className="modal-body">
                {inspectSentence ? (
                  /* DIRECT REVIEW VIEW FOR SELECTED TRANSLATION */
                  <div className="modal-direct-review-view">
                    <div className="direct-review-header-bar">
                      <button type="button" className="link back-to-list-btn" onClick={handleBackToSentenceList}>
                        ← Back to all submissions ({qualityProfile.full_name})
                      </button>
                      {qualityProfile.recent_sentences.length > 1 && (
                        <div className="sentence-stepper">
                          <span className="hint">
                            Sentence {qualityProfile.recent_sentences.findIndex((x) => x.id === inspectSentence.id) + 1} of {qualityProfile.recent_sentences.length}
                          </span>
                          <div className="stepper-buttons">
                            <button
                              type="button"
                              className="small-btn ghost-btn"
                              onClick={() => {
                                const currIdx = qualityProfile.recent_sentences.findIndex((x) => x.id === inspectSentence.id);
                                const prevIdx = currIdx > 0 ? currIdx - 1 : qualityProfile.recent_sentences.length - 1;
                                handleInspectSentence(qualityProfile.recent_sentences[prevIdx]);
                              }}
                            >
                              ← Prev
                            </button>
                            <button
                              type="button"
                              className="small-btn ghost-btn"
                              onClick={() => {
                                const currIdx = qualityProfile.recent_sentences.findIndex((x) => x.id === inspectSentence.id);
                                const nextIdx = (currIdx + 1) % qualityProfile.recent_sentences.length;
                                handleInspectSentence(qualityProfile.recent_sentences[nextIdx]);
                              }}
                            >
                              Next →
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {reviewSuccessMsg && (
                      <div className="notice-banner ok" style={{ margin: "0.75rem 0", padding: "0.75rem 1rem", background: "#dcfce7", color: "#166534", borderRadius: "6px" }}>
                        ✓ {reviewSuccessMsg}
                      </div>
                    )}

                    <div className="review-meta-bar" style={{ marginTop: "0.75rem" }}>
                      <div className="row" style={{ gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                        <span className="sentence-id-tag">Sentence #{inspectSentence.id}</span>
                        <span className={`tag ${inspectSentence.difficulty}`}>{inspectSentence.difficulty}</span>
                        <span className="reward-tag">{ugx(inspectSentence.reward_ugx)}</span>
                        {inspectSentence.verified ? (
                          <span className="status-pill status-paid">
                            ✓ Verified {inspectSentence.verified_by_name ? `by ${inspectSentence.verified_by_name}` : ""}
                          </span>
                        ) : (
                          <span className="status-pill status-pending">⏳ Awaiting Clinical QA</span>
                        )}
                      </div>
                      <div className="hint" style={{ marginTop: "0.35rem" }}>
                        Submitted: {new Date(inspectSentence.validated_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="review-box source-box" style={{ marginTop: "1rem" }}>
                      <label className="box-label">Original English Clinical Prompt</label>
                      <blockquote className="sentence-display english-text">
                        {inspectSentence.noisy_english}
                      </blockquote>
                    </div>

                    <div className="review-box edit-box" style={{ marginTop: "1rem" }}>
                      <div className="row" style={{ marginBottom: "0.4rem", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                        <div className="row" style={{ gap: "0.5rem", alignItems: "center" }}>
                          <label className="box-label">
                            Validator's Luganda Translation (Editable for clinical refinement)
                          </label>
                          {directReviewLuganda.trim() !== inspectSentence.clean_lug.trim() && (
                            <span className="tag medium">Modified by reviewer</span>
                          )}
                        </div>
                        {inspectSentence.attempted && (
                          <AiHintTooltip
                            text={inspectSentence.attempted}
                            label="AI Hint"
                          />
                        )}
                      </div>
                      <textarea
                        rows={3}
                        value={directReviewLuganda}
                        onChange={(e) => setDirectReviewLuganda(e.target.value)}
                        placeholder="Correct medical terminology or phrasing if necessary…"
                      />
                      <span className="hint">
                        Ensure medical terms (e.g. puleesa, asthma, sukaali, okuziyira, omusaayi) are culturally and clinically accurate.
                      </span>
                    </div>

                    {directReviewRejecting ? (
                      <div className="rejection-box" style={{ marginTop: "1rem" }}>
                        <h4>Reject and Return Sentence to Validator Pool</h4>
                        <p className="hint">
                          Rejecting removes this unverified translation and returns the sentence to the queue for other validators.
                        </p>
                        <input
                          type="text"
                          placeholder="Reason for rejection (e.g. Inaccurate clinical translation of chest pain)"
                          value={directReviewRejectReason}
                          onChange={(e) => setDirectReviewRejectReason(e.target.value)}
                          autoFocus
                        />
                        <div className="actions" style={{ marginTop: "0.5rem" }}>
                          <button
                            type="button"
                            className="reject-btn"
                            onClick={handleDirectReject}
                            disabled={reviewSubmitting}
                          >
                            {reviewSubmitting ? "Rejecting…" : "Confirm Rejection"}
                          </button>
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => setDirectReviewRejecting(false)}
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
                          onClick={handleDirectApprove}
                          disabled={reviewSubmitting || !directReviewLuganda.trim()}
                        >
                          {reviewSubmitting
                            ? "Saving…"
                            : directReviewLuganda.trim() !== inspectSentence.clean_lug.trim()
                            ? "✓ Save Edit & Mark Verified"
                            : "✓ Approve as Verified"}
                        </button>

                        <button
                          type="button"
                          className="ghost reject-trigger-btn"
                          onClick={() => setDirectReviewRejecting(true)}
                          disabled={reviewSubmitting}
                        >
                          ✕ Reject Translation
                        </button>

                        <button
                          type="button"
                          className="ghost"
                          onClick={handleBackToSentenceList}
                          style={{ marginLeft: "auto" }}
                        >
                          ← Back to Submissions
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* CONTRIBUTOR QUALITY OVERVIEW & SUBMISSIONS LIST */
                  <div>
                    {/* Contributor Profile Header */}
                    <div className="quality-user-meta">
                      <div>
                        <h3>{qualityProfile.full_name}</h3>
                        <p className="hint">{qualityProfile.email} • Joined {new Date(qualityProfile.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="user-meta-tags">
                        <span className={`role-tag ${qualityProfile.role}`}>{qualityProfile.role}</span>
                        <span className={`status-pill ${qualityProfile.is_active ? "status-paid" : "status-pending"}`}>
                          {qualityProfile.is_active ? "Active Account" : "Deactivated"}
                        </span>
                      </div>
                    </div>

                    {/* Accuracy & Quality KPI Grid */}
                    <div className="quality-kpi-grid">
                      <div className="quality-kpi-card">
                        <span className="quality-kpi-label">Clinical Accuracy</span>
                        <span className={`quality-kpi-val ${qualityProfile.accuracy_rate >= 80 ? "val-high" : "val-med"}`}>
                          {qualityProfile.accuracy_rate}%
                        </span>
                        <span className="hint">{qualityProfile.verified_count} of {qualityProfile.validated_count} verified</span>
                      </div>
                      <div className="quality-kpi-card">
                        <span className="quality-kpi-label">Awaiting QA</span>
                        <span className="quality-kpi-val val-warn">{qualityProfile.pending_review_count}</span>
                        <span className="hint">In clinical review queue</span>
                      </div>
                      <div className="quality-kpi-card">
                        <span className="quality-kpi-label">Total Earned</span>
                        <span className="quality-kpi-val">{ugx(qualityProfile.total_earned_ugx)}</span>
                        <span className="hint">Paid: {ugx(qualityProfile.paid_out_ugx)}</span>
                      </div>
                    </div>

                    {/* Instruction notice */}
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "0.6rem 0.85rem", fontSize: "0.85rem", color: "#475569", margin: "1rem 0" }}>
                      💡 <strong>Click any translation row below</strong> to inspect its clinical comparison or perform direct review, edit, or approval.
                    </div>

                    {/* Submitted Sentences List */}
                    <div className="quality-sentences-section" style={{ marginTop: "1rem" }}>
                      <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>
                        Submitted Translations ({qualityProfile.recent_sentences.length})
                      </h4>
                      {qualityProfile.recent_sentences.length === 0 ? (
                        <p className="hint center muted" style={{ padding: "1.5rem" }}>
                          No translations recorded for this contributor yet.
                        </p>
                      ) : (
                        <div className="table-container modal-table-container">
                          <table className="admin-table">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>English Prompt</th>
                                <th>Validated Luganda</th>
                                <th>Difficulty</th>
                                <th>Clinical QA Status</th>
                                <th>Reward</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {qualityProfile.recent_sentences.map((s) => (
                                <tr
                                  key={s.id}
                                  className="clickable-sentence-row"
                                  onClick={() => handleInspectSentence(s)}
                                  title="Click to perform direct clinical review on this sentence"
                                >
                                  <td><strong>#{s.id}</strong></td>
                                  <td style={{ maxWidth: "15rem", fontSize: "0.85rem" }}>{s.noisy_english}</td>
                                  <td style={{ maxWidth: "16rem", fontSize: "0.85rem" }}>
                                    <strong>{s.clean_lug}</strong>
                                  </td>
                                  <td><span className="hint">{s.difficulty}</span></td>
                                  <td>
                                    {s.verified ? (
                                      <span className="status-pill status-paid" title={`Verified by ${s.verified_by_name || 'Qualified Reviewer'}`}>
                                        ✓ Verified
                                      </span>
                                    ) : (
                                      <span className="status-pill status-pending">
                                        ⏳ Awaiting QA
                                      </span>
                                    )}
                                  </td>
                                  <td>{ugx(s.reward_ugx)}</td>
                                  <td>
                                    <button
                                      type="button"
                                      className="small-btn inspect-direct-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleInspectSentence(s);
                                      }}
                                    >
                                      🩺 Review ↗
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

}

