/**
 * InMemorySuspiciousUsersRepository — zero-dependency observation-list store
 * for dev / offline mode.
 *
 * Accepts an optional usersRepository reference so it can embed name/email
 * when returning entries (mirroring the Prisma `include: { user: true }` join).
 * Implements the same interface as the Prisma-backed SuspiciousUsersRepository.
 */

export class InMemorySuspiciousUsersRepository {
  /**
   * @param {import("./in-memory-users-repository.js").InMemoryUsersRepository|null} usersRepository
   */
  constructor(usersRepository = null) {
    this._usersRepo = usersRepository;
    /** @type {Map<string, object>} userId → entry */
    this._entries = new Map();
  }

  /** Attach or re-attach the users repository after construction. */
  setUsersRepository(usersRepository) {
    this._usersRepo = usersRepository;
  }

  async _withUser(entry) {
    let user = { email: entry.userId, name: entry.userId, userRoles: [] };
    if (this._usersRepo) {
      const u = await this._usersRepo.findById(entry.userId);
      if (u) {
        user = { email: u.email, name: u.name, userRoles: [{ role: { name: u.role } }] };
      }
    }
    return { ...entry, user };
  }

  async findAll() {
    const entries = [...this._entries.values()].sort((a, b) => {
      // Unresolved entries come first; within each group sort by detectedAt desc.
      if (!a.resolvedAt && b.resolvedAt) return -1;
      if (a.resolvedAt && !b.resolvedAt) return 1;
      return b.detectedAt - a.detectedAt;
    });
    return Promise.all(entries.map((e) => this._withUser(e)));
  }

  async findByUserId(userId) {
    const entry = this._entries.get(userId);
    if (!entry) return null;
    return this._withUser(entry);
  }

  async upsert({ userId, reason, score, triggeredRules = [] }) {
    const existing = this._entries.get(userId);
    const entry = {
      userId,
      reason,
      score,
      triggeredRules,
      detectedAt: existing?.detectedAt ?? new Date(),
      updatedAt: new Date(),
      resolvedAt: null,
    };
    this._entries.set(userId, entry);
    return entry;
  }

  async resolve(userId) {
    const entry = this._entries.get(userId);
    if (!entry) return null;
    entry.resolvedAt = new Date();
    entry.updatedAt = new Date();
    return { ...entry };
  }
}
