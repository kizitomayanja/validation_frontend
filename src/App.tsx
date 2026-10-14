import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
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

  if (loading) return <p className="center muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;

  const isAdmin = user.role === "admin";
  const isReviewer = user.role === "reviewer" || isAdmin;

  return (
    <>
      <header className="top">
        <span className="brand">Ekyama</span>
        <nav>
          {isAdmin && <NavLink to="/admin">Admin</NavLink>}
          {isReviewer && <NavLink to="/review">Review</NavLink>}
          <NavLink to="/work">Work</NavLink>
          <NavLink to="/profile">Profile</NavLink>
        </nav>
        <div className="user-nav-meta">
          <RoleBadge role={user.role} />
          <button className="link signout-btn" onClick={signOut}>Sign out</button>
        </div>
      </header>
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
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "reviewer") return <Navigate to="/review" replace />;
  return <Navigate to="/work" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
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
          <Route path="/" element={<DefaultRedirect />} />
          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
