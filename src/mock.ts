// In-browser fake of the FastAPI service so the portal runs with VITE_USE_MOCK=true.
let RATE = 2000;
let MIN_REWARD = 100;
let MIN_CASHOUT = 5000;
let MAX_BUDGET: number | null = 10000000; // UGX 10,000,000 default budget

const json = (d: unknown, s = 200) => new Response(s === 204 ? null : JSON.stringify(d), { status: s, headers: { "Content-Type": "application/json" } });

export type MockUser = {
  id: string;
  email: string;
  full_name: string;
  role: "validator" | "reviewer" | "admin";
  is_active: boolean;
  created_at: string;
  validated_count: number;
  total_earned_ugx: number;
  pending_ugx: number;
  paid_out_ugx: number;
};

// Default user is admin so all views (Admin, Review, Work, Profile) can be explored in demo mode
const currentUser: MockUser = {
  id: "u1",
  email: "admin@ekyama.health",
  full_name: "Dr. Kizito Mayanja",
  role: "admin",
  is_active: true,
  created_at: "2026-09-01T08:00:00Z",
  validated_count: 24,
  total_earned_ugx: 48000,
  pending_ugx: 0,
  paid_out_ugx: 40000,
};

let mockUsers: MockUser[] = [
  currentUser,
  {
    id: "u2",
    email: "sarah.namubiru@mulago.org",
    full_name: "Dr. Sarah Namubiru",
    role: "reviewer",
    is_active: true,
    created_at: "2026-09-05T10:00:00Z",
    validated_count: 52,
    total_earned_ugx: 104000,
    pending_ugx: 0,
    paid_out_ugx: 100000,
  },
  {
    id: "u3",
    email: "amina.nabukeera@ekyama.health",
    full_name: "Amina Nabukeera",
    role: "validator",
    is_active: true,
    created_at: "2026-09-12T14:30:00Z",
    validated_count: 85,
    total_earned_ugx: 170000,
    pending_ugx: 45000,
    paid_out_ugx: 125000,
  },
  {
    id: "u4",
    email: "paul.kato@makerere.ac.ug",
    full_name: "Paul Kato",
    role: "validator",
    is_active: true,
    created_at: "2026-09-15T09:15:00Z",
    validated_count: 41,
    total_earned_ugx: 82000,
    pending_ugx: 0,
    paid_out_ugx: 75000,
  },
  {
    id: "u5",
    email: "grace.alupo@soroti.med.ug",
    full_name: "Grace Alupo",
    role: "validator",
    is_active: true,
    created_at: "2026-09-18T11:45:00Z",
    validated_count: 67,
    total_earned_ugx: 134000,
    pending_ugx: 68000,
    paid_out_ugx: 60000,
  },
];

const workQueue = [
  ["Do you have any shortness of breath when you climb stairs?", "Olina okuziyira ng'ogenda waggulu ku madaala?", "hard", 0.62],
  ["Have you been bringing up any sputum with the cough?", "Olwaddeko okufuuyira sputum n'ekikolokolo?", "medium", 0.38],
  ["And do you smoke?", "Era onywa taaba?", "easy", 0.05],
  ["Any family history of asthma or allergies?", "Waliwo omuntu mu maka go alina asthma oba allergies?", "medium", 0.3],
].map(([e, a, d, c], i) => ({ id: i + 1, noisy_english: e as string, attempted: a as string, difficulty: d as string, cost: c as number }));

