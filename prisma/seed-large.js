/**
 * Large-data seed script — populates the database with realistic bulk data for
 * performance testing and statistics demonstration.
 *
 *   200 fake users  (Romanian-style names / emails via @faker-js/faker)
 *   5 000 appointments spread across all users and 10 service types
 *
 * Idempotent: re-running adds rows without deleting existing data.
 *
 * Usage:
 *   node --env-file=.env prisma/seed-large.js
 *
 * NOTE: Not called by `prisma db seed` — that stays the minimal seed.js.
 */
import { PrismaClient } from "@prisma/client";
import { faker }        from "@faker-js/faker/locale/ro";
import { randomUUID }   from "node:crypto";
import { hashPassword } from "../server/auth/password.js";

const prisma = new PrismaClient();

const TOTAL_USERS        = 200;
const TOTAL_APPOINTMENTS = 5_000;
const BATCH_SIZE         = 250;

const SERVICE_NAMES = [
  "Consultanță financiară",
  "Planificare pensie",
  "Gestiunea investițiilor",
  "Audit fiscal",
  "Planificare patrimoniu",
  "Consultanță creditare",
  "Optimizare portofoliu",
  "Analiză risc financiar",
  "Planificare buget personal",
  "Restructurare datorie",
];

const STATUSES = /** @type {const} */ (["pending", "confirmed", "completed", "cancelled"]);

/** @template T @param {T[]} arr @returns {T} */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isoDate(d) { return d.toISOString().slice(0, 10); }
function isoTime(d) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = d.getMinutes() < 30 ? "00" : "30";
  return `${h}:${m}`;
}

async function main() {
  console.log("── Large-data seed ───────────────────────────────────────────");

  // ── Ensure roles exist ────────────────────────────────────────────────────
  const userRole = await prisma.role.upsert({
    where: { name: "user" }, update: {}, create: { name: "user" },
  });

  // ── Upsert services ───────────────────────────────────────────────────────
  console.log("Upserting services…");
  const serviceIds = [];
  for (const name of SERVICE_NAMES) {
    const svc = await prisma.service.upsert({
      where: { name }, update: {}, create: { name },
    });
    serviceIds.push(svc.id);
  }
  console.log(`  ✓ ${serviceIds.length} services ready.`);

  // ── Create 200 fake users ─────────────────────────────────────────────────
  console.log(`Creating up to ${TOTAL_USERS} fake users…`);
  const passwordHash = await hashPassword("parola123");

  /** @type {{ id: string; email: string }[]} */
  const users = [];

  for (let i = 0; i < TOTAL_USERS; i++) {
    const firstName = faker.person.firstName();
    const lastName  = faker.person.lastName();
    const name      = `${firstName} ${lastName}`;
    // Build a clean email: lowercase letters, digits, dots and @
    const raw   = faker.internet.email({ firstName, lastName, provider: "exemplu.ro" });
    const email = raw.toLowerCase().replace(/[^a-z0-9@._+-]/g, "");
    const id    = randomUUID();

    try {
      const user = await prisma.user.upsert({
        where:  { email },
        update: {},
        create: { id, email, passwordHash, name },
      });
      await prisma.userRole.upsert({
        where:  { userId_roleId: { userId: user.id, roleId: userRole.id } },
        update: {},
        create: { userId: user.id, roleId: userRole.id },
      });
      users.push({ id: user.id, email: user.email });
    } catch {
      // Duplicate email from Faker — skip silently
    }
  }
  console.log(`  ✓ ${users.length} users upserted.`);

  if (users.length === 0) {
    console.warn("  No users available — skipping appointments.");
    return;
  }

  // ── Create 5 000 appointments ─────────────────────────────────────────────
  console.log(`Creating ${TOTAL_APPOINTMENTS} appointments in batches of ${BATCH_SIZE}…`);

  let total = 0;
  for (let offset = 0; offset < TOTAL_APPOINTMENTS; offset += BATCH_SIZE) {
    const count = Math.min(BATCH_SIZE, TOTAL_APPOINTMENTS - offset);
    const rows = [];

    for (let j = 0; j < count; j++) {
      const owner    = pick(users);
      const apptDate = faker.date.between({ from: "2024-01-01", to: "2027-12-31" });
      rows.push({
        id:         randomUUID(),
        ownerEmail: owner.email,
        serviceId:  pick(serviceIds),
        date:       isoDate(apptDate),
        time:       isoTime(apptDate),
        status:     pick(STATUSES),
        clientName: `${faker.person.firstName()} ${faker.person.lastName()}`,
        phone:      faker.phone.number("07########"),
        notes:      Math.random() > 0.6 ? faker.lorem.sentence() : "",
        createdAt:  isoDate(new Date()),
      });
    }

    await prisma.appointment.createMany({ data: rows, skipDuplicates: true });
    total += rows.length;
    process.stdout.write(`\r  ✓ ${total} / ${TOTAL_APPOINTMENTS}…`);
  }

  console.log(`\n  ✓ ${total} appointments inserted.`);
  console.log("── Seed complete ─────────────────────────────────────────────");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
