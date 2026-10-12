import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import Login from "./pages/Login";
import Work from "./pages/Work";
import Profile from "./pages/Profile";
import "./styles.css";

function Shell() {
  const { user, loading, signOut } = useAuth();

  if (loading) return <p className="center muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <>
      <header className="top">
        <span className="brand">Ekyama</span>
        <nav>
          <NavLink to="/work">Work</NavLink>
          <NavLink to="/profile">Profile</NavLink>
        </nav>
        <button className="link" onClick={signOut}>Sign out</button>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Shell />}>
            <Route path="/work" element={<Work />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/work" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
