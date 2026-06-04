import { test, expect } from "@playwright/test";

const DEMO_EMAIL = "demo@exemplu.ro";
const DEMO_PASSWORD = "demo123";

test.describe("Authentication", () => {
  test("shows validation error on empty submit", async ({ page }) => {
    await page.goto("/autentificare");
    await page.getByRole("button", { name: /autentifica/i }).click();
    // HTML5 required validation prevents submission — email field is invalid
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeFocused();
  });

  test("logs in with valid demo credentials and redirects to dashboard", async ({ page }) => {
    await page.goto("/autentificare");
    await page.getByLabel(/email/i).fill(DEMO_EMAIL);
    await page.getByLabel(/parola/i).fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: /autentifica/i }).click();
    await expect(page).toHaveURL(/\/cont/);
    await expect(page.getByText(/programări/i).first()).toBeVisible();
  });

  test("shows error toast on wrong password", async ({ page }) => {
    await page.goto("/autentificare");
    await page.getByLabel(/email/i).fill(DEMO_EMAIL);
    await page.getByLabel(/parola/i).fill("wrongpassword");
    await page.getByRole("button", { name: /autentifica/i }).click();
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible();
  });

  test("password show/hide toggle works", async ({ page }) => {
    await page.goto("/autentificare");
    const passwordInput = page.getByLabel(/parola/i);
    await expect(passwordInput).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: /show password/i }).click();
    await expect(passwordInput).toHaveAttribute("type", "text");
  });

  test("link to register page works", async ({ page }) => {
    await page.goto("/autentificare");
    await page.getByRole("link", { name: /inregistreaza/i }).click();
    await expect(page).toHaveURL(/\/inregistrare/);
  });

  test("logs out from the dashboard", async ({ page }) => {
    await page.goto("/autentificare");
    await page.getByLabel(/email/i).fill(DEMO_EMAIL);
    await page.getByLabel(/parola/i).fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: /autentifica/i }).click();
    await expect(page).toHaveURL(/\/cont/);
    // click logout button (LogOut icon button in nav)
    await page.getByRole("button", { name: /deconectare/i }).first().click();
    await expect(page).toHaveURL(/\//);
  });
});
