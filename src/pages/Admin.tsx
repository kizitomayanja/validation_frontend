import { useEffect, useState } from "react";
import { AdminOverview, AdminPayout, AdminUser, api, patch, post, Role, Settings, ugx } from "../api";

export default function Admin() {
  const [tab, setTab] = useState<"overview" | "payouts" | "users">("overview");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [payouts, setPayouts] = useState<AdminPayout[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ov, st, po, us] = await Promise.all([
        api<AdminOverview>("/admin/overview"),
        api<Settings>("/admin/settings"),
        api<AdminPayout[]>("/admin/payouts"),
        api<AdminUser[]>("/admin/users"),
      ]);
      setOverview(ov);
      setSettings(st);
      setPayouts(po);
      setUsers(us);

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
          onClick={() => setTab("overview")}
        >
          📊 Campaign Overview
        </button>
        <button
          className={`tab-btn ${tab === "payouts" ? "active" : ""}`}
          onClick={() => setTab("payouts")}
        >
          💸 Payout Requests
          {pendingPayoutCount > 0 && <span className="counter-badge">{pendingPayoutCount}</span>}
        </button>
        <button
          className={`tab-btn ${tab === "users" ? "active" : ""}`}
          onClick={() => setTab("users")}
        >
          👥 User Roles & Access ({users.length})
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
                        <strong>{p.user_name}</strong>
                        <div className="hint">{p.user_email}</div>
                      </td>
                      <td><strong>{ugx(p.amount_ugx)}</strong></td>
                      <td>
                        <span className={`provider-badge ${p.provider}`}>{p.provider.toUpperCase()}</span>
                        <div>{p.phone_number}</div>
                        <div className="hint">{p.account_name}</div>
                      </td>
                      <td>{p.sentence_count}</td>
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
                          <div className="hint">
                            <strong>Tx:</strong> {p.provider_reference || "N/A"}
                            {p.processed_at && <div>{new Date(p.processed_at).toLocaleDateString()}</div>}
                          </div>
                        ) : (
                          <div className="hint danger-text">
                            <strong>Reason:</strong> {p.rejection_reason || "Unspecified"}
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
                  <th>Validated</th>
                  <th>Total Earned</th>
                  <th>Paid Out</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className={!u.is_active ? "row-deactivated" : ""}>
                    <td>
                      <strong>{u.full_name}</strong>
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
                    <td className="hint">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
