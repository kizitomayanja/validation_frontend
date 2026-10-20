// In-browser fake of the FastAPI service so the portal runs with VITE_USE_MOCK=true or VITE_TEST_MODE=true.
export type MockUser = {
  id: string;
  email: string;
  full_name: string;
  role: "validator" | "reviewer" | "admin";
  is_active: boolean;
  created_at: string;
  validated_count: number;
  verified_count: number;
  accuracy_rate: number;
  total_earned_ugx: number;
  pending_ugx: number;
  paid_out_ugx: number;
};

export type MockPaymentMethod = {
  id: string;
  user_id: string;
  provider: "mtn" | "airtel";
  phone_number: string;
  account_name: string;
  is_default: boolean;
};

export type MockPayout = {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  amount_ugx: number;
  status: "pending" | "paid" | "rejected" | "cancelled";
  requested_at: string;
  provider: "mtn" | "airtel";
  phone_number: string;
  account_name: string;
  sentence_count: number;
  verified_count?: number;
  accuracy_rate?: number;
  provider_reference: string | null;
  rejection_reason: string | null;
  processed_at: string | null;
};

export type MockTicketMessage = {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: "validator" | "reviewer" | "admin";
  message: string;
  created_at: string;
};

export type MockTicket = {
  id: string;
  author_id: string;
  author_name: string;
  author_email: string;
  author_role: "validator" | "reviewer" | "admin";
  category: "clinical_terminology" | "review_dispute" | "payout_issue" | "role_request" | "general";
  target_role: "reviewer" | "admin";
  subject: string;
  status: "open" | "in_progress" | "resolved";
  sentence_id?: number | null;
  payout_id?: string | null;
  created_at: string;
  updated_at: string;
  messages: MockTicketMessage[];
};

export type MockReviewSentence = {
  id: number;
  noisy_english: string;
  attempted: string;
  clean_lug: string;
  difficulty: "easy" | "medium" | "hard";
  reward_ugx: number;
  validator_name: string;
  validator_email: string;
  validated_by_id: string;
  validated_at: string;
  verified: boolean;
  verified_by_name: string | null;
  verified_at: string | null;
  exported_at: string | null;
};

const json = (d: unknown, s = 200) =>
  new Response(s === 204 ? null : JSON.stringify(d), {
    status: s,
    headers: { "Content-Type": "application/json" },
  });

// ------------------------------------------------------------- Initial Seed Data Factories
const INITIAL_USERS: MockUser[] = [
  {
    id: "u1",
    email: "admin@ekyama.health",
    full_name: "Dr. Kizito Mayanja",
    role: "admin",
    is_active: true,
    created_at: "2026-09-01T08:00:00Z",
    validated_count: 24,
    verified_count: 22,
    accuracy_rate: 91.7,
    total_earned_ugx: 48000,
    pending_ugx: 0,
    paid_out_ugx: 40000,
  },
  {
    id: "u2",
    email: "reviewer@ekyama.health",
    full_name: "Dr. Sarah Namubiru",
    role: "reviewer",
    is_active: true,
    created_at: "2026-09-05T10:00:00Z",
    validated_count: 52,
    verified_count: 50,
    accuracy_rate: 96.2,
    total_earned_ugx: 104000,
    pending_ugx: 0,
    paid_out_ugx: 100000,
  },
  {
    id: "u3",
    email: "validator@ekyama.health",
    full_name: "Amina Nabukeera",
    role: "validator",
    is_active: true,
    created_at: "2026-09-12T14:30:00Z",
    validated_count: 85,
    verified_count: 76,
    accuracy_rate: 89.4,
    total_earned_ugx: 170000,
    pending_ugx: 45000,
    paid_out_ugx: 125000,
  },
  {
    id: "u5",
    email: "grace.alupo@ekyama.health",
    full_name: "Grace Alupo",
    role: "validator",
    is_active: true,
    created_at: "2026-09-18T11:45:00Z",
    validated_count: 67,
    verified_count: 48,
    accuracy_rate: 71.6,
    total_earned_ugx: 134000,
    pending_ugx: 68000,
    paid_out_ugx: 60000,
  },
  {
    id: "u6",
    email: "new.user@ekyama.health",
    full_name: "Ronald Kato",
    role: "validator",
    is_active: true,
    created_at: "2026-10-18T10:00:00Z",
    validated_count: 0,
    verified_count: 0,
    accuracy_rate: 0,
    total_earned_ugx: 0,
    pending_ugx: 0,
    paid_out_ugx: 0,
  },
  {
    id: "u4",
    email: "paul.kato@makerere.ac.ug",
    full_name: "Paul Kato",
    role: "validator",
    is_active: true,
    created_at: "2026-09-15T09:15:00Z",
    validated_count: 41,
    verified_count: 36,
    accuracy_rate: 87.8,
    total_earned_ugx: 82000,
    pending_ugx: 0,
    paid_out_ugx: 75000,
  },
];