let reviewQueue = [
  {
    id: 101,
    noisy_english: "Do you experience sharp, stabbing pain in your chest when inhaling deeply?",
    attempted: "Ono wulira obulumi obusala mu kifuba ng'ossaamu omukka omungi?",
    clean_lug: "Owulira obulumi obusala ng'obw'ekiso mu kifuba ng'ossaamu omukka ogw'amaanyi?",
    difficulty: "hard",
    reward_ugx: 1240,
    validated_by_id: "u3",
    validator_name: "Amina Nabukeera",
    validator_email: "amina@example.com",
    validated_at: "2026-10-13T18:20:00Z",
    verified: false,
  },
  {
    id: 102,
    noisy_english: "Have you noticed any dark blood clots in your stool or bowel movements over the past three days?",
    attempted: "Olabyeko omusaayi omukwafu mu bubi bwo mu nnaku essatu eziyise?",
    clean_lug: "Olabyeko ebitole by'omusaayi omukwafu omuddugavu mu bulyo bwo mu nnaku essatu eziyise?",
    difficulty: "hard",
    reward_ugx: 1350,
    validated_by_id: "u4",
    validator_name: "Paul Kato",
    validator_email: "paul.kato@ekyama.health",
    validated_at: "2026-10-13T20:45:00Z",
    verified: false,
  },
  {
    id: 103,
    noisy_english: "Are you taking any prescribed medication for high blood pressure or diabetes?",
    attempted: "Oli ku ddagala lyonna erya puleesa oba sukaali?",
    clean_lug: "Oli ku ddagala lyonna eryawandiikibwa omusawo erya puleesa oba sukaali?",
    difficulty: "medium",
    reward_ugx: 760,
    validated_by_id: "u5",
    validator_name: "Grace Alupo",
    validator_email: "grace.alupo@ekyama.health",
    validated_at: "2026-10-13T22:10:00Z",
    verified: false,
  },
  {
    id: 104,
    noisy_english: "Has the child had convulsive seizures or vomited everything they drink?",
    attempted: "Omwana alina okusimbibwa oba okusesema byonna by'anywa?",
    clean_lug: "Omwana abaddemu ensimbu oba okusesema buli ky'anywa?",
    difficulty: "hard",
    reward_ugx: 1450,
    validated_by_id: "u3",
    validator_name: "Amina Nabukeera",
    validator_email: "amina@example.com",
    validated_at: "2026-10-14T08:15:00Z",
    verified: false,
  },
  {
    id: 105,
    noisy_english: "Please take two tablets of paracetamol every eight hours after meals.",
    attempted: "Mire amabaali abiri aga paracetamol buli luvanyuma lwa sawa munaana nga omaze okulya.",
    clean_lug: "Mira amayinja abiri aga paracetamol buli luvannyuma lwa ssaawa munaana nga omaze okulya.",
    difficulty: "easy",
    reward_ugx: 520,
    validated_by_id: "u4",
    validator_name: "Paul Kato",
    validator_email: "paul.kato@ekyama.health",
    validated_at: "2026-10-14T09:30:00Z",
    verified: false,
  },
];

let pos = 0, earned = 48000, available = 8000, validated = 24;
let methods: any[] = [
  { id: "m1", provider: "mtn", phone_number: "+256772123456", account_name: "Kizito Mayanja", is_default: true }
];

let adminPayouts: any[] = [
  {
    id: "po-101",
    user_id: "u3",
    user_name: "Amina Nabukeera",
    user_email: "amina.nabukeera@ekyama.health",
    amount_ugx: 45000,
    status: "pending",
    requested_at: "2026-10-13T19:00:00Z",
    provider: "mtn",
    phone_number: "+256782334455",
    account_name: "Amina Nabukeera",
    sentence_count: 22,
    provider_reference: null,
    rejection_reason: null,
    processed_at: null,
  },
  {
    id: "po-102",
    user_id: "u5",
    user_name: "Grace Alupo",
    user_email: "grace.alupo@soroti.med.ug",
    amount_ugx: 68000,
    status: "pending",
    requested_at: "2026-10-13T21:15:00Z",
    provider: "airtel",
    phone_number: "+256701889900",
    account_name: "Grace Alupo",
    sentence_count: 34,
    provider_reference: null,
    rejection_reason: null,
    processed_at: null,
  },
  {
    id: "po-103",
    user_id: "u4",
    user_name: "Paul Kato",
    user_email: "paul.kato@makerere.ac.ug",
    amount_ugx: 75000,
    status: "paid",
    requested_at: "2026-10-12T14:00:00Z",
    provider: "airtel",
    phone_number: "+256755443322",
    account_name: "Paul Kato",
    sentence_count: 38,
    provider_reference: "AIRTEL-908123-UG",
    rejection_reason: null,
    processed_at: "2026-10-12T16:30:00Z",
  },
];

