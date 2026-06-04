/**
 * UsersRepository — Prisma-backed persistence for users, roles and permissions.
 *
 * The repository exposes a clean domain-level API so callers never touch
 * the raw Prisma client directly.
 */
import { PrismaClient } from "@prisma/client";

const defaultPrisma = new PrismaClient();

/**
 * @param {object} user  raw Prisma user record with userRoles relation
 * @returns {{id,email,passwordHash,name,role,createdAt}}
 */
function mapUser(user) {
  const role = user.userRoles?.[0]?.role?.name ?? "user";
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    name: user.name,
    role,
    createdAt: user.createdAt instanceof Date
      ? user.createdAt.toISOString()
      : user.createdAt,
  };
}

const WITH_ROLE = { include: { userRoles: { include: { role: true } } } };

export class UsersRepository {
  constructor(client = defaultPrisma) {
    this.prisma = client;
  }

  /** Find a user by email (case-insensitive). Returns null if not found. */
  async findByEmail(email) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      ...WITH_ROLE,
    });
    return user ? mapUser(user) : null;
  }

  /** Find a user by id. Returns null if not found. */
  async findById(id) {
    const user = await this.prisma.user.findUnique({ where: { id }, ...WITH_ROLE });
    return user ? mapUser(user) : null;
  }

  /** Returns all users ordered by creation date descending. */
  async findAll() {
    const users = await this.prisma.user.findMany({
      ...WITH_ROLE,
      orderBy: { createdAt: "desc" },
    });
    return users.map(mapUser);
  }

  /**
   * Creates a new user and assigns them to a role.
   * @param {{id, email, passwordHash, name, roleId}} params
   */
  async create({ id, email, passwordHash, name, roleId }) {
    const user = await this.prisma.user.create({
      data: {
        id,
        email: email.toLowerCase(),
        passwordHash,
        name,
        userRoles: { create: { roleId } },
      },
      ...WITH_ROLE,
    });
    return mapUser(user);
  }

  /**
   * Updates the password hash for a user.
   * @param {string} userId
   * @param {string} passwordHash
   */
  async updatePassword(userId, passwordHash) {
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  /** Returns the role record with the given name, or null. */
  async getRoleByName(name) {
    return this.prisma.role.findUnique({ where: { name } });
  }

  /**
   * Returns the list of permission names granted to a role.
   * @param {string} roleName
   * @returns {Promise<string[]>}
   */
  async getPermissionsForRole(roleName) {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
      include: { rolePermissions: { include: { permission: true } } },
    });
    if (!role) return [];
    return role.rolePermissions.map((rp) => rp.permission.name);
  }
}
