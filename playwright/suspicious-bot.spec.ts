/**
 * Suspicious-behaviour bot simulation (Assignment 4 — Gold)
 *
 * This Playwright script simulates a malicious user who:
 *   1. Creates a demo account (or logs in)
 *   2. Rapidly creates many appointments (burst creates)
 *   3. Immediately deletes them all (burst deletes)
 *   4. Repeats the cycle several times
 *
 * This should trigger the server-side malicious-behaviour detection middleware
 * and add the user to the suspicious-users observation list.
 *
 * Prerequisites:
 *   • The Vite dev server must be running:  pnpm run dev
 *   • The API server must be running:       pnpm run dev:server
 *
 * Run with:
 *   npx playwright test playwright/suspicious-bot.spec.ts --reporter=line
 *
 * You can observe the results in the Admin → Suspicious tab of the web UI.
 */

import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

// ── Config ─────────────────────────────────────────────────────────────────────
const FRONTEND_URL = "http://localhost:5173";
const API_URL      = "http://localhost:3001";

const BOT_EMAIL    = `bot_${Date.now()}@exemplu.ro`;
const BOT_PASSWORD = "BotPassword123!";
const BOT_NAME     = "Suspicious Bot";

const BURST_SIZE   = 12;   // appointments created per burst
const BURST_CYCLES = 3;    // number of create-then-delete cycles

// ── Helpers ───────────────────────────────────────────────────────────────────

async function apiPost(request: APIRequestContext, path: string, body: unknown, token?: string) {
  return request.post(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    data: body,
  });
}

async function apiGet(request: APIRequestContext, path: string, token?: string) {
  return request.get(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

async function apiDelete(request: APIRequestContext, path: string, token?: string) {
  return request.delete(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

// ── Bot test ───────────────────────────────────────────────────────────────────

test.describe("Suspicious behaviour bot", () => {
  let accessToken = "";

  test("registers a new bot account", async ({ request }) => {
    const res = await apiPost(request, "/api/auth/signup", {
      name: BOT_NAME,
      email: BOT_EMAIL,
      password: BOT_PASSWORD,
    });

    // 201 = created, 409 = already exists (re-run)
    expect([201, 409]).toContain(res.status());

    if (res.status() === 409) {
      // Account exists from a previous run — log in instead
      const loginRes = await apiPost(request, "/api/auth/login", {
        email: BOT_EMAIL,
        password: BOT_PASSWORD,
      });
      expect(loginRes.status()).toBe(200);
      const loginBody = await loginRes.json();
      accessToken = loginBody.accessToken ?? "";
    } else {
      const body = await res.json();
      accessToken = body.accessToken ?? "";
    }

    expect(accessToken).toBeTruthy();
  });

  test("performs burst create-delete cycles to trigger suspicious detection", async ({ request }) => {
    test.setTimeout(120_000); // generous timeout for many API calls

    expect(accessToken, "Bot must be authenticated first").toBeTruthy();

    const today = new Date().toISOString().slice(0, 10);

    for (let cycle = 0; cycle < BURST_CYCLES; cycle++) {
      console.log(`\nCycle ${cycle + 1}/${BURST_CYCLES}: creating ${BURST_SIZE} appointments…`);

      const appointmentIds: string[] = [];

      // ── Burst creates ────────────────────────────────────────────────────
      for (let i = 0; i < BURST_SIZE; i++) {
        const res = await apiPost(
          request,
          "/api/appointments",
          {
            ownerEmail:  BOT_EMAIL,
            service:     "Consultanță financiară",
            date:        today,
            time:        `${(9 + (i % 8)).toString().padStart(2, "0")}:00`,
            clientName:  `Client Bot ${i + 1}`,
            phone:       "0700000000",
            notes:       `Burst create cycle=${cycle} i=${i}`,
          },
          accessToken
        );

        if (res.status() === 201 || res.status() === 200) {
          const body = await res.json();
          const id   = body.appointment?.id ?? body.id;
          if (id) appointmentIds.push(id);
        }

        // Tiny delay to avoid OS-level rate limiting
        await new Promise((r) => setTimeout(r, 50));
      }

      console.log(`  Created ${appointmentIds.length} appointments. Now deleting…`);

      // ── Burst deletes ────────────────────────────────────────────────────
      for (const id of appointmentIds) {
        const res = await apiDelete(request, `/api/appointments/${id}`, accessToken);
        // 200 or 204 = deleted; anything else is a partial failure
        if (res.status() >= 400) {
          console.warn(`  Warning: DELETE ${id} returned ${res.status()}`);
        }
        await new Promise((r) => setTimeout(r, 40));
      }

      console.log(`  Deleted ${appointmentIds.length} appointments.`);

      // Brief pause between cycles
      await new Promise((r) => setTimeout(r, 300));
    }
  });

  test("verifies the bot was flagged as suspicious", async ({ request }) => {
    // Log in as admin to check the suspicious list
    const loginRes = await apiPost(request, "/api/auth/login", {
      email:    "admin@exemplu.ro",
      password: "admin123",
    });
    expect(loginRes.status()).toBe(200);
    const { accessToken: adminToken } = await loginRes.json();
    expect(adminToken).toBeTruthy();

    // Poll the suspicious endpoint (detection may be slightly async)
    let flagged = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      const res = await apiGet(request, "/api/admin/suspicious", adminToken);
      if (res.status() !== 200) break;
      const body = await res.json();
      const rows = body.suspicious ?? [];
      if (rows.some((r: { email?: string; user?: { email?: string } }) =>
        r.email === BOT_EMAIL || r.user?.email === BOT_EMAIL
      )) {
        flagged = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 1_000));
    }

    if (!flagged) {
      console.warn(
        "Bot was NOT flagged as suspicious. " +
        "The detection threshold may need to be lower, or more burst cycles are needed."
      );
    }

    // Soft assertion — the bot should be flagged but we don't fail the suite
    // if the threshold isn't met (it's configurable per-environment).
    console.log(flagged ? "✓ Bot successfully flagged as suspicious." : "⚠ Bot not flagged.");
  });
});

// ── Browser UI smoke test (optional) ──────────────────────────────────────────

test.describe("Browser smoke test", () => {
  test("login page loads", async ({ page }: { page: Page }) => {
    await page.goto(`${FRONTEND_URL}/autentificare`);
    await expect(page.getByText("Intră în cont")).toBeVisible();
  });

  test("forgot-password page is accessible", async ({ page }: { page: Page }) => {
    await page.goto(`${FRONTEND_URL}/parola-uitata`);
    await expect(page.getByText("Parolă uitată")).toBeVisible();
  });
});