const INITIAL_METHODS: MockPaymentMethod[] = [
  { id: "m1", user_id: "u1", provider: "mtn", phone_number: "+256772123456", account_name: "Kizito Mayanja", is_default: true },
  { id: "m2", user_id: "u2", provider: "airtel", phone_number: "+256752001122", account_name: "Sarah Namubiru", is_default: true },
  { id: "m3", user_id: "u3", provider: "mtn", phone_number: "+256782334455", account_name: "Amina Nabukeera", is_default: true },
  { id: "m4", user_id: "u5", provider: "airtel", phone_number: "+256701889900", account_name: "Grace Alupo", is_default: true },
  { id: "m5", user_id: "u4", provider: "airtel", phone_number: "+256755443322", account_name: "Paul Kato", is_default: true },
];

const INITIAL_PAYOUTS: MockPayout[] = [
  {
    id: "po-101",
    user_id: "u3",
    user_name: "Amina Nabukeera",
    user_email: "validator@ekyama.health",
    amount_ugx: 45000,
    status: "pending",
    requested_at: "2026-10-18T18:00:00Z",
    provider: "mtn",
    phone_number: "+256782334455",
    account_name: "Amina Nabukeera",
    sentence_count: 22,
    verified_count: 18,
    accuracy_rate: 81.8,
    provider_reference: null,
    rejection_reason: null,
    processed_at: null,
  },
  {
    id: "po-102",
    user_id: "u5",
    user_name: "Grace Alupo",
    user_email: "grace.alupo@ekyama.health",
    amount_ugx: 68000,
    status: "pending",
    requested_at: "2026-10-18T19:15:00Z",
    provider: "airtel",
    phone_number: "+256701889900",
    account_name: "Grace Alupo",
    sentence_count: 34,
    verified_count: 24,
    accuracy_rate: 70.6,
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
    requested_at: "2026-10-17T14:00:00Z",
    provider: "airtel",
    phone_number: "+256755443322",
    account_name: "Paul Kato",
    sentence_count: 38,
    verified_count: 35,
    accuracy_rate: 92.1,
    provider_reference: "AIRTEL-908123-UG",
    rejection_reason: null,
    processed_at: "2026-10-17T16:30:00Z",
  },
  {
    id: "po-104",
    user_id: "u3",
    user_name: "Amina Nabukeera",
    user_email: "validator@ekyama.health",
    amount_ugx: 12000,
    status: "rejected",
    requested_at: "2026-10-15T11:00:00Z",
    provider: "mtn",
    phone_number: "+256782334455",
    account_name: "Amina Nabukeera",
    sentence_count: 6,
    verified_count: 5,
    accuracy_rate: 83.3,
    provider_reference: null,
    rejection_reason: "Account name mismatch with registered MTN SIM",
    processed_at: "2026-10-15T15:00:00Z",
  },
];

const RAW_WORK_ITEMS = [
  ["Do you have any shortness of breath when you climb stairs?", "Olina okuziyira ng'ogenda waggulu ku madaala?", "hard", 0.62],
  ["Have you been bringing up any sputum with the cough?", "Olwaddeko okufuuyira sputum n'ekikolokolo?", "medium", 0.38],
  ["And do you smoke?", "Era onywa taaba?", "easy", 0.05],
  ["Any family history of asthma or allergies?", "Waliwo omuntu mu maka go alina asthma oba allergies?", "medium", 0.3],
  ["Take one tablet twice daily after meals for five days.", "Mina empeke emu emirundi ebiri buli lunaku oluvannyuma lw'emmere okumala ennaku ttaano.", "easy", 0.2],
  ["If convulsions occur, position the patient on their left side immediately.", "Singa ensimbu ez'omutwe zibalukawo, teeka omulwadde ku lubiri olwa kkono amangu ddala.", "hard", 0.75],
  ["Ensure the child completes the full course of oral antibiotic suspension.", "Kkiriza omwana amalire ddala eddagala ly'ekirwadde lyonna ery'okunywa.", "medium", 0.45],
];

