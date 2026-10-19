import { expect, test as setup } from "@playwright/test";

const password = process.env.A11Y_PASSWORD;
const adminEmail = process.env.A11Y_ADMIN_EMAIL;
const freelancerEmail = process.env.A11Y_FREELANCER_EMAIL;

if (!password || !adminEmail || !freelancerEmail) {
  throw new Error("Sign-in details are missing. Run this through npm run test:a11y.");
}

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

setup("admin session", async ({ page }) => {
  await signIn(page, adminEmail);
  await page.context().storageState({ path: "a11y/.auth/admin.json" });
});

setup("freelancer session", async ({ page }) => {
  await signIn(page, freelancerEmail);
  await page.context().storageState({ path: "a11y/.auth/freelancer.json" });
});
