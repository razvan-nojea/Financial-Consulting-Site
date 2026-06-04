import { test, expect } from "@playwright/test";

test.describe("Public navigation", () => {
  test("home page loads with tagline and CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/consultanta financiara gratuita/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /incepe acum/i })).toBeVisible();
  });

  test("about page is reachable via nav link", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /despre/i }).first().click();
    await expect(page).toHaveURL(/\/despre/);
  });

  test("services page is reachable via nav link", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /servicii/i }).first().click();
    await expect(page).toHaveURL(/\/servicii/);
  });

  test("contact page is reachable via nav link", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /contact/i }).first().click();
    await expect(page).toHaveURL(/\/contact/);
  });

  test("unauthenticated user is redirected to login when visiting dashboard", async ({ page }) => {
    await page.goto("/cont/programari");
    await expect(page).toHaveURL(/\/autentificare/);
  });

  test("registration page renders all fields", async ({ page }) => {
    await page.goto("/inregistrare");
    await expect(page.getByLabel(/prenume/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/parola/i).first()).toBeVisible();
  });
});

test.describe("Statistics page", () => {
  test("statistics page shows charts and table side by side after login", async ({ page }) => {
    await page.goto("/autentificare");
    await page.getByLabel(/email/i).fill("demo@exemplu.ro");
    await page.getByLabel(/parola/i).fill("demo123");
    await page.getByRole("button", { name: /autentifica/i }).click();
    await expect(page).toHaveURL(/\/cont/);

    await page.goto("/cont/statistici");
    await expect(page.getByRole("heading", { name: /statistici/i })).toBeVisible();
    // Charts panel
    await expect(page.getByText(/programări pe luni/i)).toBeVisible();
    // Table panel with live label
    await expect(page.getByText(/actualizare live/i)).toBeVisible();
  });
});