const INITIAL_REVIEW_SENTENCES: MockReviewSentence[] = [
  {
    id: 101,
    noisy_english: "Do you experience sharp, stabbing pain in your chest when inhaling deeply?",
    attempted: "Wulira obulumi obufumita mu kifuba nga ossa nnyo?",
    clean_lug: "Owulira obulumi obusala mu kifuba ng'ossaamu empewo ennyingi?",
    difficulty: "hard",
    reward_ugx: 1240,
    validator_name: "Amina Nabukeera",
    validator_email: "validator@ekyama.health",
    validated_by_id: "u3",
    validated_at: "2026-10-18T14:30:00Z",
    verified: false,
    verified_by_name: null,
    verified_at: null,
    exported_at: null,
  },
  {
    id: 102,
    noisy_english: "Ensure the oral rehydration solution is mixed with clean, boiled drinking water.",
    attempted: "Kkiriza eddagala ly'amazzi ga ORS litabulibwe mu mazzi amayonjo amatekeddwa.",
    clean_lug: "Kakasa nti eddagala lya ORS eritabulibwa mu mazzi litabuliddwa mu mazzi amafumbe amayonjo ag'okunywa.",
    difficulty: "medium",
    reward_ugx: 760,
    validator_name: "Amina Nabukeera",
    validator_email: "validator@ekyama.health",
    validated_by_id: "u3",
    validated_at: "2026-10-18T15:10:00Z",
    verified: false,
    verified_by_name: null,
    verified_at: null,
    exported_at: null,
  },
  {
    id: 103,
    noisy_english: "The patient presents with high fever, neck stiffness, and photophobia.",
    attempted: "Omulwadde azze n'omusujja omungi, ensingo ekaluba, n'okutya ekitangaala.",
    clean_lug: "Omulwadde azze ng'alina omusujja ogw'amaanyi, obukakanyavu bw'ensingo, n'obutagumira musana oba ekitangaala.",
    difficulty: "hard",
    reward_ugx: 1500,
    validator_name: "Grace Alupo",
    validator_email: "grace.alupo@ekyama.health",
    validated_by_id: "u5",
    validated_at: "2026-10-18T16:00:00Z",
    verified: false,
    verified_by_name: null,
    verified_at: null,
    exported_at: null,
  },
  {
    id: 104,
    noisy_english: "Take two tablets of paracetamol every eight hours for mild pain or fever.",
    attempted: "Mina empeke bbiri eza paracetamol buli ssaawa munaana.",
    clean_lug: "Mira empeke bbiri eza paracetamol buli luvannyuma lwa ssaawa munaana okukkakkanya obulumi n'omusujja.",
    difficulty: "easy",
    reward_ugx: 400,
    validator_name: "Grace Alupo",
    validator_email: "grace.alupo@ekyama.health",
    validated_by_id: "u5",
    validated_at: "2026-10-18T16:20:00Z",
    verified: false,
    verified_by_name: null,
    verified_at: null,
    exported_at: null,
  },
  {
    id: 105,
    noisy_english: "Immediate caesarean section was performed due to fetal distress.",
    attempted: "Omukyala yalongoosebwa olw'omwana okulumwa.",
    clean_lug: "Omukyala yalongoosebwa mu bwangu okutaasa obulamu bw'omwana eyali alumizibwa embuto.",
    difficulty: "hard",
    reward_ugx: 1400,
    validator_name: "Paul Kato",
    validator_email: "paul.kato@makerere.ac.ug",
    validated_by_id: "u4",
    validated_at: "2026-10-18T11:00:00Z",
    verified: true,
    verified_by_name: "Dr. Sarah Namubiru",
    verified_at: "2026-10-18T13:00:00Z",
    exported_at: null,
  },
];

const INITIAL_TICKETS: MockTicket[] = [
  {
    id: "t-101",
    author_id: "u3",
    author_name: "Amina Nabukeera",
    author_email: "validator@ekyama.health",
    author_role: "validator",
    category: "clinical_terminology",
    target_role: "reviewer",
    subject: "Clinical phrasing for severe chest pain with deep inhalation",
    status: "in_progress",
    sentence_id: 101,
    payout_id: null,
    created_at: "2026-10-18T14:40:00Z",
    updated_at: "2026-10-18T15:00:00Z",
    messages: [
      {
        id: "tm-1",
        ticket_id: "t-101",
        sender_id: "u3",
        sender_name: "Amina Nabukeera",
        sender_role: "validator",
        message: "Doctor, when translating 'stabbing pain in chest when inhaling deeply', should I use 'obulumi obusala mu kifuba' or 'obulumi obufumita'? Which is better understood in rural health centres?",
        created_at: "2026-10-18T14:40:00Z",
      },
      {
        id: "tm-2",
        ticket_id: "t-101",
        sender_id: "u2",
        sender_name: "Dr. Sarah Namubiru",
        sender_role: "reviewer",
        message: "Hello Amina! In clinical triage, 'obusala mu kifuba' is more intuitive for patients and accurately denotes pleuritic sharp pain. Great work checking with us.",
        created_at: "2026-10-18T15:00:00Z",
      },
    ],
  },
  {
    id: "t-102",
    author_id: "u5",
    author_name: "Grace Alupo",
    author_email: "grace.alupo@ekyama.health",
    author_role: "validator",
    category: "payout_issue",
    target_role: "admin",
    subject: "Payout #po-102 timing & Airtel verification",
    status: "open",
    sentence_id: null,
    payout_id: "po-102",
    created_at: "2026-10-18T19:30:00Z",
    updated_at: "2026-10-18T19:30:00Z",
    messages: [
      {
        id: "tm-3",
        ticket_id: "t-102",
        sender_id: "u5",
        sender_name: "Grace Alupo",
        sender_role: "validator",
        message: "Admin, I requested a withdrawal of UGX 68,000 to my Airtel number (+256701889900). Is there any additional documentation needed for the clinical verification?",
        created_at: "2026-10-18T19:30:00Z",
      },
    ],
  },
];

