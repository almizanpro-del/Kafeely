/**
 * Kafeely — database seed.
 * Run: bun prisma/seed.ts
 * Deterministic seed (fixed RNG) so demo data is stable across resets.
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";
import { demoPdf } from "./pdf";

const db = new PrismaClient();

// ── deterministic RNG ────────────────────────────────────────────────
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261112);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const days = (n: number) => new Date(Date.now() + n * 86400000);
const hash = (pw: string) => {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(pw, salt, 64).toString("hex")}`;
};
const DEMO_PW = hash("Kafeely@2026");

async function main() {
  console.log("Seeding Kafeely…");
  await db.auditLog.deleteMany();
  await db.notification.deleteMany();
  await db.target.deleteMany();
  await db.announcement.deleteMany();
  await db.offer.deleteMany();
  await db.viewing.deleteMany();
  await db.application.deleteMany();
  await db.commission.deleteMany();
  await db.lead.deleteMany();
  await db.payment.deleteMany();
  await db.document.deleteMany();
  await db.inspection.deleteMany();
  await db.ticket.deleteMany();
  await db.claim.deleteMany();
  await db.lease.deleteMany();
  await db.unit.deleteMany();
  await db.property.deleteMany();
  await db.waitlistEntry.deleteMany();
  await db.invite.deleteMany();
  await db.user.deleteMany();
  await db.agency.deleteMany();

  // ── Agency ───────────────────────────────────────────────────────────
  const agency = await db.agency.create({
    data: { name: "Metropolitan Premier Properties", licenseNo: "ORN-24891", targetDeals: 48, achievedDeals: 31 },
  });

  // ── Users ────────────────────────────────────────────────────────────
  type U = { id: string; fullName: string; email: string; role: string };
  const users: Record<string, U> = {};
  const mkUser = async (key: string, fullName: string, email: string, role: string, extra: Partial<{ jobTitle: string; organization: string; agencyId: string; phone: string }> = {}) => {
    const u = await db.user.create({
      data: {
        fullName, email, role, passwordHash: DEMO_PW, phone: extra.phone ?? `+9715${int(0, 5)}${int(1000000, 9999999)}`,
        jobTitle: extra.jobTitle, organization: extra.organization, agencyId: extra.agencyId,
        avatarSeed: fullName.split(" ").map((w) => w[0]).slice(0, 2).join(""),
      },
    });
    users[key] = { id: u.id, fullName, email, role };
    return u;
  };

  await mkUser("admin", "Zaid Al Mansouri", "zaid@kafeely.ae", "super_admin", { jobTitle: "Platform Operator", organization: "Kafeely", phone: "+971501112233" });
  await mkUser("landlord", "Khalid Al Suwaidi", "khalid@example.ae", "landlord", { jobTitle: "Private Investor", phone: "+971504445566" });
  await mkUser("tenant", "Emma Thompson", "emma.thompson@example.com", "tenant", { jobTitle: "Regional Director — Aviata Group", phone: "+971521234567" });
  await mkUser("broker", "Sarah Haddad", "sarah.haddad@metropremier.ae", "broker", { jobTitle: "Senior Broker", organization: "Metropolitan Premier Properties", agencyId: agency.id });
  await mkUser("agent", "Yousef Al Amiri", "yousef.amiri@metropremier.ae", "agent", { jobTitle: "Real Estate Agent", organization: "Metropolitan Premier Properties", agencyId: agency.id });
  await mkUser("facility", "Laurent Dubois", "laurent@primeserve.ae", "facility", { jobTitle: "Community Manager", organization: "PrimeServe Facility Management" });
  await mkUser("leasing", "Aisha Rahman", "aisha@citywideleasing.ae", "leasing", { jobTitle: "Leasing Executive", organization: "Citywide Leasing Co" });

  // supporting users
  const landlordIds: string[] = [];
  for (const [k, n, e] of [
    ["l2", "Noora Al Suwaidi", "noora.s@example.ae"], ["l3", "Rashid Al Marzooqi", "rashid.m@example.ae"],
    ["l4", "James Whitfield", "j.whitfield@example.com"], ["l5", "Hend Al Falasi", "hend.f@example.ae"],
  ] as const) {
    const u = await mkUser(k, n, e, "landlord");
    landlordIds.push(u.id);
  }
  landlordIds.push(users.landlord.id);

  const tenantNames: [string, string, string][] = [
    ["Omar El Sayed", "omar.elsayed@example.com", "eg"],
    ["Priya Sharma", "priya.sharma@example.com", "in"],
    ["Marco Rossi", "marco.rossi@example.com", "it"],
    ["Fatima Al Ali", "fatima.alali@example.ae", "ae"],
    ["Daniel Kim", "daniel.kim@example.com", "kr"],
    ["Sofia Andersson", "sofia.a@example.com", "se"],
    ["Yousef Al Hamadi", "yousef.h@example.ae", "ae"],
    ["Laura Meyer", "laura.meyer@example.com", "de"],
    ["Ahmed Al Mansoori", "ahmed.m@example.ae", "ae"],
    ["Rania Kassem", "rania.k@example.com", "lb"],
    ["Oliver Bennett", "oliver.b@example.com", "uk"],
    ["Mariam Saleh", "mariam.saleh@example.ae", "ae"],
  ];
  const tenantIds: string[] = [];
  for (const [n, e] of tenantNames) {
    const u = await mkUser(`t_${e.split(".")[0]}`, n, e, "tenant");
    tenantIds.push(u.id);
  }
  tenantIds.push(users.tenant.id);

  const agentMates: [string, string, string][] = [
    ["Dana Khoury", "dana.khoury@metropremier.ae", "Senior Agent"],
    ["Faisal Al Zaabi", "faisal.zaabi@metropremier.ae", "Agent"],
    ["Mariam Saleh", "mariam.saleh@metropremier.ae", "Agent"],
  ];
  const mateUsers: { id: string }[] = [];
  for (const [n, e, jt] of agentMates) mateUsers.push(await mkUser(`ag_${n.split(" ")[0].toLowerCase()}`, n, e, "agent", { jobTitle: jt, organization: "Metropolitan Premier Properties", agencyId: agency.id }));

  // ── Properties ───────────────────────────────────────────────────────
  const props = [
    { key: "MG1", name: "Marina Gate I", nameAr: "مارينا جيت ١", district: "Dubai Marina", districtAr: "مرسى دبي", type: "tower", floors: 32, built: 2018, amen: "Pool,Gym,Concierge,Beach Access" },
    { key: "BR", name: "Burj Royale", nameAr: "برج رويال", district: "Downtown Dubai", districtAr: "وسط مدينة دبي", type: "tower", floors: 58, built: 2019, amen: "Pool,Gym,Concierge,Burj View" },
    { key: "BL", name: "Bellevue Tower", nameAr: "برج بلفيو", district: "Downtown Dubai", districtAr: "وسط مدينة دبي", type: "tower", floors: 42, built: 2021, amen: "Pool,Gym,Retail Podium" },
    { key: "TP", name: "The Pinnacle", nameAr: "ذا بيناكل", district: "Business Bay", districtAr: "الخليج التجاري", type: "tower", floors: 27, built: 2017, amen: "Pool,Gym,Sky Lounge" },
    { key: "BC", name: "Binghatti Crest", nameAr: "بينجاتي كريست", district: "Jumeirah Village Circle", districtAr: "قرية جميرا الدائرية", type: "building", floors: 14, built: 2022, amen: "Gym,Parking" },
    { key: "GV", name: "Goldcrest Views", nameAr: "جولدكريست فيوز", district: "Jumeirah Lake Towers", districtAr: "بحيرات جميرا", type: "tower", floors: 40, built: 2007, amen: "Pool,Gym,Lake View" },
    { key: "MP", name: "Maple III", nameAr: "مابل ٣", district: "Dubai Hills Estate", districtAr: "دبي هيلز إستيت", type: "community", floors: 3, built: 2019, amen: "Park,Golf Access,Pool" },
    { key: "SL", name: "Serenia Living", nameAr: "سيرينيا ليفينغ", district: "Palm Jumeirah", districtAr: "نخلة جميرا", type: "tower", floors: 15, built: 2023, amen: "Private Beach,Pool,Concierge" },
  ];
  const propIds: Record<string, string> = {};
  for (const p of props) {
    const created = await db.property.create({
      data: {
        name: p.name, nameAr: p.nameAr, district: p.district, districtAr: p.districtAr,
        address: `${p.name}, ${p.district}, Dubai, UAE`, type: p.type, totalFloors: p.floors,
        yearBuilt: p.built, amenities: p.amen, facilityManagerId: users.facility.id,
      },
    });
    propIds[p.key] = created.id;
  }

  // ── Units ────────────────────────────────────────────────────────────
  type UnitSpec = { id: string; propertyKey: string; floor: number; type: string; beds: number; baths: number; sqm: number; rent: number };
  const unitSpecs: UnitSpec[] = [];
  const typeMix: [string, number, number, number, number][] = [ // type, beds, baths, sqm base, rent base (yearly)
    ["studio", 0, 1, 46, 68000], ["1br", 1, 2, 82, 118000], ["2br", 2, 3, 128, 195000],
    ["3br", 3, 4, 186, 320000], ["penthouse", 4, 5, 320, 780000],
  ];
  const premiums: Record<string, number> = { MG1: 1.18, BR: 1.28, BL: 1.22, TP: 1.05, BC: 0.72, GV: 0.82, MP: 1.35, SL: 1.65 };
  let unitNo = 100;
  const usedCodes = new Set<string>();
  const nextCode = (key: string, floor: number, suffix = "") => {
    let code = "";
    do {
      code = `${key}-${floor}${String(unitNo % 100).padStart(2, "0")}${suffix}`;
      unitNo += 7;
    } while (usedCodes.has(code));
    usedCodes.add(code);
    return code;
  };
  for (const p of props) {
    const nUnits = p.key === "MP" ? 4 : p.key === "SL" ? 4 : 6;
    // cluster units on shared floors so the FM unit board reads well
    const floorPattern = p.key === "MP" ? [1, 1, 2, 2, 3, 3] : [4, 4, 12, 12, 24, 24, 31, 31];
    for (let i = 0; i < nUnits; i++) {
      const [type, beds, baths, sqm, rent] = pick(typeMix);
      const floor = Math.min(floorPattern[i % floorPattern.length], p.floors);
      const pr = premiums[p.key];
      unitSpecs.push({
        id: nextCode(p.key, floor, p.key === "MP" ? String.fromCharCode(65 + i) : ""),
        propertyKey: p.key, floor, type, beds, baths,
        sqm: Math.round(sqm * (0.9 + rand() * 0.25)),
        rent: Math.round((rent * pr) / 1000) * 1000,
      });
      unitNo += 7;
    }
  }
  // guarantee primary tenant + landlord anchor assets
  const units: { id: string; propertyId: string; landlordId: string | null; spec: UnitSpec }[] = [];
  for (const s of unitSpecs) {
    const statusRoll = rand();
    const status = statusRoll < 0.62 ? "occupied" : statusRoll < 0.78 ? "vacant" : statusRoll < 0.92 ? "under_notice" : "maintenance";
    const landlordId = rand() < 0.34 ? pick(landlordIds) : null;
    const u = await db.unit.create({
      data: {
        code: s.id, propertyId: propIds[s.propertyKey], floor: s.floor, type: s.type, bedrooms: s.beds,
        bathrooms: s.baths, sizeSqm: s.sqm, rentAed: s.rent, status, landlordId,
        view: pick(["City Skyline", "Sea", "Burj Khalifa", "Marina", "Golf Course", "Community Park", null]),
        protectionStatus: status === "occupied" ? (rand() < 0.58 ? "protected" : rand() < 0.5 ? "pending" : "unprotected") : "unprotected",
      },
    });
    units.push({ id: u.id, propertyId: u.propertyId, landlordId: u.landlordId, spec: s });
  }
  // anchor: Khalid owns 6 specific units
  const anchorUnits = units.slice(0, 6);
  for (const u of anchorUnits) {
    await db.unit.update({ where: { id: u.id }, data: { landlordId: users.landlord.id } });
    u.landlordId = users.landlord.id;
  }
  // ensure primary tenant lease lives in an anchor unit
  const anchor = anchorUnits[0];
  await db.unit.update({ where: { id: anchor.id }, data: { status: "occupied", protectionStatus: "protected" } });

  // ── Leases ───────────────────────────────────────────────────────────
  const leases: { id: string; unitId: string; tenantId: string; landlordId: string | null; rent: number; end: Date; status: string; protection: boolean }[] = [];
  let leaseNo = 100;
  let tIdx = 0;
  for (const u of units) {
    if (u.landlordId === null && rand() < 0.5) continue;
    if (tIdx > tenantIds.length) break;
    const occupiedLike = u.id === anchor.id || rand() < 0.72;
    if (!occupiedLike) continue;
    const tenantId = u.id === anchor.id ? users.tenant.id : tenantIds[tIdx++ % tenantIds.length];
    const start = days(-int(40, 700));
    const end = new Date(start.getTime() + 365 * 86400000);
    const dLeft = Math.ceil((end.getTime() - Date.now()) / 86400000);
    const status = u.id === anchor.id ? "active" : dLeft < 0 ? "terminated" : dLeft < 75 ? "expiring_soon" : "active";
    const protection = u.id === anchor.id ? true : rand() < 0.6;
    if (status === "terminated") continue;
    const freq = pick([1, 2, 4, 4, 12]);
    const l = await db.lease.create({
      data: {
        ref: `LSE-2026-${leaseNo++}`, unitId: u.id, tenantId, landlordId: u.landlordId ?? users.landlord.id,
        startDate: start, endDate: end, rentAed: u.spec.rent, paymentFrequency: freq, status,
        ejariNumber: `EJ-${int(10000000, 99999999)}`, protectionEnrolled: protection,
      },
    });
    leases.push({ id: l.id, unitId: u.id, tenantId, landlordId: l.landlordId, rent: l.rentAed, end, status, protection: l.protectionEnrolled });
    await db.unit.update({ where: { id: u.id }, data: { status: "occupied" } });
    // payments schedule
    const n = freq;
    for (let i = 0; i < n; i++) {
      const due = new Date(start.getTime() + (365 / n) * i * 86400000);
      const past = due.getTime() < Date.now();
      const roll = rand();
      const pStatus = past ? (roll < 0.86 ? "paid" : "overdue") : roll < 0.5 ? "upcoming" : "pending";
      await db.payment.create({
        data: {
          leaseId: l.id, installmentNo: i + 1, amountAed: Math.round(l.rentAed / n),
          dueDate: due, paidDate: pStatus === "paid" ? new Date(due.getTime() - int(0, 5) * 86400000) : null,
          method: pick(["cheque", "bank_transfer", "card"]), status: pStatus,
        },
      });
    }
  }
  // anchor lease explicitly for Emma
  const anchorLease = leases.find((l) => l.tenantId === users.tenant.id);
  if (!anchorLease) throw new Error("anchor lease missing");

  // ── Claims ───────────────────────────────────────────────────────────
  const claimTypes = ["rent_default", "damage", "legal", "early_termination", "maintenance"];
  const claimDesc: Record<string, string> = {
    rent_default: "Tenant missed two consecutive rent instalments. Protection payout review initiated.",
    damage: "Water damage to flooring and built-in wardrobes reported after unit inspection.",
    legal: "Legal assistance requested for early lease dispute and notice period handling.",
    early_termination: "Tenant requested early termination; compensation coverage under review.",
    maintenance: "AC compressor failure — emergency repair cost within coverage scope.",
  };
  let claimNo = 40;
  const claimSeeds = leases.slice(0, 16);
  for (const l of claimSeeds) {
    if (rand() < 0.2) continue;
    const type = pick(claimTypes);
    const roll = rand();
    const status = roll < 0.25 ? "submitted" : roll < 0.5 ? "under_review" : roll < 0.68 ? "approved" : roll < 0.8 ? "settled" : "rejected";
    await db.claim.create({
      data: {
        ref: `CLM-2026-${String(claimNo++).padStart(4, "0")}`, leaseId: l.id, unitId: l.unitId,
        raisedById: l.landlordId ?? users.landlord.id, type, status,
        amountAed: type === "rent_default" ? int(15, 90) * 1000 : type === "damage" ? int(4, 40) * 1000 : int(2, 18) * 1000,
        priority: pick(["low", "medium", "medium", "high", "urgent"]),
        description: claimDesc[type],
        createdAt: days(-int(3, 120)), resolvedAt: ["settled", "rejected"].includes(status) ? days(-int(1, 20)) : null,
      },
    });
  }
  // an urgent open claim on the anchor unit for landlord demo
  await db.claim.create({
    data: {
      ref: `CLM-2026-0031`, leaseId: anchorLease.id, unitId: anchor.id, raisedById: users.landlord.id,
      type: "rent_default", status: "under_review", amountAed: 42000, priority: "high",
      description: claimDesc.rent_default, createdAt: days(-9),
    },
  });

  // ── Vendors & Tickets ────────────────────────────────────────────────
  const vendorNames: [string, string][] = [
    ["CoolAir Technical Services", "hvac"], ["AquaFix Plumbing LLC", "plumbing"],
    ["SparkLine Electrical", "electrical"], ["PristineClean FM", "cleaning"],
    ["SafeGuard Security Systems", "security"], ["HandyPro Maintenance", "other"],
  ];
  const vendorIds: string[] = [];
  for (const [n, c] of vendorNames) {
    const v = await db.vendor.create({
      data: { name: n, category: c, contactName: pick(["Arun Kumar", "Bilal Ahmed", "Rami Saab", "Nestor Cruz"]), phone: `+9714${int(1000000, 9999999)}`, rating: Math.round((3.8 + rand() * 1.2) * 10) / 10, jobsCompleted: int(40, 380) },
    });
    vendorIds.push(v.id);
  }
  const ticketTitles: [string, string, string][] = [
    ["AC not cooling — master bedroom", "hvac", "Unit reported insufficient cooling during afternoon hours."],
    ["Water leakage under kitchen sink", "plumbing", "Tenant reported slow leak; shut-off valve applied."],
    ["Corridor lighting flickering — floor 12", "electrical", "Multiple fixtures flickering in common corridor."],
    ["Deep clean request before handover", "cleaning", "Move-out deep cleaning required before new lease start."],
    ["Access control reader offline", "security", "Lobby reader not accepting cards since morning."],
    ["Cabinet hinge replacement", "other", "Minor snagging items reported during routine inspection."],
    ["Chiller maintenance — quarterly", "hvac", "Scheduled quarterly chiller filter and coil service."],
    ["Bathroom drainage odor", "plumbing", "Persistent odor reported from master bathroom drain."],
  ];
  let ticketNo = 100;
  for (const [title, category, desc] of ticketTitles) {
    const roll = rand();
    const status = roll < 0.3 ? "open" : roll < 0.62 ? "in_progress" : roll < 0.85 ? "resolved" : "closed";
    const propKey = pick(props).key;
    const unit = pick(units.filter((u) => u.propertyId === propIds[propKey])) ?? units[0];
    await db.ticket.create({
      data: {
        ref: `TKT-2026-${ticketNo++}`, propertyId: propIds[propKey], unitId: unit.id,
        raisedById: pick([users.tenant.id, users.facility.id, users.landlord.id]),
        assignedVendorId: status !== "open" ? pick(vendorIds) : null,
        category, priority: pick(["low", "medium", "medium", "high", "urgent"]), status, title, description: desc,
        scheduledFor: status === "open" || status === "in_progress" ? days(int(0, 6)) : null,
        createdAt: days(-int(1, 30)), resolvedAt: ["resolved", "closed"].includes(status) ? days(-int(0, 10)) : null,
      },
    });
  }
  // anchor tickets for tenant
  await db.ticket.create({
    data: { ref: `TKT-2026-0117`, propertyId: anchor.propertyId, unitId: anchor.id, raisedById: users.tenant.id, category: "hvac", priority: "high", status: "in_progress", title: "AC not cooling — master bedroom", description: "Cooling dropped after midday; unit blows warm air.", scheduledFor: days(1), createdAt: days(-2) },
  });
  await db.ticket.create({
    data: { ref: `TKT-2026-0121`, propertyId: anchor.propertyId, unitId: anchor.id, raisedById: users.tenant.id, category: "plumbing", priority: "medium", status: "resolved", title: "Kitchen faucet drip", description: "Constant drip from kitchen faucet cartridge.", createdAt: days(-16), resolvedAt: days(-13), assignedVendorId: vendorIds[1] },
  });

  // ── Inspections ──────────────────────────────────────────────────────
  for (let i = 0; i < 10; i++) {
    const propKey = pick(props).key;
    const unit = pick(units.filter((u) => u.propertyId === propIds[propKey])) ?? units[0];
    const roll = rand();
    await db.inspection.create({
      data: {
        propertyId: propIds[propKey], unitId: unit.id, type: pick(["move_in", "move_out", "routine", "compliance"]),
        scheduledFor: roll < 0.4 ? days(int(1, 20)) : days(-int(1, 60)),
        status: roll < 0.4 ? "scheduled" : roll < 0.85 ? "completed" : "overdue",
        inspector: pick(["PrimeServe Team A", "PrimeServe Team B", "Third-party — CheckVerify"]),
        findings: roll < 0.4 ? null : pick(["No issues found.", "Minor paint touch-ups advised.", "AC filter replacement completed.", "Two snagging items logged."]),
        complianceScore: roll < 0.4 ? null : int(72, 99),
      },
    });
  }

  // ── Documents ────────────────────────────────────────────────────────
  const docSets: [string, string, string, string | null][] = [
    ["Tenancy Contract — Marina Gate I 1204", "lease", "tenant", anchorLease.id],
    ["Addendum — Furniture Inventory", "addendum", "tenant", anchorLease.id],
    ["Rental Protection Certificate", "certificate", "tenant", anchorLease.id],
    ["Ejari Registration Certificate", "compliance", "tenant", anchorLease.id],
    ["Payment Receipt — Instalment 1", "invoice", "tenant", anchorLease.id],
    ["Tenancy Contract — Marina Gate I 1204 (Owner Copy)", "lease", "landlord", anchorLease.id],
    ["Protection Policy Schedule", "certificate", "landlord", anchorLease.id],
    ["Annual Statement 2025", "statement", "landlord", null],
    ["Property Title Deed — MG1-1204", "compliance", "landlord", null],
    ["Insurance Endorsement Letter", "other", "landlord", null],
  ];
  for (const [name, category, ownerRole, leaseId] of docSets) {
    const status = pick(["verified", "verified", "verified", "pending"]);
    const pdf = demoPdf(name, category, status);
    await db.document.create({
      data: { name, category, ownerRole, ownerId: ownerRole === "tenant" ? users.tenant.id : users.landlord.id, unitId: anchor.id, leaseId, sizeKb: Math.max(1, Math.round(pdf.length / 1024)), status, fileName: `${name.replace(/[^\w\u0400-\u04FF .()-]/g, "-")}.pdf`, mimeType: "application/pdf", fileData: pdf },
    });
  }
  for (const l of leases.slice(2, 12)) {
    const name = `Tenancy Contract — ${l.unitId.slice(0, 10)}`;
    const pdf = demoPdf(name, "lease", "verified");
    await db.document.create({
      data: { name, category: "lease", ownerRole: "tenant", ownerId: l.tenantId, unitId: l.unitId, leaseId: l.id, sizeKb: Math.max(1, Math.round(pdf.length / 1024)), status: "verified", fileName: `${name.replace(/[^\w\u0400-\u04FF .()-]/g, "-")}.pdf`, mimeType: "application/pdf", fileData: pdf },
    });
  }

  // ── Broker pipeline ──────────────────────────────────────────────────
  const stages = ["new", "contacted", "viewing", "offer", "negotiation", "won", "lost"];
  const leadNames = [
    ["Abdulla Bin Byed", "landlord"], ["Claire Dubois", "tenant"], ["Viktor Petrov", "investor"],
    ["Mona Al Sharif", "landlord"], ["Hiroshi Tanaka", "tenant"], ["Grace Wanjiru", "tenant"],
    ["Ibrahim Al Falasi", "landlord"], ["Elena Petrova", "tenant"], ["Tariq Bin Zayed", "investor"],
    ["Nadia Rahal", "tenant"], ["Peter Novak", "tenant"], ["Layla Al Suwaidi", "landlord"],
    ["Chen Wei", "tenant"], ["Fatima Al Blooshi", "landlord"],
  ];
  let li = 0;
  for (const [stage, count] of [["new", 3], ["contacted", 3], ["viewing", 2], ["offer", 2], ["negotiation", 1], ["won", 2], ["lost", 1]] as const) {
    for (let i = 0; i < count; i++) {
      const [clientName, clientType] = leadNames[li++];
      await db.lead.create({
        data: {
          clientName, clientType, phone: `+9715${int(0, 5)}${int(1000000, 9999999)}`, email: `${clientName.split(" ")[0].toLowerCase()}@example.com`,
          stage, interest: `${pick(["2br", "3br", "1br"])} in ${pick(["Dubai Marina", "Downtown", "Palm Jumeirah", "Business Bay"])}`,
          budgetAed: int(110, 420) * 1000, estCommissionAed: int(5, 42) * 1000,
          ownerId: users.broker.id, propertyId: pick(units).propertyId,
          source: pick(["website", "referral", "portal", "walk-in"]),
          notes: pick(["Prefers high floor, Burj view.", "Cash buyer — quick close possible.", "Needs 2 parking slots.", "Flexible on move-in date."]),
          createdAt: days(-int(2, 45)), updatedAt: days(-int(0, 6)),
        },
      });
    }
  }
  // a few leads owned by the agent user
  for (const [stage, clientName] of [["viewing", "Hassan Al Rostamani"], ["offer", "Julia Weber"], ["new", "Karan Mehta"]] as const) {
    await db.lead.create({
      data: { clientName, clientType: "tenant", stage, interest: `1br in ${pick(["JLT", "Marina"])}`, budgetAed: int(80, 140) * 1000, estCommissionAed: int(4, 12) * 1000, ownerId: users.agent.id, propertyId: pick(units).propertyId, createdAt: days(-int(1, 20)) },
    });
  }
  const commissionRows: [string, string, number, number, string][] = [
    ["CMP-2026-014", "Tariq Bin Zayed — 2br Burj Royale", 38500, 2.5, "paid"],
    ["CMP-2026-019", "Grace Wanjiru — 1br Marina Gate I", 14200, 2.5, "paid"],
    ["CMP-2026-023", "Ibrahim Al Falasi — 3br Maple III", 51800, 2.0, "approved"],
    ["CMP-2026-027", "Elena Petrova — 2br The Pinnacle", 22800, 2.5, "approved"],
    ["CMP-2026-031", "Nadia Rahal — studio Binghatti Crest", 6300, 2.5, "pending"],
    ["CMP-2026-033", "Peter Novak — 2br Goldcrest Views", 16750, 2.5, "pending"],
  ];
  for (const [dealRef, clientName, amountAed, ratePct, status] of commissionRows) {
    await db.commission.create({
      data: { ownerId: users.broker.id, dealRef, clientName, amountAed, ratePct, status, closedAt: days(-int(10, 90)), paidAt: status === "paid" ? days(-int(1, 9)) : null },
    });
  }

  // ── Leasing: applications, viewings, offers ──────────────────────────
  const vacantUnits = units.slice(-14);
  const appNames = ["Ritesh Bhatia", "Anna Kowalska", "Saeed Al Suwaidi", "Megan Clarke", "Ivan Sokolov", "Huda Al Rais", "Tomasz Nowak", "Leila Haddad", "Faris Al Zarooni", "Chloe Martin"];
  appNames.forEach((n, i) => {
    const u = vacantUnits[i % vacantUnits.length];
    const roll = rand();
    db.application.create({
      data: {
        ref: `APP-2026-${String(140 + i)}`, unitId: u.id, applicantName: n,
        phone: `+9715${int(0, 5)}${int(1000000, 9999999)}`, email: `${n.split(" ")[0].toLowerCase()}@example.com`,
        nationality: pick(["India", "UK", "UAE", "Poland", "Russia", "France", "Lebanon"]),
        monthlyIncomeAed: int(28, 120) * 1000, score: int(58, 96),
        status: roll < 0.35 ? "new" : roll < 0.6 ? "screening" : roll < 0.85 ? "approved" : "rejected",
        submittedAt: days(-int(0, 14)),
      },
    }).catch(() => null);
  });
  await db.application.create({
    data: { ref: "APP-2026-155", unitId: vacantUnits[0].id, applicantName: "Ritesh Bhatia", phone: "+971552019876", email: "ritesh@example.com", nationality: "India", monthlyIncomeAed: 65000, score: 88, status: "screening", submittedAt: days(-2) },
  });
  const viewingNames = ["Anna Kowalska", "Saeed Al Suwaidi", "Megan Clarke", "Ivan Sokolov", "Huda Al Rais", "Chloe Martin", "Karan Mehta"];
  viewingNames.forEach((n, i) => {
    const u = vacantUnits[(i + 2) % vacantUnits.length];
    db.viewing.create({
      data: { unitId: u.id, leadName: n, phone: `+9715${int(0, 5)}${int(1000000, 9999999)}`, agentName: pick(["Aisha Rahman", "Team B — Musab"]), scheduledAt: i < 4 ? days(i - 1) : days(-int(1, 9)), status: i < 4 ? "scheduled" : pick(["completed", "no_show", "cancelled"]) },
    }).catch(() => null);
  });
  const offerRows: [string, string, number, string][] = [
    ["tenant", "Anna Kowalska", 168000, "pending"],
    ["tenant", "Ivan Sokolov", 142000, "countered"],
    ["tenant", "Megan Clarke", 210000, "accepted"],
    ["landlord", "Owner — Maple III", 245000, "pending"],
    ["tenant", "Chloe Martin", 96000, "declined"],
  ];
  offerRows.forEach(([fromType, fromName, amountAed, status], i) => {
    db.offer.create({
      data: { unitId: vacantUnits[(i + 1) % vacantUnits.length].id, fromType, fromName, amountAed, terms: i === 1 ? "Requests 3 rent-free weeks + 2 cheques." : null, status, createdAt: days(-int(1, 12)) },
    }).catch(() => null);
  });

  // ── Announcements ────────────────────────────────────────────────────
  const annRows: [string, string, string, string][] = [
    ["Scheduled chiller maintenance — 14 Nov", "Annual chiller servicing will run from 08:00 to 16:00. Brief interruptions to district cooling are expected.", "tenants", "important"],
    ["Pool deck renovation update", "The upgraded pool deck and kids' area reopen on 20 Nov. Access via the west lobby only during final works.", "all", "normal"],
    ["Fire alarm testing — Tower B", "Annual DCD-mandated fire alarm testing on Sunday, 09:00–12:00. Alarms will sound intermittently.", "tenants", "urgent"],
    ["Ejari renewal reminder", "Leases expiring within 60 days: please submit renewal documents to reception to avoid Ejari gaps.", "owners", "normal"],
    ["Ramadan operating hours", "Amenity and reception operating hours will be adjusted during the holy month. Updated schedule to follow.", "all", "normal"],
  ];
  annRows.forEach(([title, body, audience, priority], i) => {
    db.announcement.create({
      data: { propertyId: propIds[pick(props).key], title, body, audience, priority, sentById: users.facility.id, sentAt: days(-i * 3 - 1) },
    }).catch(() => null);
  });

  // ── Waitlist ─────────────────────────────────────────────────────────
  const waitRows: [string, string, string, string, string][] = [
    ["Amna Al Habtoor", "amna.h@example.ae", "owner", "converted", "website"],
    ["Richard Osei", "r.osei@example.com", "tenant", "qualified", "website"],
    ["Sanaa Qureshi", "sanaa.q@example.com", "partner", "contacted", "referral"],
    ["Mohamed Barakat", "m.barakat@example.ae", "owner", "new", "website"],
    ["Julia Fernandes", "j.fernandes@example.com", "tenant", "new", "instagram"],
    ["Ali Al Kamali", "ali.k@example.ae", "investor", "contacted", "event"],
    ["Grace Mwangi", "grace.m@example.com", "tenant", "qualified", "portal"],
    ["Hassan Jaber", "h.jaber@example.ae", "owner", "erased", "website"],
    ["Olga Sidorova", "olga.s@example.com", "tenant", "new", "website"],
    ["Faisal Bin Dalmook", "faisal.bd@example.ae", "investor", "converted", "event"],
    ["Priyanka Nair", "priyanka.n@example.com", "tenant", "contacted", "website"],
    ["Marcus Adler", "m.adler@example.com", "partner", "qualified", "referral"],
    ["Reem Al Suwaidi", "reem.s@example.ae", "owner", "new", "instagram"],
    ["Daniel Osei", "dan.osei@example.com", "tenant", "erased", "portal"],
    ["Laila Al Marri", "laila.m@example.ae", "owner", "contacted", "website"],
    ["Yannick Dubois", "y.dubois@example.com", "tenant", "new", "website"],
  ];
  for (const [fullName, email, audience, status, source] of waitRows) {
    await db.waitlistEntry.create({
      data: { fullName, email, phone: `+9715${int(0, 5)}${int(1000000, 9999999)}`, audience, status, source, notes: status === "erased" ? "GDPR erase request fulfilled." : null, createdAt: days(-int(5, 150)) },
    });
  }

  // ── Targets (agent) ──────────────────────────────────────────────────
  await db.target.create({ data: { userId: users.agent.id, period: "2026-Q4", metric: "deals", target: 12, actual: 7 } });
  await db.target.create({ data: { userId: users.agent.id, period: "2026-Q4", metric: "listings", target: 20, actual: 14 } });
  await db.target.create({ data: { userId: users.agent.id, period: "2026-Q4", metric: "revenue", target: 180000, actual: 96400 } });
  await db.target.create({ data: { userId: users.agent.id, period: "2026-Q3", metric: "deals", target: 10, actual: 11 } });
  await db.target.create({ data: { userId: mateUsers[0].id, period: "2026-Q4", metric: "deals", target: 14, actual: 10 } });
  await db.target.create({ data: { userId: mateUsers[0].id, period: "2026-Q4", metric: "revenue", target: 220000, actual: 158000 } });
  await db.target.create({ data: { userId: mateUsers[0].id, period: "2026-Q4", metric: "listings", target: 24, actual: 21 } });
  await db.target.create({ data: { userId: mateUsers[1].id, period: "2026-Q4", metric: "deals", target: 10, actual: 5 } });
  await db.target.create({ data: { userId: mateUsers[1].id, period: "2026-Q4", metric: "revenue", target: 150000, actual: 61500 } });
  await db.target.create({ data: { userId: mateUsers[1].id, period: "2026-Q4", metric: "listings", target: 16, actual: 11 } });
  await db.target.create({ data: { userId: mateUsers[2].id, period: "2026-Q4", metric: "deals", target: 9, actual: 9 } });
  await db.target.create({ data: { userId: mateUsers[2].id, period: "2026-Q4", metric: "revenue", target: 130000, actual: 121000 } });
  await db.target.create({ data: { userId: mateUsers[2].id, period: "2026-Q4", metric: "listings", target: 14, actual: 15 } });
  await db.target.create({ data: { userId: users.broker.id, period: "2026-Q4", metric: "deals", target: 16, actual: 9 } });
  await db.target.create({ data: { userId: users.broker.id, period: "2026-Q4", metric: "revenue", target: 260000, actual: 148550 } });

  // ── Invites (landlord) ───────────────────────────────────────────────
  const inviteRows: [string, string, string, boolean][] = [
    ["emma.thompson@example.com", "tenant", "Emma Thompson", true],
    ["sarah.haddad@metropremier.ae", "broker", "Sarah Haddad", true],
    ["j.whitfield@example.com", "landlord", "James Whitfield", false],
    ["noora.s@example.ae", "landlord", "Noora Al Suwaidi", false],
  ];
  for (const [email, role, name, accepted] of inviteRows) {
    await db.invite.create({
      data: { email, role, ownerId: users.landlord.id, ownerName: "Khalid Al Suwaidi", status: accepted ? "accepted" : "pending", acceptedAt: accepted ? days(-int(1, 20)) : null, sentAt: days(-int(10, 40)) },
    });
  }

  // ── Audit log ────────────────────────────────────────────────────────
  const auditRows: [string, string, string, string, string | null, string][] = [
    ["waitlist.verify", "WaitlistEntry", "w_001", "Verified waitlist entry — Amna Al Habtoor", "94.200.11.4"],
    ["user.approve", "User", "u_014", "Approved landlord account — Noora Al Suwaidi", "94.200.11.4"],
    ["user.suspend", "User", "u_022", "Suspended broker account pending verification", "94.200.11.4"],
    ["claim.status", "Claim", "CLM-2026-0031", "Claim moved to UNDER_REVIEW", "94.200.11.4"],
    ["user.role_change", "User", "u_017", "Changed role tenant → landlord", "94.200.11.4"],
    ["waitlist.export", "WaitlistEntry", null, "Exported 16 waitlist entries (CSV)", "94.200.11.4"],
    ["auth.login", "Session", null, "Signed in — super admin console", "94.200.11.4"],
    ["config.update", "SystemConfig", "claims", "Updated default claim review SLA to 5 days", "94.200.11.4"],
    ["compliance.erase", "WaitlistEntry", "w_008", "Executed GDPR erase — Hassan Jaber", "94.200.11.4"],
    ["user.reset_password", "User", "u_019", "Issued temporary password for tenant account", "94.200.11.4"],
  ];
  for (const [action, entityType, entityId, detail, ip] of auditRows) {
    await db.auditLog.create({
      data: { actorId: users.admin.id, actorName: "Zaid Al Mansouri", actorRole: "super_admin", action, entityType, entityId, detail, ip, createdAt: days(-int(0, 21)) },
    });
  }

  // ── Notifications ────────────────────────────────────────────────────
  const notif = (userId: string, rows: [string, string, string, string, string, boolean][]) =>
    Promise.all(rows.map(([titleEn, titleAr, bodyEn, bodyAr, type, read]) =>
      db.notification.create({ data: { userId, titleEn, titleAr, bodyEn, bodyAr, type, read, createdAt: days(-int(0, 10)) } })));
  await notif(users.landlord.id, [
    ["Claim CLM-2026-0031 under review", "الطلب CLM-2026-0031 قيد المراجعة", "Your rent default claim is with the underwriting team.", "طلب تعثر الإيجار الخاص بك مع فريق الاكتتاب.", "claim", false],
    ["Lease expiring in 60 days", "عقد إيجار ينتهي خلال ٦٠ يوماً", "MG1-1204 lease ends soon — review renewal options.", "ينتهي عقد الوحدة MG1-1204 قريباً — راجع خيارات التجديد.", "lease", false],
    ["Protection certificate issued", "تم إصدار شهادة الحماية", "Certificate for BR-0803 is ready in your vault.", "شهادة الوحدة BR-0803 جاهزة في خزانة مستنداتك.", "system", true],
    ["Rent instalment received", "تم استلام قسط الإيجار", "Instalment 2 for BL-1502 was received on time.", "تم استلام القسط الثاني للوحدة BL-1502 في موعده.", "payment", true],
  ]);
  await notif(users.tenant.id, [
    ["Ticket TKT-2026-0117 in progress", "التذكرة TKT-2026-0117 قيد التنفيذ", "A technician is scheduled tomorrow 10:00–12:00.", "تم تحديد موعد فني غداً بين ١٠ و١٢ صباحاً.", "ticket", false],
    ["Protection certificate renewed", "تم تجديد شهادة الحماية", "Your rental protection certificate is valid until Nov 2027.", "شهادة حماية الإيجار سارية حتى نوفمبر ٢٠٢٧.", "system", false],
    ["Payment receipt available", "إيصال الدفع متاح", "Receipt for instalment 1 is in your documents.", "إيصال القسط الأول متاح في مستنداتك.", "payment", true],
  ]);
  await notif(users.admin.id, [
    ["12 new waitlist entries this week", "١٢ تسجيلاً جديداً هذا الأسبوع", "Waitlist grew 8% week-over-week.", "نمت قائمة الانتظار ٨٪ عن الأسبوع الماضي.", "system", false],
    ["Claim CLM-2026-0031 escalated", "تم تصعيد الطلب CLM-2026-0031", "High-value claim requires compliance sign-off.", "طلب ذو قيمة عالية يتطلب موافقة الامتثال.", "claim", false],
    ["User suspension appeal", "طعن في تعليق حساب", "Broker account u_022 submitted an appeal.", "حساب الوسيط u_022 قدّم طعناً.", "system", true],
  ]);
  await notif(users.broker.id, [
    ["Lead moved to negotiation", "عميل في مرحلة التفاوض", "Tariq Bin Zayed accepted the revised offer terms.", "قبل طارق بن زايد الشروط المعدلة للعرض.", "lead", false],
    ["Commission CMP-2026-023 approved", "تمت الموافقة على العمولة CMP-2026-023", "AED 51,800 approved — payout next cycle.", "تمت الموافقة على ٥١٬٨٠٠ درهم — الصرف في الدورة القادمة.", "payment", true],
  ]);
  await notif(users.agent.id, [
    ["Target checkpoint — 58% of Q4 deals", "نقطة تقييم — ٥٨٪ من صفقات الربع", "You are ahead of pace on Q4 targets.", "أنت متقدم على وتيرة أهداف الربع الرابع.", "system", false],
    ["New lead assigned", "تم إسناد عميل جديد", "Karan Mehta — 1br in JLT.", "كاران ميهتا — غرفة بجي إل تي.", "lead", false],
  ]);
  await notif(users.facility.id, [
    ["Urgent ticket: access control offline", "تذكرة عاجلة: نظام الدخول معطل", "Lobby reader offline at Burj Royale — SLA 4h.", "قارئ البهو معطل في برج رويال — مدة الاستجابة ٤ ساعات.", "ticket", false],
    ["Inspection overdue", "معاينة متأخرة", "Routine inspection at The Pinnacle is 3 days overdue.", "المعاينة الدورية في ذا بيناكل متأخرة ٣ أيام.", "ticket", true],
  ]);
  await notif(users.leasing.id, [
    ["2 viewings scheduled today", "معاينتان اليوم", "Anna Kowalska 11:00 — Marina Gate I; Ivan Sokolov 16:00 — The Pinnacle.", "آنا كوالسكا ١١:٠٠ مارينا جيت؛ إيفان سوكولوف ١٦:٠٠ ذا بيناكل.", "lead", false],
    ["New application: Ritesh Bhatia", "طلب جديد: ريتيش بهاتيا", "Screening score 88 — requires your review.", "درجة الفرز ٨٨ — بحاجة لمراجعتك.", "lead", true],
  ]);

  // login timestamps
  for (const k of Object.keys(users)) {
    await db.user.update({ where: { id: users[k].id }, data: { lastLoginAt: days(-int(0, 3)) } });
  }

  const counts = {
    users: await db.user.count(), properties: await db.property.count(), units: await db.unit.count(),
    leases: await db.lease.count(), claims: await db.claim.count(), tickets: await db.ticket.count(),
    leads: await db.lead.count(), waitlist: await db.waitlistEntry.count(), notifications: await db.notification.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
