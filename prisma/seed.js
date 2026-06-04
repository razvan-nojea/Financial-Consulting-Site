/**
 * Prisma seed script — populates the database with:
 *   • roles (admin, user)
 *   • permissions and role→permission assignments
 *   • demo user accounts (demo@exemplu.ro / admin@exemplu.ro)
 *
 * Service rows are created on-demand by resolveServiceId() when appointments
 * are first added via the API, so no pre-seeding is needed here.
 *
 * Run with:  pnpm exec prisma db seed
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../server/auth/password.js";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database…");

  // ── 1. Roles ─────────────────────────────────────────────────────────────
  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: { name: "admin" },
  });
  const userRole = await prisma.role.upsert({
    where: { name: "user" },
    update: {},
    create: { name: "user" },
  });

  // ── 2. Permissions ────────────────────────────────────────────────────────
  const PERMISSIONS = [
    { name: "appointments:read",   description: "View own appointments" },
    { name: "appointments:write",  description: "Create and update own appointments" },
    { name: "appointments:delete", description: "Delete own appointments" },
    { name: "admin:users",         description: "View all registered users" },
    { name: "admin:logs",          description: "View the action audit trail" },
    { name: "admin:suspicious",    description: "Manage the suspicious-user observation list" },
    { name: "appointments:all",    description: "Admin: read and manage any user's appointments" },
  ];

  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: p.name },
      update: { description: p.description },
      create: p,
    });
  }

  // ── 3. Role → permission assignments ────────────────────────────────────
  const USER_PERMS  = ["appointments:read", "appointments:write", "appointments:delete"];
  const ADMIN_PERMS = [
    ...USER_PERMS,
    "admin:users", "admin:logs", "admin:suspicious", "appointments:all",
  ];

  for (const permName of USER_PERMS) {
    const perm = await prisma.permission.findUnique({ where: { name: permName } });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: userRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: userRole.id, permissionId: perm.id },
    });
  }

  for (const permName of ADMIN_PERMS) {
    const perm = await prisma.permission.findUnique({ where: { name: permName } });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }

  // ── 4. Demo users ────────────────────────────────────────────────────────
  const demoHash  = await hashPassword("demo123");
  const adminHash = await hashPassword("admin123");

  const demoUser = await prisma.user.upsert({
    where:  { email: "demo@exemplu.ro" },
    update: {},
    create: { id: "user-demo", email: "demo@exemplu.ro", passwordHash: demoHash, name: "Cont Demo" },
  });

  const adminUser = await prisma.user.upsert({
    where:  { email: "admin@exemplu.ro" },
    update: {},
    create: { id: "user-admin", email: "admin@exemplu.ro", passwordHash: adminHash, name: "Administrator" },
  });

  // Assign roles (upsert so re-running the seed is safe)
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: demoUser.id, roleId: userRole.id } },
    update: {},
    create: { userId: demoUser.id, roleId: userRole.id },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  console.log(`Seeded 2 roles, ${PERMISSIONS.length} permissions.`);
  console.log("Seeded users: demo@exemplu.ro (user), admin@exemplu.ro (admin).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