// ------------------------------------------------------------- State Variables
let RATE = 2000;
let MIN_REWARD = 100;
let MIN_CASHOUT = 5000;
let MAX_BUDGET: number | null = 10000000; // UGX 10,000,000

let mockUsers: MockUser[] = JSON.parse(JSON.stringify(INITIAL_USERS));
let currentUser: MockUser = JSON.parse(JSON.stringify(INITIAL_USERS[0])); // Dr. Kizito (Admin)
let methods: MockPaymentMethod[] = JSON.parse(JSON.stringify(INITIAL_METHODS));
let adminPayouts: MockPayout[] = JSON.parse(JSON.stringify(INITIAL_PAYOUTS));
let reviewQueue: MockReviewSentence[] = JSON.parse(JSON.stringify(INITIAL_REVIEW_SENTENCES));
let workPos = 0;
let mockTickets: MockTicket[] = JSON.parse(JSON.stringify(INITIAL_TICKETS));

let recentExports = [
  {
    id: "exp-001",
    exported_by_id: "u1",
    exported_by_name: "Dr. Kizito Mayanja",
    scope: "verified_only",
    only_new: false,
    sentence_count: 140,
    file_name: "ekyama_verified_dataset_20261016_140000.csv",
    created_at: "2026-10-16T14:00:00Z",
  },
  {
    id: "exp-002",
    exported_by_id: "u1",
    exported_by_name: "Dr. Kizito Mayanja",
    scope: "all_validated",
    only_new: true,
    sentence_count: 46,
    file_name: "ekyama_validated_delta_20261017_093000.csv",
    created_at: "2026-10-17T09:30:00Z",
  },
];

// Helper calculations
const reward = (cost: number) => Math.max(MIN_REWARD, Math.round(cost * RATE));

const getPendingForUser = (userId: string) =>
  adminPayouts
    .filter((p) => p.user_id === userId && p.status === "pending")
    .reduce((s, p) => s + p.amount_ugx, 0);

const getAvailableForUser = (user: MockUser) => {
  const pending = getPendingForUser(user.id);
  return Math.max(0, user.total_earned_ugx - user.paid_out_ugx - pending);
};

// ------------------------------------------------------------- Exported Persona & Reset Helpers
export function getMockPersonas(): MockUser[] {
  // Returns the 5 core personas in deliberate order
  const order = ["u1", "u2", "u3", "u5", "u6"];
  return order
    .map((id) => mockUsers.find((u) => u.id === id)!)
    .filter(Boolean);
}

export function getCurrentMockUser(): MockUser {
  return currentUser;
}

export function switchMockUser(idOrEmail: string): MockUser {
  const target = mockUsers.find(
    (u) =>
      u.id.toLowerCase() === idOrEmail.toLowerCase() ||
      u.email.toLowerCase() === idOrEmail.toLowerCase()
  );
  if (!target) {
    throw new Error(`Test persona not found: ${idOrEmail}`);
  }
  currentUser = target;
  return currentUser;
}

export function resetMockState(): void {
  RATE = 2000;
  MIN_REWARD = 100;
  MIN_CASHOUT = 5000;
  MAX_BUDGET = 10000000;
  mockUsers = JSON.parse(JSON.stringify(INITIAL_USERS));
  currentUser = JSON.parse(JSON.stringify(INITIAL_USERS[0]));
  methods = JSON.parse(JSON.stringify(INITIAL_METHODS));
  adminPayouts = JSON.parse(JSON.stringify(INITIAL_PAYOUTS));
  reviewQueue = JSON.parse(JSON.stringify(INITIAL_REVIEW_SENTENCES));
  workPos = 0;
  mockTickets = JSON.parse(JSON.stringify(INITIAL_TICKETS));
}