const reward = (cost: number) => Math.max(MIN_REWARD, Math.round(cost * RATE));
const pendingUser = () => adminPayouts.filter((p) => p.user_id === currentUser.id && p.status === "pending").reduce((s, p) => s + p.amount_ugx, 0);

export async function mockFetch(path: string, init: RequestInit): Promise<Response> {
  await new Promise((r) => setTimeout(r, 200));
  const m = (init.method ?? "GET").toUpperCase();
  const body = init.body ? JSON.parse(init.body as string) : {};

  // Clean path matching
  const cleanPath = path.split("?")[0];

  // Auth endpoints
  if (cleanPath === "/auth/login" && m === "POST") {
    currentUser.email = body.email;
    return json({ access_token: "mock-access", refresh_token: "mock-refresh" });
  }
  if (cleanPath === "/auth/register" && m === "POST") {
    currentUser.email = body.email;
    currentUser.full_name = body.full_name;
    return json({ access_token: "mock-access", refresh_token: "mock-refresh" });
  }
  if ((cleanPath === "/auth/password-reset" || cleanPath === "/auth/password-reset/request") && m === "POST") {
    return json({ message: "If an account exists for that email, password reset instructions will be sent." });
  }
  if (cleanPath === "/auth/password-reset/confirm" && m === "POST") {
    return json({ message: "Your password has been reset. Please sign in with your new password." });
  }
  if (cleanPath === "/auth/refresh" && m === "POST") {
    return json({ access_token: "mock-access", refresh_token: "mock-refresh" });
  }
  if (cleanPath === "/auth/logout" && m === "POST") {
    return json(null, 204);
  }
  if (cleanPath === "/me" && m === "GET") {
    return json(currentUser);
  }
  if (cleanPath === "/me/balance" && m === "GET") {
    return json({
      total_earned_ugx: earned,
      available_ugx: available,
      pending_ugx: pendingUser(),
      paid_out_ugx: earned - available - pendingUser(),
      validated_count: validated,
      min_cashout_ugx: MIN_CASHOUT,
    });
  }

  // Work endpoints
  if (cleanPath === "/work/next" && m === "GET") {
    const s = workQueue[pos % workQueue.length];
    return json({ id: s.id, noisy_english: s.noisy_english, attempted: s.attempted, difficulty: s.difficulty, reward_ugx: reward(s.cost) });
  }
  if (cleanPath.startsWith("/work/") && cleanPath.endsWith("/submit") && m === "POST") {
    const s = workQueue[pos % workQueue.length];
    if (body.clean_lug === s.attempted && !body.confirmed_unchanged) {
      return json({ detail: "The translation is identical to the AI attempt. If the AI was completely accurate, confirm unchanged, or fix any translation errors." }, 422);
    }
    pos++;
    validated++;
    earned += reward(s.cost);
    available += reward(s.cost);
    return json({ reward_ugx: reward(s.cost) });
  }
  if (cleanPath.startsWith("/work/") && cleanPath.endsWith("/skip") && m === "POST") {
    pos++;
    return json(null, 204);
  }

  // Payment methods & user payouts
  if (cleanPath === "/me/payment-methods" && m === "GET") return json(methods);
  if (cleanPath === "/me/payment-methods" && m === "POST") {
    const pm = { id: "m" + Date.now(), ...body, is_default: methods.length === 0 };
    methods = [...methods, pm];
    return json(pm, 201);
  }
  if (cleanPath.startsWith("/me/payment-methods/") && m === "DELETE") {
    const id = cleanPath.split("/").pop();
    methods = methods.filter((x) => x.id !== id);
    return json(null, 204);
  }
  if (cleanPath === "/payouts" && m === "GET") {
    return json(adminPayouts.filter((p) => p.user_id === currentUser.id));
  }
  if (cleanPath === "/payouts" && m === "POST") {
    const pm = methods.find((x) => x.id === body.payment_method_id);
    if (!pm) return json({ detail: "Choose a mobile money account." }, 400);
    if (available < MIN_CASHOUT) return json({ detail: `You need at least UGX ${MIN_CASHOUT} to cash out.` }, 400);
    const p = {
      id: "po-" + Date.now(),
      user_id: currentUser.id,
      user_name: currentUser.full_name,
      user_email: currentUser.email,
      amount_ugx: available,
      status: "pending",
      requested_at: new Date().toISOString(),
      provider: pm.provider,
      phone_number: pm.phone_number,
      account_name: pm.account_name,
      sentence_count: 5,
      provider_reference: null,
      rejection_reason: null,
      processed_at: null,
    };
    adminPayouts = [p, ...adminPayouts];
    available = 0;
    return json(p, 201);
  }

  // ------------------------------------------------------------- Admin endpoints
  if (cleanPath === "/admin/settings" && m === "GET") {
    const spent = adminPayouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount_ugx, 0) +
                  mockUsers.reduce((s, u) => s + (u.total_earned_ugx - u.paid_out_ugx), 0);
    const rem = MAX_BUDGET !== null ? Math.max(0, MAX_BUDGET - spent) : null;
    return json({
      rate_ugx: RATE,
      min_reward_ugx: MIN_REWARD,
      min_cashout_ugx: MIN_CASHOUT,
      max_budget_ugx: MAX_BUDGET,
      total_spent_ugx: spent,
      remaining_budget_ugx: rem,
      is_budget_exhausted: MAX_BUDGET !== null && spent >= MAX_BUDGET,
      updated_at: new Date().toISOString(),
    });
  }

  if (cleanPath === "/admin/settings" && m === "PATCH") {
    if ("max_budget_ugx" in body) MAX_BUDGET = body.max_budget_ugx;
    if (body.rate_ugx) RATE = body.rate_ugx;
    if (body.min_reward_ugx !== undefined) MIN_REWARD = body.min_reward_ugx;
    if (body.min_cashout_ugx) MIN_CASHOUT = body.min_cashout_ugx;

    const spent = adminPayouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount_ugx, 0) + 120000;
    const rem = MAX_BUDGET !== null ? Math.max(0, MAX_BUDGET - spent) : null;
    return json({
      rate_ugx: RATE,
      min_reward_ugx: MIN_REWARD,
      min_cashout_ugx: MIN_CASHOUT,
      max_budget_ugx: MAX_BUDGET,
      total_spent_ugx: spent,
      remaining_budget_ugx: rem,
      is_budget_exhausted: MAX_BUDGET !== null && spent >= MAX_BUDGET,
      updated_at: new Date().toISOString(),
    });
  }

  if (cleanPath === "/admin/overview" && m === "GET") {
    const totalS = 500;
    const validatedS = 278;
    const verifiedS = 186;
    const spent = 2650000;
    const rem = MAX_BUDGET !== null ? Math.max(0, MAX_BUDGET - spent) : null;
    return json({
      total_sentences: totalS,
      validated_sentences: validatedS,
      verified_sentences: verifiedS,
      unvalidated_sentences: totalS - validatedS,
      completion_percentage: 55.6,
      verified_percentage: 37.2,
      max_budget_ugx: MAX_BUDGET,
      total_earned_ugx: spent,
      pending_payouts_ugx: 113000,
      paid_out_ugx: 2350000,
      remaining_budget_ugx: rem,
      is_budget_exhausted: MAX_BUDGET !== null && spent >= MAX_BUDGET,
      total_users: mockUsers.length,
      validators_count: mockUsers.filter((u) => u.role === "validator").length,
      reviewers_count: mockUsers.filter((u) => u.role === "reviewer").length,
      admins_count: mockUsers.filter((u) => u.role === "admin").length,
    });
  }

  if (cleanPath === "/admin/users" && m === "GET") {
    return json(mockUsers);
  }

  if (cleanPath.startsWith("/admin/users/") && m === "PATCH") {
    const id = cleanPath.split("/").pop();
    const target = mockUsers.find((u) => u.id === id);
    if (!target) return json({ detail: "User not found" }, 404);
    if (body.role) target.role = body.role;
    if (body.is_active !== undefined) target.is_active = body.is_active;
    return json(target);
  }

  if (cleanPath === "/admin/payouts" && m === "GET") {
    return json(adminPayouts);
  }

  if (cleanPath.startsWith("/admin/payouts/") && cleanPath.endsWith("/mark-paid") && m === "POST") {
    const parts = cleanPath.split("/");
    const id = parts[parts.length - 2];
    const po = adminPayouts.find((p) => p.id === id);
    if (!po) return json({ detail: "Payout not found" }, 404);
    po.status = "paid";
    po.provider_reference = body.provider_reference || "TX-MOCK-" + Date.now();
    po.processed_at = new Date().toISOString();
    return json(po);
  }

  if (cleanPath.startsWith("/admin/payouts/") && cleanPath.endsWith("/reject") && m === "POST") {
    const parts = cleanPath.split("/");
    const id = parts[parts.length - 2];
    const po = adminPayouts.find((p) => p.id === id);
    if (!po) return json({ detail: "Payout not found" }, 404);
    po.status = "rejected";
    po.rejection_reason = body.reason || "Rejected by administrator";
    po.processed_at = new Date().toISOString();
    return json(po);
  }

  // ------------------------------------------------------------- Review endpoints
  if (cleanPath === "/review/validators" && m === "GET") {
    const map = new Map<string, { id: string; name: string; email: string; count: number }>();
    for (const item of reviewQueue) {
      const existing = map.get(item.validated_by_id);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(item.validated_by_id, {
          id: item.validated_by_id,
          name: item.validator_name,
          email: item.validator_email || `${item.validator_name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
          count: 1,
        });
      }
    }
    return json(Array.from(map.values()));
  }

  if (cleanPath === "/review/queue" && m === "GET") {
    const queryStr = path.includes("?") ? path.split("?")[1] : "";
    const params = new URLSearchParams(queryStr);
    const username = params.get("username")?.trim().toLowerCase();
    if (username) {
      return json(
        reviewQueue.filter(
          (s) =>
            s.validator_name.toLowerCase().includes(username) ||
            s.validator_email?.toLowerCase().includes(username)
        )
      );
    }
    return json(reviewQueue);
  }

  if (cleanPath.startsWith("/review/") && cleanPath.endsWith("/approve") && m === "POST") {
    const parts = cleanPath.split("/");
    const id = parseInt(parts[parts.length - 2], 10);
    const item = reviewQueue.find((s) => s.id === id);
    if (!item) return json({ detail: "Sentence not found" }, 404);
    item.verified = true;
    reviewQueue = reviewQueue.filter((s) => s.id !== id);
    return json(item);
  }

  if (cleanPath.startsWith("/review/") && cleanPath.endsWith("/edit") && m === "POST") {
    const parts = cleanPath.split("/");
    const id = parseInt(parts[parts.length - 2], 10);
    const item = reviewQueue.find((s) => s.id === id);
    if (!item) return json({ detail: "Sentence not found" }, 404);
    item.clean_lug = body.clean_lug;
    item.verified = true;
    reviewQueue = reviewQueue.filter((s) => s.id !== id);
    return json(item);
  }

  if (cleanPath.startsWith("/review/") && cleanPath.endsWith("/reject") && m === "POST") {
    const parts = cleanPath.split("/");
    const id = parseInt(parts[parts.length - 2], 10);
    reviewQueue = reviewQueue.filter((s) => s.id !== id);
    return json(null, 204);
  }

  return json({ detail: "Not found" }, 404);
}
