// Wedding planner API for Vercel.
// Stores the plan in Upstash Redis (add it from the Vercel Marketplace; the
// integration sets the connection variables for you). Anyone with the site's
// link can view and edit the plan.

const COLS = ["tasks", "budget", "vendors", "guests"];
const KEY = (col) => `wedding:${col}`;
const META = "wedding:meta";
const SEEDED = "wedding:seeded";
const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
const MAX_ITEMS = 2000;

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function redis(commands) {
  const cfg = redisConfig();
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands)
  });
  if (!res.ok) throw new Error(`Database error (${res.status})`);
  const out = await res.json();
  for (const r of out) if (r && r.error) throw new Error(`Database error: ${r.error}`);
  return out.map((r) => r.result);
}

// Keep only plain values a planner row needs.
function clean(data) {
  const out = {};
  if (!data || typeof data !== "object" || Array.isArray(data)) return out;
  for (const [k, v] of Object.entries(data)) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(k)) continue;
    if (v === null || typeof v === "boolean") out[k] = v;
    else if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "string") out[k] = v.slice(0, 500);
  }
  return out;
}

function hashToList(flat) {
  // HGETALL over REST returns [field, value, field, value, ...]
  const list = [];
  for (let i = 0; i + 1 < (flat || []).length; i += 2) {
    try { list.push(Object.assign(JSON.parse(flat[i + 1]), { id: flat[i] })); } catch (e) {}
  }
  return list;
}

async function readPlan() {
  const results = await redis([["GET", META], ...COLS.map((c) => ["HGETALL", KEY(c)])]);
  const plan = { meta: {} };
  try { plan.meta = results[0] ? JSON.parse(results[0]) : {}; } catch (e) {}
  COLS.forEach((c, i) => (plan[c] = hashToList(results[i + 1])));
  return plan;
}

async function seedExamples() {
  // Runs once, the first time the plan is opened.
  const [first] = await redis([["SET", SEEDED, "1", "NX"]]);
  if (first !== "OK") return;
  const ex = (o, i) => JSON.stringify(Object.assign({ created: i + 1, example: true }, o));
  const tasks = [
    ["Set a total budget together", "12m", true], ["Draft a rough guest count", "12m", true],
    ["Tour and book the venue", "12m", false], ["Book photographer", "9m", false],
    ["Choose caterer and schedule a tasting", "9m", false], ["Send save-the-dates", "6m", false],
    ["Order attire", "6m", false], ["Mail invitations", "3m", false],
    ["Get the marriage license", "1m", false], ["Final headcount to caterer", "final", false],
    ["Pack an emergency kit for the day", "week", false]
  ];
  const budget = [
    ["Venue", 9000, 8500, 4000], ["Catering and bar", 9500, null, 0], ["Photography", 3500, 3800, 1000],
    ["Flowers", 2000, null, 0], ["Attire", 2500, null, 0], ["Music / DJ", 1500, null, 0]
  ];
  const vendors = [
    ["Willow Creek Barn", "Venue", "events@example.com", 8500, "deposit"],
    ["Golden Hour Photo", "Photographer", "(555) 010-2234", 3800, "booked"],
    ["Table & Vine Catering", "Caterer", "hello@example.com", 9200, "contacted"],
    ["Fern & Stem", "Florist", "", null, "researching"]
  ];
  const guests = [
    ["The Parker family", 4, "p1", "yes", "2 chicken, 2 kids", "3"],
    ["Jordan Lee & guest", 2, "p2", "pending", "", ""],
    ["Aunt Maria", 1, "p1", "yes", "Vegetarian", "1"],
    ["College roommates", 3, "both", "no", "", ""]
  ];
  const cmds = [
    ["SET", META, JSON.stringify({ partner1: "Sam", partner2: "Riley", date: "2027-06-12", venue: "Willow Creek Barn", city: "Your city", totalBudget: 30000, example: true })],
    ["HSET", KEY("tasks"), ...tasks.flatMap(([title, phase, done], i) => [`ex-t${i + 1}`, ex({ title, phase, done }, i)])],
    ["HSET", KEY("budget"), ...budget.flatMap(([category, estimate, actual, paid], i) => [`ex-b${i + 1}`, ex({ category, estimate, actual, paid }, i)])],
    ["HSET", KEY("vendors"), ...vendors.flatMap(([name, category, contact, cost, status], i) => [`ex-v${i + 1}`, ex({ name, category, contact, cost, status }, i)])],
    ["HSET", KEY("guests"), ...guests.flatMap(([name, party, side, rsvp, meal, table], i) => [`ex-g${i + 1}`, ex({ name, party, side, rsvp, meal, table }, i)])]
  ];
  await redis(cmds);
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (!redisConfig()) {
    return res.status(500).json({ error: "Connect an Upstash Redis database to this project in Vercel, then redeploy." });
  }

  try {
    if (req.method === "GET") {
      await seedExamples();
      return res.status(200).json(await readPlan());
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const { op, col, id } = body;

    if (op === "meta") {
      await redis([["SET", META, JSON.stringify(clean(body.data))]]);
      return res.status(200).json({ ok: true });
    }

    if (op === "clearExamples") {
      const plan = await readPlan();
      const cmds = [];
      for (const c of COLS) {
        const ids = plan[c].filter((r) => r.example).map((r) => r.id);
        if (ids.length) cmds.push(["HDEL", KEY(c), ...ids]);
      }
      if (plan.meta.example) cmds.push(["SET", META, JSON.stringify({ totalBudget: plan.meta.totalBudget ?? null })]);
      if (cmds.length) await redis(cmds);
      return res.status(200).json({ ok: true });
    }

    if (!COLS.includes(col) || !ID_RE.test(String(id || ""))) {
      return res.status(400).json({ error: "That change wasn't understood. Reload the page and try again." });
    }

    if (op === "add") {
      const [count] = await redis([["HLEN", KEY(col)]]);
      if (count >= MAX_ITEMS) return res.status(400).json({ error: "This list is full. Delete some entries first." });
      await redis([["HSET", KEY(col), id, JSON.stringify(clean(body.data))]]);
    } else if (op === "update") {
      const [current] = await redis([["HGET", KEY(col), id]]);
      if (!current) return res.status(404).json({ error: "That entry was deleted on another device." });
      const merged = Object.assign(JSON.parse(current), clean(body.data));
      await redis([["HSET", KEY(col), id, JSON.stringify(merged)]]);
    } else if (op === "remove") {
      await redis([["HDEL", KEY(col), id]]);
    } else {
      return res.status(400).json({ error: "Unknown change." });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Couldn't save to the database. Try again in a moment." });
  }
};