// ------------------------------------------------------------- Mock Fetch Engine
export async function mockFetch(path: string, init: RequestInit): Promise<Response> {
  await new Promise((r) => setTimeout(r, 120)); // Subtle network delay
  const m = (init.method ?? "GET").toUpperCase();
  const body = init.body ? JSON.parse(init.body as string) : {};
  const cleanPath = path.split("?")[0];

  // Auth endpoints
  if (cleanPath === "/auth/login" && m === "POST") {
    const matched = mockUsers.find((u) => u.email.toLowerCase() === (body.email || "").toLowerCase());
    if (matched) {
      currentUser = matched;
    } else {
      currentUser.email = body.email;
    }
    return json({ access_token: "mock-access", refresh_token: "mock-refresh" });
  }

  if (cleanPath === "/auth/register" && m === "POST") {
    const newUser: MockUser = {
      id: "u" + (mockUsers.length + 1),
      email: body.email,
      full_name: body.full_name,
      role: "validator",
      is_active: true,
      created_at: new Date().toISOString(),
      validated_count: 0,
      verified_count: 0,
      accuracy_rate: 0,
      total_earned_ugx: 0,
      pending_ugx: 0,
      paid_out_ugx: 0,
    };
    mockUsers.push(newUser);
    currentUser = newUser;
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

  // Current User profile & balance
  if (cleanPath === "/me" && m === "GET") {
    return json(currentUser);
  }

  if (cleanPath === "/me/balance" && m === "GET") {
    const pending = getPendingForUser(currentUser.id);
    const available = getAvailableForUser(currentUser);
    const verifiedCount = currentUser.verified_count || 0;
    const pendingReviewCount = Math.max(0, currentUser.validated_count - verifiedCount);
    const pendingReviewUgx = reviewQueue
      .filter((q) => (q.validated_by_id === currentUser.id || q.validator_email === currentUser.email) && !q.verified)
      .reduce((acc, q) => acc + q.reward_ugx, 0) || (pendingReviewCount * 2000);

    return json({
      total_earned_ugx: currentUser.total_earned_ugx,
      available_ugx: available,
      pending_ugx: pending,
      paid_out_ugx: currentUser.paid_out_ugx,
      validated_count: currentUser.validated_count,
      verified_count: verifiedCount,
      pending_review_count: pendingReviewCount,
      pending_review_ugx: pendingReviewUgx,
      min_cashout_ugx: MIN_CASHOUT,
    });
  }

  // Work translation endpoints
  if (cleanPath === "/work/next" && m === "GET") {
    const raw = RAW_WORK_ITEMS[workPos % RAW_WORK_ITEMS.length];
    return json({
      id: workPos + 1,
      noisy_english: raw[0],
      attempted: raw[1],
      difficulty: raw[2],
      reward_ugx: reward(raw[3] as number),
    });
  }

  if (cleanPath.startsWith("/work/") && cleanPath.endsWith("/submit") && m === "POST") {
    const raw = RAW_WORK_ITEMS[workPos % RAW_WORK_ITEMS.length];
    if (body.clean_lug === raw[1] && !body.confirmed_unchanged) {
      return json(
        { detail: "The translation is identical to the AI attempt. If the AI was completely accurate, confirm unchanged, or fix any translation errors." },
        422
      );
    }
    const rAmount = reward(raw[3] as number);
    workPos++;
    currentUser.validated_count++;
    // Note: total_earned_ugx is only credited once the translation is clinically verified by a reviewer

    // Queue into review station for the reviewer to audit
    reviewQueue.unshift({
      id: 200 + workPos,
      noisy_english: raw[0] as string,
      attempted: raw[1] as string,
      clean_lug: body.clean_lug,
      difficulty: raw[2] as any,
      reward_ugx: rAmount,
      validator_name: currentUser.full_name,
      validator_email: currentUser.email,
      validated_by_id: currentUser.id,
      validated_at: new Date().toISOString(),
      verified: false,
      verified_by_name: null,
      verified_at: null,
      exported_at: null,
    });

    return json({ reward_ugx: rAmount });
  }

  if (cleanPath.startsWith("/work/") && cleanPath.endsWith("/skip") && m === "POST") {
    workPos++;
    return json(null, 204);
  }

  // User payment methods & payouts
  if (cleanPath === "/me/payment-methods" && m === "GET") {
    return json(methods.filter((x) => x.user_id === currentUser.id));
  }

  if (cleanPath === "/me/payment-methods" && m === "POST") {
    const userMethods = methods.filter((x) => x.user_id === currentUser.id);
    const pm: MockPaymentMethod = {
      id: "m" + Date.now(),
      user_id: currentUser.id,
      provider: body.provider,
      phone_number: body.phone_number,
      account_name: body.account_name,
      is_default: userMethods.length === 0,
    };
    methods.push(pm);
    return json(pm, 201);
  }

  if (cleanPath.startsWith("/me/payment-methods/") && m === "DELETE") {
    const id = cleanPath.split("/").pop();
    methods = methods.filter((x) => !(x.id === id && x.user_id === currentUser.id));
    return json(null, 204);
  }

  if (cleanPath === "/payouts" && m === "GET") {
    return json(adminPayouts.filter((p) => p.user_id === currentUser.id));
  }

  if (cleanPath === "/payouts" && m === "POST") {
    const pm = methods.find((x) => x.id === body.payment_method_id && x.user_id === currentUser.id);
    if (!pm) return json({ detail: "Choose a registered mobile money account." }, 400);

    const available = getAvailableForUser(currentUser);
    const requestedAmount = (body.amount_ugx && body.amount_ugx > 0) ? body.amount_ugx : available;
    if (requestedAmount < MIN_CASHOUT) {
      return json({ detail: `You need at least UGX ${MIN_CASHOUT.toLocaleString()} to cash out.` }, 400);
    }
    if (requestedAmount > available) {
      return json({ detail: `Requested amount (UGX ${requestedAmount.toLocaleString()}) exceeds your available balance of UGX ${available.toLocaleString()}.` }, 400);
    }

    const p: MockPayout = {
      id: "po-" + Date.now(),
      user_id: currentUser.id,
      user_name: currentUser.full_name,
      user_email: currentUser.email,
      amount_ugx: requestedAmount,
      status: "pending",
      requested_at: new Date().toISOString(),
      provider: pm.provider,
      phone_number: pm.phone_number,
      account_name: pm.account_name,
      sentence_count: Math.max(1, currentUser.validated_count),
      verified_count: currentUser.verified_count,
      accuracy_rate: currentUser.accuracy_rate,
      provider_reference: null,
      rejection_reason: null,
      processed_at: null,
    };
    adminPayouts = [p, ...adminPayouts];
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
      pending_payouts_ugx: adminPayouts.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount_ugx, 0),
      paid_out_ugx: adminPayouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount_ugx, 0),
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

  if (cleanPath.startsWith("/admin/users/") && cleanPath.endsWith("/quality") && m === "GET") {
    const parts = cleanPath.split("/");
    const userId = parts[parts.length - 2];
    const u = mockUsers.find((x) => x.id === userId);
    if (!u) return json({ detail: "User not found" }, 404);

    const userReviews = reviewQueue
      .filter((s) => s.validated_by_id === userId || s.validator_name.toLowerCase() === u.full_name.toLowerCase())
      .map((s) => ({
        id: s.id,
        noisy_english: s.noisy_english,
        attempted: s.attempted,
        clean_lug: s.clean_lug,
        difficulty: s.difficulty,
        reward_ugx: s.reward_ugx,
        verified: s.verified,
        verified_at: s.verified_at,
        verified_by_name: s.verified_by_name,
        validated_at: s.validated_at,
        payout_id: null,
      }));

    return json({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      is_active: u.is_active,
      created_at: u.created_at,
      validated_count: u.validated_count,
      verified_count: u.verified_count,
      accuracy_rate: u.accuracy_rate,
      pending_review_count: Math.max(0, u.validated_count - u.verified_count),
      total_earned_ugx: u.total_earned_ugx,
      paid_out_ugx: u.paid_out_ugx,
      pending_payout_ugx: getPendingForUser(u.id),
      recent_sentences: userReviews,
    });
  }

  if (cleanPath === "/admin/payouts" && m === "GET") {
    return json(adminPayouts);
  }

  if (cleanPath.startsWith("/admin/payouts/") && cleanPath.endsWith("/pay") && m === "POST") {
    const parts = cleanPath.split("/");
    const id = parts[parts.length - 2];
    const payout = adminPayouts.find((p) => p.id === id);
    if (!payout) return json({ detail: "Payout request not found" }, 404);
    payout.status = "paid";
    payout.provider_reference = body.provider_reference || `MOMO-${Math.floor(100000 + Math.random() * 900000)}-UG`;
    payout.processed_at = new Date().toISOString();

    const u = mockUsers.find((x) => x.id === payout.user_id);
    if (u) {
      u.paid_out_ugx += payout.amount_ugx;
      u.pending_ugx = getPendingForUser(u.id);
    }
    return json(payout);
  }

  if (cleanPath.startsWith("/admin/payouts/") && cleanPath.endsWith("/reject") && m === "POST") {
    const parts = cleanPath.split("/");
    const id = parts[parts.length - 2];
    const payout = adminPayouts.find((p) => p.id === id);
    if (!payout) return json({ detail: "Payout request not found" }, 404);
    payout.status = "rejected";
    payout.rejection_reason = body.rejection_reason || "Verification rejected by administrator";
    payout.processed_at = new Date().toISOString();

    const u = mockUsers.find((x) => x.id === payout.user_id);
    if (u) {
      u.pending_ugx = getPendingForUser(u.id);
    }
    return json(payout);
  }

  // Dataset Export endpoints
  if (cleanPath === "/admin/export/stats" && m === "GET") {
    const totalValidated = 278;
    const totalVerified = 186;
    return json({
      total_validated: totalValidated,
      total_verified: totalVerified,
      unexported_verified: 46,
      unexported_validated: 92,
      last_export_at: recentExports[recentExports.length - 1]?.created_at || null,
      total_exports_count: recentExports.length,
      recent_exports: recentExports,
    });
  }

  if (cleanPath === "/admin/export/sentences.csv" && m === "GET") {
    const queryStr = path.includes("?") ? path.split("?")[1] : "";
    const params = new URLSearchParams(queryStr);
    const scope = params.get("scope") || "verified_only";
    const onlyNew = params.get("only_new") === "true";
    const markExported = params.get("mark_exported") === "true";

    let matching = reviewQueue.filter((s) => (scope === "verified_only" ? s.verified : true));
    if (onlyNew) matching = matching.filter((s) => s.exported_at === null);

    const now = new Date().toISOString();
    const filename = `ekyama_${scope}_${onlyNew ? "delta" : "cumulative"}_${now.replace(/[-:]/g, "").slice(0, 15)}.csv`;

    if (markExported) {
      for (const item of matching) item.exported_at = now;
      recentExports.unshift({
        id: "exp-" + Date.now(),
        exported_by_id: currentUser.id,
        exported_by_name: currentUser.full_name,
        scope,
        only_new: onlyNew,
        sentence_count: matching.length,
        file_name: filename,
        created_at: now,
      });
    }

    const headers = [
      "sentence_id",
      "english_prompt",
      "initial_draft",
      "validated_luganda",
      "quality_status",
      "difficulty",
      "validator_name",
      "validator_email",
      "validated_at",
      "verified_by_name",
      "verified_at",
      "exported_at",
    ];
    const csvRows = [headers.join(",")];
    for (const r of matching) {
      csvRows.push([
        r.id,
        JSON.stringify(r.noisy_english),
        JSON.stringify(r.attempted),
        JSON.stringify(r.clean_lug),
        r.verified ? "verified" : "validated",
        r.difficulty,
        JSON.stringify(r.validator_name),
        JSON.stringify(r.validator_email || ""),
        r.validated_at,
        JSON.stringify(r.verified_by_name || ""),
        r.verified_at || "",
        now,
      ].join(","));
    }

    const csvText = "\ufeff" + csvRows.join("\r\n");
    return new Response(csvText, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  // Review station endpoints
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
    item.verified_by_name = currentUser.full_name;
    item.verified_at = new Date().toISOString();

    // Credit validator upon clinical verification
    const valUser = mockUsers.find((u) => u.id === item.validated_by_id || u.email === item.validator_email);
    if (valUser) {
      valUser.verified_count = (valUser.verified_count || 0) + 1;
      valUser.total_earned_ugx += item.reward_ugx;
      valUser.accuracy_rate = Math.round((valUser.verified_count / Math.max(1, valUser.validated_count)) * 1000) / 10;
    }

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
    item.verified_by_name = currentUser.full_name;
    item.verified_at = new Date().toISOString();

    // Credit validator upon clinical verification
    const valUser = mockUsers.find((u) => u.id === item.validated_by_id || u.email === item.validator_email);
    if (valUser) {
      valUser.verified_count = (valUser.verified_count || 0) + 1;
      valUser.total_earned_ugx += item.reward_ugx;
      valUser.accuracy_rate = Math.round((valUser.verified_count / Math.max(1, valUser.validated_count)) * 1000) / 10;
    }

    reviewQueue = reviewQueue.filter((s) => s.id !== id);
    return json(item);
  }

  if (cleanPath.startsWith("/review/") && cleanPath.endsWith("/reject") && m === "POST") {
    const parts = cleanPath.split("/");
    const id = parseInt(parts[parts.length - 2], 10);
    reviewQueue = reviewQueue.filter((s) => s.id !== id);
    return json(null, 204);
  }

  // ------------------------------------------------------------- Inquiries & Support Tickets
  if (cleanPath === "/tickets" && m === "GET") {
    const queryStr = path.includes("?") ? path.split("?")[1] : "";
    const params = new URLSearchParams(queryStr);
    const scope = params.get("scope") || params.get("filter") || (currentUser.role === "validator" ? "my" : "inbox");

    let list: MockTicket[] = [];

    // Privacy rule: Validators can strictly ONLY see tickets they created themselves.
    if (currentUser.role === "validator") {
      list = mockTickets.filter((t) => t.author_id === currentUser.id);
    } else if (scope === "my") {
      // In "My Inquiries", users (even reviewers/admins) see only tickets they authored
      list = mockTickets.filter((t) => t.author_id === currentUser.id);
    } else if (scope === "clinical") {
      // Clinical Queue: only clinical terminology and review dispute tickets
      if (currentUser.role === "reviewer" || currentUser.role === "admin") {
        list = mockTickets.filter((t) => t.target_role === "reviewer");
      } else {
        list = mockTickets.filter((t) => t.author_id === currentUser.id);
      }
    } else if (scope === "ops") {
      // Platform & Ops Queue: only admin tickets (payouts, role requests, general platform questions)
      if (currentUser.role === "admin") {
        list = mockTickets.filter((t) => t.target_role === "admin");
      } else {
        list = mockTickets.filter((t) => t.author_id === currentUser.id);
      }
    } else if (scope === "inbox") {
      if (currentUser.role === "admin") {
        list = mockTickets.filter((t) => t.target_role === "admin" || t.author_id === currentUser.id);
      } else if (currentUser.role === "reviewer") {
        list = mockTickets.filter((t) => t.target_role === "reviewer" || t.author_id === currentUser.id);
      } else {
        list = mockTickets.filter((t) => t.author_id === currentUser.id);
      }
    } else {
      list = mockTickets.filter((t) => t.author_id === currentUser.id);
    }

    const out = list.map((t) => ({
      id: t.id,
      author_id: t.author_id,
      author_name: t.author_name,
      author_email: t.author_email,
      author_role: t.author_role,
      category: t.category,
      target_role: t.target_role,
      subject: t.subject,
      status: t.status,
      sentence_id: t.sentence_id,
      payout_id: t.payout_id,
      created_at: t.created_at,
      updated_at: t.updated_at,
      message_count: t.messages.length,
      last_message_preview: t.messages[t.messages.length - 1]?.message.slice(0, 80) || "",
    }));
    return json(out);
  }

  if (cleanPath === "/tickets" && m === "POST") {
    const targetRole = (body.category === "clinical_terminology" || body.category === "review_dispute") ? "reviewer" : "admin";
    const now = new Date().toISOString();
    const ticketId = "t-" + Date.now();
    const msgId = "tm-" + Date.now();

    const initialMsg: MockTicketMessage = {
      id: msgId,
      ticket_id: ticketId,
      sender_id: currentUser.id,
      sender_name: currentUser.full_name,
      sender_role: currentUser.role,
      message: body.message,
      created_at: now,
    };

    const newTicket: MockTicket = {
      id: ticketId,
      author_id: currentUser.id,
      author_name: currentUser.full_name,
      author_email: currentUser.email,
      author_role: currentUser.role,
      category: body.category,
      target_role: targetRole,
      subject: body.subject,
      status: "open",
      sentence_id: body.sentence_id || null,
      payout_id: body.payout_id || null,
      created_at: now,
      updated_at: now,
      messages: [initialMsg],
    };

    mockTickets.unshift(newTicket);
    return json({
      ...newTicket,
      message_count: 1,
      last_message_preview: body.message.slice(0, 80),
    }, 201);
  }

  if (cleanPath.startsWith("/tickets/") && !cleanPath.endsWith("/messages") && m === "GET") {
    const id = cleanPath.split("/").pop();
    const ticket = mockTickets.find((t) => t.id === id);
    if (!ticket) return json({ detail: "Inquiry not found." }, 404);

    // Enforce role-based access to ticket details
    if (currentUser.role === "validator" && ticket.author_id !== currentUser.id) {
      return json({ detail: "Access denied. You cannot view inquiries that do not concern you." }, 403);
    }
    if (currentUser.role === "reviewer" && ticket.target_role !== "reviewer" && ticket.author_id !== currentUser.id) {
      return json({ detail: "Access denied. Platform & payout inquiries are restricted to administrators." }, 403);
    }

    return json({
      ...ticket,
      message_count: ticket.messages.length,
      last_message_preview: ticket.messages[ticket.messages.length - 1]?.message.slice(0, 80) || "",
    });
  }

  if (cleanPath.startsWith("/tickets/") && cleanPath.endsWith("/messages") && m === "POST") {
    const parts = cleanPath.split("/");
    const id = parts[parts.length - 2];
    const ticket = mockTickets.find((t) => t.id === id);
    if (!ticket) return json({ detail: "Inquiry not found." }, 404);

    if (currentUser.role === "validator" && ticket.author_id !== currentUser.id) {
      return json({ detail: "Access denied." }, 403);
    }
    if (currentUser.role === "reviewer" && ticket.target_role !== "reviewer" && ticket.author_id !== currentUser.id) {
      return json({ detail: "Access denied." }, 403);
    }

    const now = new Date().toISOString();
    const newMsg: MockTicketMessage = {
      id: "tm-" + Date.now(),
      ticket_id: ticket.id,
      sender_id: currentUser.id,
      sender_name: currentUser.full_name,
      sender_role: currentUser.role,
      message: body.message,
      created_at: now,
    };
    ticket.messages.push(newMsg);
    ticket.updated_at = now;
    if (ticket.status === "resolved" && currentUser.id === ticket.author_id) {
      ticket.status = "in_progress";
    }
    return json(newMsg, 201);
  }

  if (cleanPath.startsWith("/tickets/") && m === "PATCH") {
    const id = cleanPath.split("/").pop();
    const ticket = mockTickets.find((t) => t.id === id);
    if (!ticket) return json({ detail: "Inquiry not found." }, 404);

    if (currentUser.role === "validator" && ticket.author_id !== currentUser.id) {
      return json({ detail: "Access denied." }, 403);
    }
    if (currentUser.role === "reviewer" && ticket.target_role !== "reviewer" && ticket.author_id !== currentUser.id) {
      return json({ detail: "Access denied." }, 403);
    }

    if (body.status) ticket.status = body.status;
    ticket.updated_at = new Date().toISOString();
    return json({
      ...ticket,
      message_count: ticket.messages.length,
      last_message_preview: ticket.messages[ticket.messages.length - 1]?.message.slice(0, 80) || "",
    });
  }

  return json({ detail: "Not found" }, 404);
}
