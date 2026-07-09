/**
 * Demo-workspace seeder.
 *
 * Builds "Harbor & Co." — a fictional B2B sales team with a believable pipeline:
 * varied deal sizes, wins and losses spread over the past four months, notes,
 * and a full activity trail. Used by `prisma db seed` and by the nightly
 * demo-reset cron so shared demo logins always find fresh data.
 *
 * All dates are relative to "now" so charts and "overdue" badges stay alive.
 */
import { hashSync } from "bcryptjs";
import { randomBytes } from "node:crypto";

import { DEFAULT_STAGES } from "../../lib/stages";
import type { PrismaClient } from "../../generated/prisma/client";

export const DEMO_WORKSPACE_SLUG = "demo";
export const DEMO_ADMIN_EMAIL = "demo@foresail.app";
export const DEMO_VIEWER_EMAIL = "viewer@foresail.app";
export const DEMO_PASSWORD = "demo1234";

const DAY = 24 * 60 * 60 * 1000;

/** Deterministic PRNG so reseeds produce stable-looking (but dated-fresh) data. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260709);
const between = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const daysAhead = (n: number) => new Date(Date.now() + n * DAY);

// ---------- Static demo content ----------

const PEOPLE = [
  { key: "founder", name: "Prisha Nair", email: "prisha@foresail.app", role: "OWNER" },
  { key: "demo", name: "Demo Admin", email: DEMO_ADMIN_EMAIL, role: "ADMIN" },
  { key: "maya", name: "Maya Iyer", email: "maya@foresail.app", role: "MEMBER" },
  { key: "tom", name: "Tom Becker", email: "tom@foresail.app", role: "MEMBER" },
  { key: "sofia", name: "Sofia Reyes", email: "sofia@foresail.app", role: "MEMBER" },
  { key: "viewer", name: "Demo Viewer", email: DEMO_VIEWER_EMAIL, role: "VIEWER" },
] as const;

const COMPANIES = [
  { name: "Northwind Logistics", domain: "northwindlogistics.com", industry: "Logistics", size: "201-500", location: "Rotterdam, NL" },
  { name: "Aster Health", domain: "asterhealth.io", industry: "Healthcare", size: "51-200", location: "Boston, US" },
  { name: "Brightpath Learning", domain: "brightpath.edu", industry: "Education", size: "11-50", location: "Toronto, CA" },
  { name: "Cobalt Analytics", domain: "cobaltanalytics.com", industry: "Software", size: "51-200", location: "Berlin, DE" },
  { name: "Juniper & Sage", domain: "juniperandsage.com", industry: "Retail", size: "11-50", location: "Portland, US" },
  { name: "Meridian Foods", domain: "meridianfoods.co", industry: "Food & Beverage", size: "500+", location: "Chicago, US" },
  { name: "Pinewood Robotics", domain: "pinewoodrobotics.com", industry: "Manufacturing", size: "51-200", location: "Nagoya, JP" },
  { name: "Quartz Financial", domain: "quartzfin.com", industry: "Financial Services", size: "201-500", location: "London, UK" },
  { name: "Solstice Energy", domain: "solstice.energy", industry: "Energy", size: "201-500", location: "Austin, US" },
  { name: "Tidewater Shipping", domain: "tidewatershipping.com", industry: "Maritime", size: "500+", location: "Singapore, SG" },
  { name: "Umbra Security", domain: "umbrasec.com", industry: "Cybersecurity", size: "11-50", location: "Tel Aviv, IL" },
  { name: "Verdant Farms", domain: "verdantfarms.ag", industry: "Agriculture", size: "51-200", location: "Pune, IN" },
  { name: "Willow Interactive", domain: "willowinteractive.com", industry: "Media", size: "11-50", location: "Melbourne, AU" },
  { name: "Zephyr Airlines", domain: "zephyrair.com", industry: "Aviation", size: "500+", location: "Dubai, AE" },
] as const;

const CONTACTS: ReadonlyArray<{
  name: string;
  title: string;
  company: string;
  emailLocal: string;
  phone?: string;
}> = [
  { name: "Elena Visser", title: "VP Operations", company: "Northwind Logistics", emailLocal: "elena.visser", phone: "+31 10 555 0141" },
  { name: "Ruben Smit", title: "Procurement Lead", company: "Northwind Logistics", emailLocal: "ruben.smit" },
  { name: "Dr. Sarah Okafor", title: "Chief Medical Officer", company: "Aster Health", emailLocal: "s.okafor", phone: "+1 617 555 0102" },
  { name: "James Liang", title: "Head of IT", company: "Aster Health", emailLocal: "j.liang" },
  { name: "Priya Raman", title: "Director of Curriculum", company: "Brightpath Learning", emailLocal: "priya" },
  { name: "Marcus Feld", title: "CTO", company: "Cobalt Analytics", emailLocal: "marcus", phone: "+49 30 555 0186" },
  { name: "Anke Bauer", title: "Data Platform Lead", company: "Cobalt Analytics", emailLocal: "anke.bauer" },
  { name: "Hannah Cole", title: "Co-founder", company: "Juniper & Sage", emailLocal: "hannah" },
  { name: "Victor Osei", title: "Supply Chain Director", company: "Meridian Foods", emailLocal: "v.osei", phone: "+1 312 555 0119" },
  { name: "Keiko Tanabe", title: "Plant Manager", company: "Pinewood Robotics", emailLocal: "k.tanabe" },
  { name: "Hiroshi Mori", title: "Automation Engineer", company: "Pinewood Robotics", emailLocal: "h.mori" },
  { name: "Oliver Grant", title: "Head of Risk", company: "Quartz Financial", emailLocal: "o.grant", phone: "+44 20 7946 0958" },
  { name: "Amelia Hart", title: "COO", company: "Quartz Financial", emailLocal: "a.hart" },
  { name: "Dana Whitfield", title: "VP Engineering", company: "Solstice Energy", emailLocal: "dana.w" },
  { name: "Cheng Wei", title: "Fleet Director", company: "Tidewater Shipping", emailLocal: "cheng.wei", phone: "+65 6555 0147" },
  { name: "Noa Peretz", title: "CEO", company: "Umbra Security", emailLocal: "noa" },
  { name: "Arjun Kulkarni", title: "Operations Head", company: "Verdant Farms", emailLocal: "arjun", phone: "+91 20 5550 1122" },
  { name: "Ishita Deshpande", title: "Finance Controller", company: "Verdant Farms", emailLocal: "ishita" },
  { name: "Georgia Lam", title: "Managing Partner", company: "Willow Interactive", emailLocal: "georgia" },
  { name: "Faisal Rahman", title: "Head of Digital", company: "Zephyr Airlines", emailLocal: "f.rahman", phone: "+971 4 555 0163" },
  { name: "Lena Kowalski", title: "Procurement Manager", company: "Zephyr Airlines", emailLocal: "l.kowalski" },
  { name: "Sam Whittaker", title: "Warehouse Systems Lead", company: "Meridian Foods", emailLocal: "s.whittaker" },
];

type SeedDeal = {
  title: string;
  company: string;
  contact?: string;
  stage: (typeof DEFAULT_STAGES)[number]["name"];
  valueCents: number;
  owner: "demo" | "maya" | "tom" | "sofia";
  lostReason?: string;
};

const k = (n: number) => n * 100_000; // $n,000 in cents

const DEALS: readonly SeedDeal[] = [
  // ----- Lead -----
  { title: "Zephyr Airlines — Crew scheduling pilot", company: "Zephyr Airlines", contact: "Faisal Rahman", stage: "Lead", valueCents: k(120), owner: "maya" },
  { title: "Juniper & Sage — POS integration", company: "Juniper & Sage", contact: "Hannah Cole", stage: "Lead", valueCents: k(8), owner: "sofia" },
  { title: "Verdant Farms — Yield dashboard", company: "Verdant Farms", contact: "Arjun Kulkarni", stage: "Lead", valueCents: k(14), owner: "tom" },
  { title: "Willow Interactive — Team seats (10)", company: "Willow Interactive", contact: "Georgia Lam", stage: "Lead", valueCents: k(6), owner: "demo" },
  { title: "Aster Health — Patient intake add-on", company: "Aster Health", contact: "James Liang", stage: "Lead", valueCents: k(22), owner: "maya" },
  { title: "Meridian Foods — Cold chain monitoring", company: "Meridian Foods", contact: "Sam Whittaker", stage: "Lead", valueCents: k(45), owner: "tom" },
  { title: "Umbra Security — SOC reporting suite", company: "Umbra Security", contact: "Noa Peretz", stage: "Lead", valueCents: k(18), owner: "sofia" },
  { title: "Brightpath Learning — Campus expansion", company: "Brightpath Learning", contact: "Priya Raman", stage: "Lead", valueCents: k(11), owner: "demo" },

  // ----- Qualified -----
  { title: "Cobalt Analytics — Enterprise plan", company: "Cobalt Analytics", contact: "Marcus Feld", stage: "Qualified", valueCents: k(96), owner: "maya" },
  { title: "Northwind Logistics — Route optimization", company: "Northwind Logistics", contact: "Elena Visser", stage: "Qualified", valueCents: k(64), owner: "tom" },
  { title: "Quartz Financial — Compliance module", company: "Quartz Financial", contact: "Oliver Grant", stage: "Qualified", valueCents: k(52), owner: "sofia" },
  { title: "Solstice Energy — Field ops mobile", company: "Solstice Energy", contact: "Dana Whitfield", stage: "Qualified", valueCents: k(38), owner: "demo" },
  { title: "Pinewood Robotics — Line telemetry", company: "Pinewood Robotics", contact: "Keiko Tanabe", stage: "Qualified", valueCents: k(71), owner: "maya" },
  { title: "Aster Health — Records migration", company: "Aster Health", contact: "Dr. Sarah Okafor", stage: "Qualified", valueCents: k(33), owner: "tom" },
  { title: "Willow Interactive — Client portal", company: "Willow Interactive", contact: "Georgia Lam", stage: "Qualified", valueCents: k(9), owner: "sofia" },

  // ----- Proposal -----
  { title: "Tidewater Shipping — Fleet tracking rollout", company: "Tidewater Shipping", contact: "Cheng Wei", stage: "Proposal", valueCents: k(140), owner: "maya" },
  { title: "Meridian Foods — Warehouse suite", company: "Meridian Foods", contact: "Victor Osei", stage: "Proposal", valueCents: k(85), owner: "tom" },
  { title: "Umbra Security — MSSP bundle", company: "Umbra Security", contact: "Noa Peretz", stage: "Proposal", valueCents: k(27), owner: "sofia" },
  { title: "Brightpath Learning — LMS annual license", company: "Brightpath Learning", contact: "Priya Raman", stage: "Proposal", valueCents: k(19), owner: "demo" },
  { title: "Verdant Farms — Traceability platform", company: "Verdant Farms", contact: "Ishita Deshpande", stage: "Proposal", valueCents: k(31), owner: "maya" },
  { title: "Northwind Logistics — Customs automation", company: "Northwind Logistics", contact: "Ruben Smit", stage: "Proposal", valueCents: k(48), owner: "tom" },

  // ----- Negotiation -----
  { title: "Quartz Financial — Group-wide rollout", company: "Quartz Financial", contact: "Amelia Hart", stage: "Negotiation", valueCents: k(175), owner: "maya" },
  { title: "Solstice Energy — Grid analytics", company: "Solstice Energy", contact: "Dana Whitfield", stage: "Negotiation", valueCents: k(92), owner: "sofia" },
  { title: "Cobalt Analytics — Data pipeline add-on", company: "Cobalt Analytics", contact: "Anke Bauer", stage: "Negotiation", valueCents: k(24), owner: "tom" },
  { title: "Zephyr Airlines — Ground ops suite", company: "Zephyr Airlines", contact: "Lena Kowalski", stage: "Negotiation", valueCents: k(110), owner: "demo" },

  // ----- Won -----
  { title: "Pinewood Robotics — Pilot line retrofit", company: "Pinewood Robotics", contact: "Hiroshi Mori", stage: "Won", valueCents: k(58), owner: "maya" },
  { title: "Aster Health — Clinic scheduling", company: "Aster Health", contact: "Dr. Sarah Okafor", stage: "Won", valueCents: k(41), owner: "tom" },
  { title: "Northwind Logistics — Dock scheduling", company: "Northwind Logistics", contact: "Elena Visser", stage: "Won", valueCents: k(36), owner: "sofia" },
  { title: "Juniper & Sage — Inventory starter", company: "Juniper & Sage", contact: "Hannah Cole", stage: "Won", valueCents: k(7), owner: "demo" },
  { title: "Meridian Foods — QA checklists", company: "Meridian Foods", contact: "Victor Osei", stage: "Won", valueCents: k(23), owner: "maya" },
  { title: "Tidewater Shipping — Port ops pilot", company: "Tidewater Shipping", contact: "Cheng Wei", stage: "Won", valueCents: k(65), owner: "tom" },
  { title: "Brightpath Learning — Assessment tools", company: "Brightpath Learning", contact: "Priya Raman", stage: "Won", valueCents: k(12), owner: "sofia" },
  { title: "Umbra Security — Endpoint audit", company: "Umbra Security", contact: "Noa Peretz", stage: "Won", valueCents: k(16), owner: "demo" },
  { title: "Willow Interactive — Studio license", company: "Willow Interactive", contact: "Georgia Lam", stage: "Won", valueCents: k(8), owner: "maya" },
  { title: "Verdant Farms — Sensor network phase 1", company: "Verdant Farms", contact: "Arjun Kulkarni", stage: "Won", valueCents: k(29), owner: "tom" },

  // ----- Lost -----
  { title: "Quartz Financial — Branch analytics", company: "Quartz Financial", contact: "Oliver Grant", stage: "Lost", valueCents: k(44), owner: "sofia", lostReason: "Chose competitor" },
  { title: "Zephyr Airlines — Loyalty revamp", company: "Zephyr Airlines", contact: "Faisal Rahman", stage: "Lost", valueCents: k(88), owner: "maya", lostReason: "Budget cut" },
  { title: "Cobalt Analytics — Training package", company: "Cobalt Analytics", contact: "Marcus Feld", stage: "Lost", valueCents: k(10), owner: "tom", lostReason: "No decision" },
  { title: "Solstice Energy — Legacy migration", company: "Solstice Energy", contact: "Dana Whitfield", stage: "Lost", valueCents: k(52), owner: "demo", lostReason: "Timing — revisit next FY" },
  { title: "Meridian Foods — Supplier portal", company: "Meridian Foods", contact: "Sam Whittaker", stage: "Lost", valueCents: k(30), owner: "sofia", lostReason: "Went in-house" },
  { title: "Aster Health — Telehealth add-on", company: "Aster Health", contact: "James Liang", stage: "Lost", valueCents: k(26), owner: "maya", lostReason: "Chose competitor" },
  { title: "Tidewater Shipping — Crew welfare app", company: "Tidewater Shipping", contact: "Cheng Wei", stage: "Lost", valueCents: k(15), owner: "tom", lostReason: "No budget owner" },
];

const NOTE_SNIPPETS: ReadonlyArray<{ deal: string; notes: string[] }> = [
  {
    deal: "Quartz Financial — Group-wide rollout",
    notes: [
      "Amelia wants a phased rollout: risk team first, then the three retail branches. Legal is reviewing the DPA.",
      "Procurement pushed back on the multi-year discount — sent revised terms with an opt-out at month 18.",
      "Verbal yes from the steering committee. Waiting on signature by end of month.",
    ],
  },
  {
    deal: "Tidewater Shipping — Fleet tracking rollout",
    notes: [
      "Cheng confirmed 78 vessels in scope. Their IT wants read-only API access before committing.",
      "Sent proposal v2 with the harbor-side hardware bundled. Decision expected after their board meets.",
    ],
  },
  {
    deal: "Cobalt Analytics — Enterprise plan",
    notes: [
      "Marcus asked for SSO and audit exports — both on our roadmap this quarter, flagged to product.",
      "Anke ran the pilot with the data team; feedback doc is strongly positive.",
    ],
  },
  {
    deal: "Zephyr Airlines — Ground ops suite",
    notes: [
      "Lena is comparing us against the incumbent's renewal. Our edge is turnaround analytics — lead with it.",
      "Redlines received from legal, nothing structural. Targeting signature this month.",
    ],
  },
  {
    deal: "Northwind Logistics — Route optimization",
    notes: ["Elena wants a two-week trial on the Benelux routes before widening scope."],
  },
  {
    deal: "Meridian Foods — Warehouse suite",
    notes: ["Walked Victor through the picking workflow demo — asked for a costed option with barcode scanners included."],
  },
  {
    deal: "Solstice Energy — Grid analytics",
    notes: ["Their VP Eng wants uptime SLAs in the MSA. Escalated to our legal for standard 99.9% language."],
  },
  {
    deal: "Pinewood Robotics — Line telemetry",
    notes: ["Keiko's team measured 4.2% scrap reduction in the pilot cell. Building the ROI slide together."],
  },
  {
    deal: "Aster Health — Records migration",
    notes: ["Compliance call done — they need BAA before any PHI touches the platform. Template sent."],
  },
  {
    deal: "Verdant Farms — Traceability platform",
    notes: ["Ishita asked for pricing in INR and a local support window. Checked with finance — both fine."],
  },
];

// ---------- Helpers ----------

async function upsertUser(
  prisma: PrismaClient,
  data: { name: string; email: string; password?: string },
) {
  const passwordHash = hashSync(data.password ?? randomBytes(24).toString("hex"), 12);
  return prisma.user.upsert({
    where: { email: data.email },
    update: { name: data.name },
    create: {
      name: data.name,
      email: data.email,
      passwordHash,
      emailVerified: new Date(),
    },
  });
}

// ---------- Main seeder ----------

export async function seedDemoWorkspace(prisma: PrismaClient) {
  // 1. Users (stable across reseeds — only demo accounts get a known password)
  const users: Record<string, { id: string }> = {};
  for (const person of PEOPLE) {
    const isDemoLogin = person.email === DEMO_ADMIN_EMAIL || person.email === DEMO_VIEWER_EMAIL;
    users[person.key] = await upsertUser(prisma, {
      name: person.name,
      email: person.email,
      password: isDemoLogin ? DEMO_PASSWORD : undefined,
    });
  }

  // 2. Recreate the workspace from scratch (cascades wipe all demo data)
  await prisma.workspace.deleteMany({ where: { slug: DEMO_WORKSPACE_SLUG } });
  const workspace = await prisma.workspace.create({
    data: {
      name: "Harbor & Co.",
      slug: DEMO_WORKSPACE_SLUG,
      currency: "USD",
      isDemo: true,
      memberships: {
        create: PEOPLE.map((p) => ({
          userId: users[p.key]!.id,
          role: p.role,
        })),
      },
    },
  });

  // 3. Stages
  const stages = await prisma.stage.createManyAndReturn({
    data: DEFAULT_STAGES.map((s, i) => ({
      workspaceId: workspace.id,
      name: s.name,
      order: i,
      probability: s.probability,
      color: s.color,
      isWon: s.isWon,
      isLost: s.isLost,
    })),
  });
  const stageByName = new Map(stages.map((s) => [s.name, s]));

  // 4. Companies
  const companies = await prisma.company.createManyAndReturn({
    data: COMPANIES.map((c) => ({
      workspaceId: workspace.id,
      name: c.name,
      domain: c.domain,
      industry: c.industry,
      size: c.size,
      location: c.location,
      createdAt: daysAgo(between(60, 140)),
    })),
  });
  const companyByName = new Map(companies.map((c) => [c.name, c]));

  // 5. Contacts
  const contacts = await prisma.contact.createManyAndReturn({
    data: CONTACTS.map((c) => {
      const company = companyByName.get(c.company);
      return {
        workspaceId: workspace.id,
        companyId: company?.id ?? null,
        name: c.name,
        title: c.title,
        email: `${c.emailLocal}@${COMPANIES.find((co) => co.name === c.company)?.domain ?? "example.com"}`,
        phone: c.phone ?? null,
        createdAt: daysAgo(between(40, 130)),
      };
    }),
  });
  const contactByName = new Map(contacts.map((c) => [c.name, c]));

  // 6. Deals + activity trail
  const positionByStage = new Map<string, number>();
  type ActivityRow = {
    workspaceId: string;
    actorId: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    entityLabel: string;
    meta?: object;
    createdAt: Date;
  };
  const activities: ActivityRow[] = [];

  for (const seed of DEALS) {
    const stage = stageByName.get(seed.stage)!;
    const company = companyByName.get(seed.company);
    const contact = seed.contact ? contactByName.get(seed.contact) : undefined;
    const owner = users[seed.owner]!;
    const isClosed = stage.isWon || stage.isLost;

    const createdDaysAgo = between(20, 120);
    const createdAt = daysAgo(createdDaysAgo);
    const closedAt = isClosed ? daysAgo(between(1, Math.max(2, createdDaysAgo - 8))) : null;
    const expectedCloseDate = isClosed
      ? closedAt
      : daysAhead(between(-15, 140)); // some open deals are overdue on purpose

    const position = (positionByStage.get(stage.id) ?? 0) + 1024;
    positionByStage.set(stage.id, position);

    const deal = await prisma.deal.create({
      data: {
        workspaceId: workspace.id,
        title: seed.title,
        valueCents: seed.valueCents,
        stageId: stage.id,
        companyId: company?.id ?? null,
        contactId: contact?.id ?? null,
        ownerId: owner.id,
        expectedCloseDate,
        position,
        closedAt,
        lostReason: seed.lostReason ?? null,
        createdAt,
        updatedAt: closedAt ?? daysAgo(between(0, Math.min(createdDaysAgo, 21))),
      },
    });

    activities.push({
      workspaceId: workspace.id,
      actorId: owner.id,
      action: "deal.created",
      entityType: "deal",
      entityId: deal.id,
      entityLabel: deal.title,
      meta: { stage: "Lead", valueCents: seed.valueCents },
      createdAt,
    });

    // Simulate the journey through intermediate stages
    const journey = ["Lead", "Qualified", "Proposal", "Negotiation"];
    const finalIndex = isClosed ? journey.length : journey.indexOf(seed.stage);
    const hops = Math.max(0, isClosed ? between(1, 4) : finalIndex);
    const endTime = (closedAt ?? new Date()).getTime();
    for (let h = 1; h <= hops; h++) {
      const from = journey[Math.min(h - 1, journey.length - 1)]!;
      const to = h === hops && isClosed ? seed.stage : journey[Math.min(h, journey.length - 1)]!;
      if (from === to) continue;
      const t = createdAt.getTime() + ((endTime - createdAt.getTime()) * h) / (hops + 1);
      activities.push({
        workspaceId: workspace.id,
        actorId: owner.id,
        action: stage.isWon && to === "Won" ? "deal.won" : stage.isLost && to === "Lost" ? "deal.lost" : "deal.stage_changed",
        entityType: "deal",
        entityId: deal.id,
        entityLabel: deal.title,
        meta: { from, to },
        createdAt: new Date(t),
      });
    }

    // Notes
    const noteSet = NOTE_SNIPPETS.find((n) => n.deal === seed.title);
    if (noteSet) {
      let t = createdAt.getTime() + DAY * 2;
      for (const body of noteSet.notes) {
        t += between(1, 9) * DAY;
        const at = new Date(Math.min(t, Date.now() - DAY));
        await prisma.note.create({
          data: { dealId: deal.id, authorId: owner.id, body, createdAt: at },
        });
        activities.push({
          workspaceId: workspace.id,
          actorId: owner.id,
          action: "note.created",
          entityType: "deal",
          entityId: deal.id,
          entityLabel: deal.title,
          createdAt: at,
        });
      }
    }
  }

  // A few company/contact creation events so the log isn't deal-only
  for (const c of companies.slice(0, 6)) {
    activities.push({
      workspaceId: workspace.id,
      actorId: users["demo"]!.id,
      action: "company.created",
      entityType: "company",
      entityId: c.id,
      entityLabel: c.name,
      createdAt: c.createdAt,
    });
  }
  for (const c of contacts.slice(0, 8)) {
    activities.push({
      workspaceId: workspace.id,
      actorId: users["maya"]!.id,
      action: "contact.created",
      entityType: "contact",
      entityId: c.id,
      entityLabel: c.name,
      createdAt: c.createdAt,
    });
  }

  await prisma.activityLog.createMany({ data: activities });

  return {
    workspaceId: workspace.id,
    counts: {
      users: PEOPLE.length,
      companies: companies.length,
      contacts: contacts.length,
      deals: DEALS.length,
      activities: activities.length,
    },
  };
}

// ---------- Starter data for brand-new workspaces ----------

/** Small, obviously-sample dataset a new user can load from the empty state. */
export async function seedSampleData(prisma: PrismaClient, workspaceId: string, userId: string) {
  const stages = await prisma.stage.findMany({ where: { workspaceId }, orderBy: { order: "asc" } });
  const byName = new Map(stages.map((s) => [s.name, s]));
  const lead = byName.get("Lead") ?? stages[0];
  const qualified = byName.get("Qualified") ?? stages[1] ?? lead;
  const proposal = byName.get("Proposal") ?? stages[2] ?? lead;
  const won = stages.find((s) => s.isWon);
  if (!lead || !qualified || !proposal) return;

  const sampleCompanies = await prisma.company.createManyAndReturn({
    data: [
      { workspaceId, name: "Acme Industries", domain: "acme.example", industry: "Manufacturing", size: "201-500", location: "Springfield, US" },
      { workspaceId, name: "Globex Corporation", domain: "globex.example", industry: "Software", size: "51-200", location: "Copenhagen, DK" },
      { workspaceId, name: "Initech Solutions", domain: "initech.example", industry: "Consulting", size: "11-50", location: "Austin, US" },
      { workspaceId, name: "Stark Shipping", domain: "stark.example", industry: "Logistics", size: "500+", location: "Hamburg, DE" },
    ],
  });
  const [acme, globex, initech, stark] = sampleCompanies;

  const sampleContacts = await prisma.contact.createManyAndReturn({
    data: [
      { workspaceId, companyId: acme?.id, name: "Jane Cooper", title: "VP Operations", email: "jane@acme.example" },
      { workspaceId, companyId: globex?.id, name: "Magnus Holm", title: "CTO", email: "magnus@globex.example" },
      { workspaceId, companyId: initech?.id, name: "Renee Alvarez", title: "Managing Partner", email: "renee@initech.example" },
      { workspaceId, companyId: stark?.id, name: "Karl Brandt", title: "Fleet Director", email: "karl@stark.example" },
      { workspaceId, companyId: acme?.id, name: "Devon Price", title: "Procurement Lead", email: "devon@acme.example" },
      { workspaceId, companyId: globex?.id, name: "Sille Nygaard", title: "Head of Data", email: "sille@globex.example" },
    ],
  });

  const dealRows = [
    { title: "Acme Industries — Plant analytics pilot", companyId: acme?.id, contactId: sampleContacts[0]?.id, stage: lead, valueCents: k(24) },
    { title: "Globex — Enterprise license", companyId: globex?.id, contactId: sampleContacts[1]?.id, stage: qualified, valueCents: k(78) },
    { title: "Initech — Advisory retainer", companyId: initech?.id, contactId: sampleContacts[2]?.id, stage: proposal, valueCents: k(18) },
    { title: "Stark Shipping — Fleet rollout", companyId: stark?.id, contactId: sampleContacts[3]?.id, stage: qualified, valueCents: k(105) },
    { title: "Acme Industries — Support upgrade", companyId: acme?.id, contactId: sampleContacts[4]?.id, stage: lead, valueCents: k(9) },
    { title: "Globex — Data pipeline add-on", companyId: globex?.id, contactId: sampleContacts[5]?.id, stage: proposal, valueCents: k(32) },
    ...(won ? [{ title: "Initech — Starter package", companyId: initech?.id, contactId: sampleContacts[2]?.id, stage: won, valueCents: k(12) }] : []),
  ];

  let position = 0;
  for (const row of dealRows) {
    position += 1024;
    const isWonStage = row.stage.isWon;
    const deal = await prisma.deal.create({
      data: {
        workspaceId,
        title: row.title,
        valueCents: row.valueCents,
        stageId: row.stage.id,
        companyId: row.companyId ?? null,
        contactId: row.contactId ?? null,
        ownerId: userId,
        expectedCloseDate: isWonStage ? daysAgo(6) : daysAhead(between(14, 90)),
        position,
        closedAt: isWonStage ? daysAgo(6) : null,
        createdAt: daysAgo(between(3, 30)),
      },
    });
    await prisma.activityLog.create({
      data: {
        workspaceId,
        actorId: userId,
        action: "deal.created",
        entityType: "deal",
        entityId: deal.id,
        entityLabel: deal.title,
        meta: { sample: true },
        createdAt: deal.createdAt,
      },
    });
  }
}
