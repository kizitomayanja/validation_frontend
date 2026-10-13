import { mockFetch } from "./mock";

export type User = { id: string; email: string; full_name: string; role: string };
export type Sentence = { id: number; noisy_english: string; attempted: string; difficulty: "easy" | "medium" | "hard"; reward_ugx: number };
export type Balance = { total_earned_ugx: number; available_ugx: number; pending_ugx: number; paid_out_ugx: number; validated_count: number; min_cashout_ugx: number };
export type Provider = "mtn" | "airtel";
export type PaymentMethod = { id: string; provider: Provider; phone_number: string; account_name: string; is_default: boolean };
export type Payout = { id: string; amount_ugx: number; status: "pending" | "paid" | "rejected" | "cancelled"; requested_at: string; provider: Provider; phone_number: string; account_name: string };

const BASE = import.meta.env.MY_PREF_API_URL;
const MOCK = import.meta.env.MY_PREF_USE_MOCK === "true";
const RT = "vp_refresh";
let access: string | null = null;

export const tokens = {
  set(a: string, r: string) {
    access = a;
    localStorage.setItem(RT, r);
  },
  clear() {
    access = null;
    localStorage.removeItem(RT);
  },
  refresh: () => localStorage.getItem(RT),
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function raw(path: string, init: RequestInit = {}, auth = true): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (auth && access) headers.set("Authorization", String.fromCharCode(66,69,65,82,69,82,32) + access);
  const req = { ...init, headers };
  return MOCK ? mockFetch(path, req) : fetch(BASE + path, req);
}

let refreshing: Promise<boolean> | null = null;

function refresh(): Promise<boolean> {
  refreshing ??= (async () => {
    const rt = tokens.refresh();
    if (!rt) return false;
    const res = await raw("/auth/refresh", { method: "POST", body: JSON.stringify({ refresh_token: rt }) }, false);
    if (!res.ok) {
      tokens.clear();
      return false;
    }
    const d = await res.json();
    tokens.set(d.access_token, d.refresh_token);
    return true;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export async function api<T = void>(path: string, init?: RequestInit): Promise<T> {
  let res = await raw(path, init);
  if (res.status === 401 && (await refresh())) res = await raw(path, init);
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new ApiError(res.status, typeof e.detail === "string" ? e.detail : "Check the details and try again.");
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export async function authenticate(path: "/auth/login" | "/auth/register", body: object): Promise<void> {
  const res = await raw(path, { method: "POST", body: JSON.stringify(body) }, false);
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, typeof d.detail === "string" ? d.detail : "Check the details and try again.");
  tokens.set(d.access_token, d.refresh_token);
}

export const post = <T = void>(path: string, body?: object) => api<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
export const ugx = (n: number) => `UGX ${n.toLocaleString("en-UG")}`;
