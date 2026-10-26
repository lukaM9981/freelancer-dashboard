import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { installFakeScreenShare } from "../playwright/fake-screen";

type Routes = {
  projectId: string;
  trackedTaskId: string;
  draftTaskId: string;
  proposalId: string;
  personId: string;
  inviteToken: string;
};

function loadRoutes(): Routes {
  try {
    return JSON.parse(readFileSync("a11y/routes.json", "utf8")) as Routes;
  } catch {
    throw new Error("a11y/routes.json is missing. Run npm run test:a11y.");
  }
}

const routes = loadRoutes();

test.beforeEach(async ({ page }) => {
  await installFakeScreenShare(page);
});

const publicScreens = [
  { name: "Sign in", path: "/login" },
  { name: "Forgot password", path: "/forgot-password" },
  { name: "Reset password", path: "/reset-password" },
  { name: "Accept invitation", path: `/invite/${routes.inviteToken}` },
];

const adminScreens = [
  { name: "Dashboard", path: "/dashboard" },
  { name: "Approvals", path: "/approvals" },
  { name: "Projects", path: "/projects" },
  { name: "Project", path: `/projects/${routes.projectId}` },
  { name: "Task", path: `/tasks/${routes.trackedTaskId}` },
  { name: "Task editor", path: `/tasks/${routes.draftTaskId}/edit` },
  { name: "Proposal", path: `/approvals/${routes.proposalId}` },
  { name: "Reports", path: "/reports" },
  { name: "Months", path: "/months" },
  { name: "People", path: "/people" },
  { name: "Person", path: `/people/${routes.personId}` },
  { name: "Audit log", path: "/audit" },
  { name: "Notifications", path: "/notifications" },
  { name: "Settings", path: "/settings" },
  { name: "Profile", path: "/profile" },
];

const freelancerScreens = [
  { name: "Dashboard", path: "/dashboard" },
  { name: "Projects", path: "/projects" },
  { name: "Project", path: `/projects/${routes.projectId}` },
  { name: "Task", path: `/tasks/${routes.trackedTaskId}` },
  { name: "Task editor", path: `/tasks/${routes.draftTaskId}/edit` },
  { name: "New task", path: `/tasks/new?project=${routes.projectId}` },
  { name: "New proposal", path: `/proposals/new?project=${routes.projectId}` },
  { name: "Proposal", path: `/approvals/${routes.proposalId}` },
  { name: "My time", path: "/time" },
  { name: "Reports", path: "/reports" },
  { name: "Notifications", path: "/notifications" },
  { name: "Profile", path: "/profile" },
];

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const details = results.violations
    .map((violation) => {
      const nodes = violation.nodes.map((node) => node.target.join(" ")).join("\n    ");
      return `${violation.id} (${violation.impact}): ${violation.help}\n    ${nodes}`;
    })
    .join("\n");
  expect(results.violations, details).toEqual([]);
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function openScreen(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page).not.toHaveURL(/\/login/);
}

test.describe("keyboard", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("sign-in fields and the button show a visible focus", async ({ page }) => {
    await page.goto("/login");
    const email = page.getByLabel("Email");
    if (!(await email.evaluate((element) => element === document.activeElement))) {
      await page.keyboard.press("Tab");
    }
    await expect(email).toBeFocused();
    await expectVisibleFocus(page);

    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Password")).toBeFocused();
    await expectVisibleFocus(page);

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Show password" })).toBeFocused();
    await expectVisibleFocus(page);

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Forgot your password?" })).toBeFocused();
    await expectVisibleFocus(page);

    await page.keyboard.press("Tab");
    await expect(page.getByRole("checkbox", { name: "Remember me" })).toBeFocused();
    await expectVisibleFocus(page);

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Sign In" })).toBeFocused();
    await expectVisibleFocus(page);
  });
});

for (const width of [360, 768, 1280]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test.describe("public", () => {
      for (const screen of publicScreens) {
        test(screen.name, async ({ page }) => {
          await page.goto(screen.path);
          const heading = page.getByRole("heading", { level: 1 });
          await expect(heading).toBeVisible();
          if (screen.path.startsWith("/invite/")) {
            await expect(heading).toHaveText("Set up your account");
          }
          await expectAccessible(page);
          await expectNoHorizontalScroll(page);
        });
      }
    });

    test.describe("admin", () => {
      test.use({ storageState: "a11y/.auth/admin.json" });

      for (const screen of adminScreens) {
        test(screen.name, async ({ page }) => {
          await openScreen(page, screen.path);
          await expectAccessible(page);
          await expectNoHorizontalScroll(page);
        });
      }
    });

    test.describe("freelancer", () => {
      test.use({ storageState: "a11y/.auth/freelancer.json" });

      for (const screen of freelancerScreens) {
        test(screen.name, async ({ page }) => {
          await openScreen(page, screen.path);
          await expectAccessible(page);
          await expectNoHorizontalScroll(page);
        });
      }
    });
  });
}

test.describe("phone actions", () => {
  test.use({
    viewport: { width: 360, height: 900 },
    storageState: "a11y/.auth/freelancer.json",
  });

  test("adding time is a full-width control and the dialog closes without saving", async ({ page }) => {
    await openScreen(page, "/time");
    const add = page.getByRole("button", { name: "Add Time" });
    const box = await add.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(40);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(280);
    await add.click();
    await expect(page.getByRole("heading", { name: "Add time" })).toBeVisible();
    await expectAccessible(page);
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("heading", { name: "Add time" })).toBeHidden();
  });

  test("starting and stopping the timer is comfortable, then the run is discarded", async ({ page }) => {
    await openScreen(page, `/tasks/${routes.trackedTaskId}`);
    const start = page.getByRole("button", { name: "Start Timer" });
    const startBox = await start.boundingBox();
    expect(startBox?.height ?? 0).toBeGreaterThanOrEqual(40);
    expect(startBox?.width ?? 0).toBeGreaterThanOrEqual(280);

    await start.click();
    const stop = page.getByRole("button", { name: "Stop timer", exact: true });
    await expect(stop).toBeVisible();
    const stopBox = await stop.boundingBox();
    expect(stopBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(stopBox?.width ?? 0).toBeGreaterThanOrEqual(44);

    await stop.click();
    await expect(page.getByRole("heading", { name: "Save your time" })).toBeVisible();
    await expectAccessible(page);
    await page.getByRole("button", { name: "Discard" }).click();
    await expect(page.getByRole("heading", { name: "Discard this run?" })).toBeVisible();
    await page.getByRole("button", { name: "Discard" }).click();
    await expect(page.getByRole("region", { name: "Running timer" })).toBeHidden();
  });
});

test.describe("proposal decisions", () => {
  test.use({
    viewport: { width: 360, height: 900 },
    storageState: "a11y/.auth/admin.json",
  });

  test("approve, request changes, and reject are comfortable taps", async ({ page }) => {
    await openScreen(page, `/approvals/${routes.proposalId}`);
    for (const name of ["Approve", "Request changes", "Reject"]) {
      const box = await page.getByRole("button", { name, exact: true }).boundingBox();
      expect(box?.height ?? 0, name).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0, name).toBeGreaterThanOrEqual(44);
    }
  });
});

async function expectVisibleFocus(page: Page) {
  const visible = await page.evaluate(() => {
    const element = document.activeElement;
    if (!element || element === document.body) return false;
    const style = getComputedStyle(element);
    const outline = style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0;
    const shadow = style.boxShadow !== "none";
    return outline || shadow;
  });
  expect(visible).toBe(true);
}
