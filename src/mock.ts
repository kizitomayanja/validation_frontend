// In-browser fake of the FastAPI service so the portal runs with VITE_USE_MOCK=true. Same contract as README.md.
const RATE = 2000, MIN_REWARD = 100, MIN_CASHOUT = 5000;
const json = (d: unknown, s = 200) => new Response(s === 204 ? null : JSON.stringify(d), { status: s, headers: { "Content-Type": "application/json" } });
const user = { id: "u1", email: "", full_name: "Demo Validator", role: "validator" };

const queue = [
  ["Do you have any shortness of breath when you climb stairs?", "Olina okuziyira ng'ogenda waggulu ku madaala?", "hard", 0.62],
  ["Have you been bringing up any sputum with the cough?", "Olwaddeko okufuuyira sputum n'ekikolokolo?", "medium", 0.38],
  ["And do you smoke?", "Era onywa taaba?", "easy", 0.05],
  ["Any family history of asthma or allergies?", "Waliwo omuntu mu maka go alina asthma oba allergies?", "medium", 0.3],
].map(([e, a, d, c], i) => ({ id: i + 1, noisy_english: e as string, attempted: a as string, difficulty: d as string, cost: c as number }));

let pos = 0, earned = 0, available = 0, validated = 0;
let methods: any[] = [];
let payouts: any[] = [];
const reward = (cost: number) => Math.max(MIN_REWARD, Math.round(cost * RATE));
const pending = () => payouts.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount_ugx, 0);

export async function mockFetch(path: string, init: RequestInit): Promise<Response> {
  await new Promise((r) => setTimeout(r, 250));
  const m = (init.method ?? "GET").toUpperCase();
  const body = init.body ? JSON.parse(init.body as string) : {};
  const key = `${m} ${path.replace(/\/[0-9a-z-]+(?=\/(submit|skip)$)|\/m\d+$/, "/:id")}`;
  switch (key) {
    case "POST /auth/login": user.email = body.email; return json({ access_token: "a", refresh_token: "r" });
    case "POST /auth/register": user.email = body.email; user.full_name = body.full_name; return json({ access_token: "a", refresh_token: "r" });
    case "POST /auth/password-reset": return json({ message: "If an account exists for that email, password reset instructions will be sent." });
    case "POST /auth/refresh": return json({ access_token: "a", refresh_token: "r" });
    case "POST /auth/logout": return json(null, 204);
    case "GET /me": return json(user);
    case "GET /me/balance":
      return json({ total_earned_ugx: earned, available_ugx: available, pending_ugx: pending(), paid_out_ugx: earned - available - pending(), validated_count: validated, min_cashout_ugx: MIN_CASHOUT });
    case "GET /work/next": {
      const s = queue[pos % queue.length];
      return json({ id: s.id, noisy_english: s.noisy_english, attempted: s.attempted, difficulty: s.difficulty, reward_ugx: reward(s.cost) });
    }
    case "POST /work/:id/submit": {
      const s = queue[pos % queue.length]; pos++; validated++;
      earned += reward(s.cost); available += reward(s.cost);
      return json({ reward_ugx: reward(s.cost) });
    }
    case "POST /work/:id/skip": pos++; return json(null, 204);
    case "GET /me/payment-methods": return json(methods);
    case "POST /me/payment-methods": {
      const pm = { id: "m" + Date.now(), ...body, is_default: methods.length === 0 };
      methods = [...methods, pm]; return json(pm, 201);
    }
    case "DELETE /me/payment-methods/:id": methods = methods.filter((x) => x.id !== path.split("/").pop()); return json(null, 204);
    case "GET /payouts": return json(payouts);
    case "POST /payouts": {
      const pm = methods.find((x) => x.id === body.payment_method_id);
      if (!pm) return json({ detail: "Choose a mobile money account." }, 400);
      if (available < MIN_CASHOUT) return json({ detail: `You need at least UGX ${MIN_CASHOUT} to cash out.` }, 400);
      const p = { id: "p" + Date.now(), amount_ugx: available, status: "pending", requested_at: new Date().toISOString(), provider: pm.provider, phone_number: pm.phone_number, account_name: pm.account_name };
      payouts = [p, ...payouts]; available = 0; return json(p, 201);
    }
  }
  return json({ detail: "Not found" }, 404);
}
