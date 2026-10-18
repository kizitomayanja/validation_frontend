import { mockFetch } from "./mock";

export type Role = "validator" | "reviewer" | "admin";
export type User = { id: string; email: string; full_name: string; role: Role };
export type Sentence = { id: number; noisy_english: string; attempted: string; difficulty: "easy" | "medium" | "hard"; reward_ugx: number };
export type Balance = { total_earned_ugx: number; available_ugx: number; pending_ugx: number; paid_out_ugx: number; validated_count: number; min_cashout_ugx: number };
export type Provider = "mtn" | "airtel";
export type PaymentMethod = { id: string; provider: Provider; phone_number: string; account_name: string; is_default: boolean };
export type Payout = { id: string; amount_ugx: number; status: "pending" | "paid" | "rejected" | "cancelled"; requested_at: string; provider: Provider; phone_number: string; account_name: string };

export type Settings = {
  rate_ugx: number;
  min_reward_ugx: number;
  min_cashout_ugx: number;
  max_budget_ugx: number | null;
  total_spent_ugx: number;
  remaining_budget_ugx: number | null;
  is_budget_exhausted: boolean;
  updated_at: string;
};

export type AdminOverview = {
  total_sentences: number;
  validated_sentences: number;
  verified_sentences: number;
  unvalidated_sentences: number;
  completion_percentage: number;
  verified_percentage: number;
  max_budget_ugx: number | null;
  total_earned_ugx: number;
  pending_payouts_ugx: number;
  paid_out_ugx: number;
  remaining_budget_ugx: number | null;
  is_budget_exhausted: boolean;
  total_users: number;
  validators_count: number;
  reviewers_count: number;
  admins_count: number;
};

export type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  validated_count: number;
  verified_count?: number;
  accuracy_rate?: number;
  total_earned_ugx: number;
  pending_ugx: number;
  paid_out_ugx: number;
};

export type AdminPayout = Payout & {
  user_id: string;
  user_name: string;
  user_email: string;
  sentence_count: number;
  verified_count?: number;
  accuracy_rate?: number;
  provider_reference?: string | null;
  rejection_reason?: string | null;
  processed_at?: string | null;
};

export type UserSentenceDetail = {
  id: number;
  noisy_english: string;
  attempted: string;
  clean_lug: string;
  difficulty: "easy" | "medium" | "hard";
  reward_ugx: number;
  verified: boolean;
  verified_at: string | null;
  verified_by_name: string | null;
  validated_at: string;
  payout_id: string | null;
  paid_status: boolean;
};

export type UserQualityProfile = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  validated_count: number;
  verified_count: number;
  pending_review_count: number;
  accuracy_rate: number;
  total_earned_ugx: number;
  pending_ugx: number;
  paid_out_ugx: number;
  recent_sentences: UserSentenceDetail[];
};


export type ReviewSentence = {
  id: number;
  noisy_english: string;
  attempted: string;
  clean_lug: string;
  difficulty: "easy" | "medium" | "hard";
  reward_ugx: number;
  validated_by_id: string;
  validator_name: string;
  validator_email?: string;
  validated_at: string;
  verified: boolean;
};

export type ReviewValidator = {
  id: string;
  name: string;
  email: string;
  count: number;
};

export type DatasetExportHistory = {
  id: string;
  exported_by_name: string;
  sentence_count: number;
  scope: "verified_only" | "all_validated";
  only_new: boolean;
  file_name: string;
  created_at: string;
};

export type DatasetExportStats = {
  total_validated: number;
  total_verified: number;
  unexported_verified: number;
  unexported_validated: number;
  last_export_at: string | null;
  total_exports_count: number;
  recent_exports: DatasetExportHistory[];
};


const BASE = String(import.meta.env.VITE_API_URL ?? import.meta.env.MY_PREF_API_URL ?? "http://localhost:8000").trim().replace(/\/+$/, "");
const MOCK = import.meta.env.VITE_USE_MOCK === "true" || import.meta.env.MY_PREF_USE_MOCK === "true";
const RT = "vp_refresh";
let access: string | null = null;

// Multi-tab channel to prevent replay of rotated refresh tokens across open tabs
const authChannel = typeof window !== "undefined" && "BroadcastChannel" in window ? new BroadcastChannel("vp_auth") : null;
if (authChannel) {
  authChannel.onmessage = (event) => {
    if (event.data?.type === "REFRESHED" && event.data?.access) {
      access = event.data.access;
    } else if (event.data?.type === "LOGOUT") {
      access = null;
      localStorage.removeItem(RT);
    }
  };
}

export const tokens = {
  set(a: string, r: string) {
    access = a;
    localStorage.setItem(RT, r);
    authChannel?.postMessage({ type: "REFRESHED", access: a });
  },
  clear() {
    access = null;
    localStorage.removeItem(RT);
    authChannel?.postMessage({ type: "LOGOUT" });
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
  if (auth && access) headers.set("Authorization", "Bearer " + access);
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
export const patch = <T = void>(path: string, body?: object) => api<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });
export const del = <T = void>(path: string) => api<T>(path, { method: "DELETE" });
export const ugx = (n: number) => `UGX ${n.toLocaleString("en-UG")}`;

export async function downloadExportCsv(
  scope: "verified_only" | "all_validated",
  onlyNew: boolean,
  markExported: boolean
): Promise<{ filename: string }> {
  const query = new URLSearchParams({
    scope,
    only_new: String(onlyNew),
    mark_exported: String(markExported),
  });
  const path = `/admin/export/sentences.csv?${query.toString()}`;
  let res = await raw(path, { method: "GET" });
  if (res.status === 401 && (await refresh())) res = await raw(path, { method: "GET" });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new ApiError(res.status, typeof e.detail === "string" ? e.detail : "Failed to download dataset CSV.");
  }

  const disposition = res.headers.get("Content-Disposition");
  const filenameMatch = disposition && /filename="?([^";]+)"?/.exec(disposition);
  const filename = filenameMatch ? filenameMatch[1] : `ekyama_dataset_${scope}_${new Date().toISOString().slice(0, 10)}.csv`;

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);

  return { filename };
}

