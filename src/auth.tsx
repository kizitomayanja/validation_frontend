import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, authenticate, IS_TEST_MODE, post, tokens, type User } from "./api";
import { resetMockState, switchMockUser } from "./mock";

type Ctx = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (full_name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchPersona: (idOrEmail: string) => Promise<void>;
  resetSimulation: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>(null!);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On load: in test mode, ensure an initial session exists (default to Admin) if not logged in
  useEffect(() => {
    if (IS_TEST_MODE && !tokens.refresh()) {
      tokens.set("mock-test-access", "mock-test-refresh");
    }
    if (!tokens.refresh()) {
      setLoading(false);
      return;
    }
    api<User>("/me")
      .then(setUser)
      .catch(() => tokens.clear())
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string) => {
    await authenticate("/auth/login", { email, password });
    setUser(await api<User>("/me"));
  };

  const signUp = async (full_name: string, email: string, password: string) => {
    await authenticate("/auth/register", { full_name, email, password });
    setUser(await api<User>("/me"));
  };

  const signOut = async () => {
    const rt = tokens.refresh();
    if (rt) await post("/auth/logout", { refresh_token: rt }).catch(() => {});
    tokens.clear();
    setUser(null);
  };

  const switchPersona = async (idOrEmail: string) => {
    if (IS_TEST_MODE) {
      switchMockUser(idOrEmail);
      tokens.set("mock-test-access", "mock-test-refresh");
      const me = await api<User>("/me");
      setUser(me);
    }
  };

  const resetSimulation = async () => {
    if (IS_TEST_MODE) {
      resetMockState();
      tokens.set("mock-test-access", "mock-test-refresh");
      const me = await api<User>("/me");
      setUser(me);
    }
  };

  return (
    <AuthCtx.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        switchPersona,
        resetSimulation,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}
