import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, authenticate, post, tokens, type User } from "./api";

type Ctx = {
  user: User | null; loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (full_name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthCtx = createContext<Ctx>(null!);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On load, a stored refresh token silently restores the session (api() refreshes on the first 401).
  useEffect(() => {
    if (!tokens.refresh()) { setLoading(false); return; }
    api<User>("/me").then(setUser).catch(() => tokens.clear()).finally(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string) => { await authenticate("/auth/login", { email, password }); setUser(await api<User>("/me")); };
  const signUp = async (full_name: string, email: string, password: string) => { await authenticate("/auth/register", { full_name, email, password }); setUser(await api<User>("/me")); };
  const signOut = async () => {
    const rt = tokens.refresh();
    if (rt) await post("/auth/logout", { refresh_token: rt }).catch(() => {});
    tokens.clear(); setUser(null);
  };
  return <AuthCtx.Provider value={{ user, loading, signIn, signUp, signOut }}>{children}</AuthCtx.Provider>;
}
