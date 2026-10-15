import { useState } from "react";
import { BrowserRouter, Link, Navigate, NavLink, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Work from "./pages/Work";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Review from "./pages/Review";
import "./styles.css";

function RoleBadge({ role }: { role: string }) {
  return <span className={`nav-role-badge role-${role}`}>{role}</span>;
}

function Shell() {
  const { user, loading, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) return <p className="center muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;

  const isAdmin = user.role === "admin";
  const isReviewer = user.role === "reviewer" || isAdmin;

  const handleSignOut = async () => {
    setMobileMenuOpen(false);
    await signOut();
  };

  return (
    <>
      <header className="top">
        <div className="top-brand-group">
          <Link to="/" className="brand" title="View Project Mission & Overview" onClick={() => setMobileMenuOpen(false)}>
            🌿 Ekyama
          </Link>
          <RoleBadge role={user.role} />
        </div>

        {/* Desktop Navigation */}
        <nav className="desktop-nav">
          {isAdmin && <NavLink to="/admin">Admin</NavLink>}
          {isReviewer && <NavLink to="/review">Review</NavLink>}
          <NavLink to="/work">Work</NavLink>
          <NavLink to="/profile">Profile</NavLink>
        </nav>

        {/* Desktop User Meta */}
        <div className="user-nav-meta desktop-user-meta">
          <span className="user-nav-email" title={user.email}>{user.email}</span>
          <button className="link signout-btn" onClick={handleSignOut}>Sign out</button>
        </div>

        {/* Mobile Toggle Button */}
        <button
          type="button"
          className={`shell-mobile-toggle ${mobileMenuOpen ? "open" : ""}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileMenuOpen}
        >
          <span className="hamburger-icon">
            <span className="line"></span>
            <span className="line"></span>
            <span className="line"></span>
          </span>
        </button>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="shell-mobile-drawer">
            <div className="mobile-user-profile-header">
              <div className="mobile-user-info">
                <span className="mobile-user-name">{user.full_name || "Community Validator"}</span>
                <span className="mobile-user-email">{user.email}</span>
              </div>
              <RoleBadge role={user.role} />
            </div>

            <nav className="mobile-shell-links">
              {isAdmin && (
                <NavLink to="/admin" onClick={() => setMobileMenuOpen(false)}>
                  <span className="link-icon">⚙️</span>
                  <span>Admin Oversight</span>
                </NavLink>
              )}
              {isReviewer && (
                <NavLink to="/review" onClick={() => setMobileMenuOpen(false)}>
                  <span className="link-icon">🩺</span>
                  <span>Review Station</span>
                </NavLink>
              )}
              <NavLink to="/work" onClick={() => setMobileMenuOpen(false)}>
                <span className="link-icon">✍️</span>
                <span>Work / Tasks</span>
              </NavLink>
              <NavLink to="/profile" onClick={() => setMobileMenuOpen(false)}>
                <span className="link-icon">👤</span>
                <span>Profile & Payouts</span>
              </NavLink>
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="mobile-link-overview">
                <span className="link-icon">🌿</span>
                <span>Mission & Overview</span>
              </Link>
            </nav>

            <div className="mobile-shell-footer">
              <button type="button" className="danger-btn mobile-signout-btn" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Backdrop overlay when mobile menu is open */}
      {mobileMenuOpen && (
        <div className="shell-drawer-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}
      <main>
        <Outlet />
      </main>
    </>
  );
}

function RequireRole({ allowed, children }: { allowed: string[]; children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="center muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!allowed.includes(user.role)) {
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "reviewer") return <Navigate to="/review" replace />;
    return <Navigate to="/work" replace />;
  }
  return children;
}

function DefaultRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <p className="center muted">Loading…</p>;
  if (!user) return <Navigate to="/" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "reviewer") return <Navigate to="/review" replace />;
  return <Navigate to="/work" replace />;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route element={<Shell />}>
            <Route
              path="/admin"
              element={
                <RequireRole allowed={["admin"]}>
                  <Admin />
                </RequireRole>
              }
            />
            <Route
              path="/review"
              element={
                <RequireRole allowed={["admin", "reviewer"]}>
                  <Review />
                </RequireRole>
              }
            />
            <Route path="/work" element={<Work />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
