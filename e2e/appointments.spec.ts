import { test, expect } from "@playwright/test";

const DEMO_EMAIL = "demo@exemplu.ro";
const DEMO_PASSWORD = "demo123";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/autentificare");
  await page.getByLabel(/email/i).fill(DEMO_EMAIL);
  await page.getByLabel(/parola/i).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /autentifica/i }).click();
  await expect(page).toHaveURL(/\/cont/);
}

test.describe("Appointments CRUD", () => {
  test("appointments page loads with table and summary cards", async ({ page }) => {
    await login(page);
    await page.goto("/cont/programari");
    await expect(page.getByRole("heading", { name: /programări/i })).toBeVisible();
    // Summary cards
    await expect(page.getByText("Total")).toBeVisible();
    await expect(page.getByText("Viitoare")).toBeVisible();
    // Table headers
    await expect(page.getByRole("columnheader", { name: /serviciu/i })).toBeVisible();
  });

  test("can add a new appointment via dialog", async ({ page }) => {
    await login(page);
    await page.goto("/cont/programari");
    await page.getByRole("button", { name: /adaugă programare/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Fill in the form
    await page.getByLabel(/serviciu/i).fill("Test Playwright Service");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.getByLabel(/data/i).fill(tomorrow.toISOString().split("T")[0]);
    await page.getByLabel(/ora/i).fill("10:00");
    await page.getByLabel(/client/i).fill("Ion Test");

    await page.getByRole("button", { name: /salvează/i }).click();
    // redirected to detail page or dialog closes
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible();
  });

  test("can open appointment detail page", async ({ page }) => {
    await login(page);
    await page.goto("/cont/programari");
    // click first Eye (view details) button
    const viewBtn = page.getByRole("button", { name: /detalii|vezi detalii/i }).first();
    await viewBtn.click();
    await expect(page).toHaveURL(/\/cont\/programari\//);
  });

  test("can delete an appointment with confirmation", async ({ page }) => {
    await login(page);
    await page.goto("/cont/programari");
    const initialCount = await page.locator("tbody tr").count();

    // click first delete button
    await page.getByRole("button", { name: /sterge/i }).first().click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: /da, șterge/i }).click();

    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible();
    const newCount = await page.locator("tbody tr").count();
    expect(newCount).toBeLessThan(initialCount);
  });

  test("search filters appointments list", async ({ page }) => {
    await login(page);
    await page.goto("/cont/programari");
    const searchInput = page.getByPlaceholder(/caută/i);
    await searchInput.fill("pensie");
    // wait for debounce/re-render
    await page.waitForTimeout(300);
    const rows = page.locator("tbody tr");
    const count = await rows.count();
    // Either matches found or empty state shown
    if (count > 0) {
      const firstRow = await rows.first().textContent();
      expect(firstRow?.toLowerCase()).toContain("pensie");
    } else {
      await expect(page.getByText(/nicio programare/i)).toBeVisible();
    }
  });

  test("filter tabs change visible appointments", async ({ page }) => {
    await login(page);
    await page.goto("/cont/programari");
    await page.getByRole("button", { name: /anulate/i }).click();
    // All visible rows should be cancelled (badge text)
    const statusBadges = page.locator("tbody tr");
    const count = await statusBadges.count();
    if (count > 0) {
      // Each row should contain the "Anulat" badge
      const firstText = await page.locator("tbody tr").first().textContent();
      expect(firstText?.toLowerCase()).toContain("anulat");
    }
  });
});
