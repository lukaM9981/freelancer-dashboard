import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { installFakeScreenShare } from "../playwright/fake-screen";
import { SEEDED_DESCRIPTION, seedLastMonth } from "./seed-last-month";

/**
 * The work loop, through the UI, on the test project (Tech.md §16).
 * `npm run test:e2e` empties that project, bootstraps the Admin, and starts the server.
 */

const password = required("E2E_PASSWORD");
const adminEmail = required("E2E_ADMIN_EMAIL");
const adminName = required("E2E_ADMIN_NAME");
const adminToken = required("E2E_ADMIN_TOKEN");
const freelancerEmail = required("E2E_FREELANCER_EMAIL");
const freelancerName = required("E2E_FREELANCER_NAME");
const lastMonthStart = required("E2E_LAST_MONTH_START");
const lastMonth = required("E2E_LAST_MONTH");
const lastMonthLabel = required("E2E_LAST_MONTH_LABEL");
const dbUrl = required("SUPABASE_TEST_DB_URL");

const PROJECT = "Smoke Site";
const TIMED_TASK = "Homepage";
const SEEDED_TASK = "Contact form";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing. Run this through npm run test:e2e.`);
  return value;
}

test("bootstrap through a closed month and a CSV", async ({ browser }) => {
  const admin = await browser.newContext();
  const freelancer = await browser.newContext();
  await installFakeScreenShare(admin);
  await installFakeScreenShare(freelancer);
  const adminPage = await admin.newPage();
  const freelancerPage = await freelancer.newPage();

  await acceptInvitation(adminPage, `/invite/${adminToken}`, adminName);

  await adminPage.goto("/people");
  await expect(adminPage.getByRole("heading", { name: "People" })).toBeVisible();
  await expect(adminPage.getByRole("row", { name: new RegExp(adminEmail) })).toBeVisible();
  await adminPage.getByRole("button", { name: "Invite Person" }).click();
  const invite = adminPage.getByRole("dialog");
  await invite.getByLabel("Name").fill(freelancerName);
  await invite.getByLabel("Email").fill(freelancerEmail);
  await invite.getByRole("button", { name: "Send Invite" }).click();
  const linkDialog = adminPage.getByRole("dialog").filter({ hasText: "Copy the invitation link" });
  await expect(linkDialog).toBeVisible();
  const inviteUrl = (await linkDialog.locator(".font-mono").innerText()).trim();
  expect(inviteUrl).toMatch(/\/invite\/[A-Za-z0-9_-]{43}$/);

  await acceptInvitation(freelancerPage, inviteUrl, freelancerName);

  await adminPage.goto("/projects");
  await adminPage.getByRole("button", { name: "New Project" }).click();
  const projectDialog = adminPage.getByRole("dialog");
  await projectDialog.getByLabel("Name").fill(PROJECT);
  await projectDialog.getByLabel("Description").fill("A site used by the smoke test.");
  await projectDialog.getByRole("button", { name: "Create Project" }).click();
  await expect(adminPage).toHaveURL(/\/projects\/[0-9a-f-]{36}$/);
  await expect(adminPage.getByRole("heading", { name: PROJECT })).toBeVisible();

  await adminPage.getByLabel("Add a freelancer").click();
  await adminPage.getByRole("option", { name: freelancerName, exact: true }).click();
  await adminPage.getByRole("button", { name: "Add Member" }).click();
  await expect(adminPage.getByText("Member added.")).toBeVisible();
  await expect(adminPage.getByRole("link", { name: freelancerName })).toBeVisible();

  await adminPage.goto("/people");
  await adminPage.getByRole("link", { name: `Edit ${freelancerName}` }).click();
  await expect(adminPage.getByRole("heading", { name: freelancerName })).toBeVisible();
  await adminPage.getByLabel("Amount").fill("45");
  await adminPage.getByLabel("Effective from").fill(lastMonthStart);
  await adminPage.getByRole("button", { name: "Add Rate" }).click();
  await expect(adminPage.getByText("Rate added.")).toBeVisible();
  await expect(adminPage.getByText("€45.00 / h")).toBeVisible();

  const homepageUrl = await createEstimatedTask(freelancerPage, {
    title: TIMED_TASK,
    description: "The public homepage.",
    minimum: "1h",
    maximum: "1h",
  });
  await createEstimatedTask(freelancerPage, {
    title: SEEDED_TASK,
    description: "A contact form.",
    minimum: "2h",
    maximum: "4h",
  });

  await openProject(freelancerPage);
  await freelancerPage.getByRole("link", { name: "Submit Proposal" }).click();
  await expect(freelancerPage.getByRole("heading", { name: "New proposal" })).toBeVisible();
  await freelancerPage.getByRole("checkbox", { name: "Select every task with an estimate" }).click();
  await freelancerPage.getByRole("button", { name: "Submit Proposal" }).click();
  await expect(freelancerPage).toHaveURL(/\/approvals\/[0-9a-f-]{36}$/);
  await expect(freelancerPage.getByRole("heading", { name: "Your proposal" })).toBeVisible();

  await adminPage.goto("/approvals");
  await adminPage.getByRole("link", { name: /2 items/ }).click();
  await expect(adminPage.getByRole("heading", { name: `Proposal from ${freelancerName}` })).toBeVisible();
  await adminPage.getByRole("button", { name: "Approve All Remaining" }).click();
  await adminPage.getByRole("dialog").getByRole("button", { name: "Approve All", exact: true }).click();
  await expect(adminPage.getByText("2 items approved.")).toBeVisible();
  await expect(adminPage.getByRole("button", { name: "Approve All Remaining" })).toHaveCount(0);

  await freelancerPage.goto(homepageUrl);
  await freelancerPage.getByRole("button", { name: "Start Timer", exact: true }).click();
  await expect(freelancerPage.getByRole("region", { name: "Running timer" })).toBeVisible();
  await freelancerPage.getByRole("button", { name: "Stop Timer", exact: true }).click();
  const review = freelancerPage.getByRole("dialog");
  await review.getByLabel("What did you work on?").fill("A short timed pass.");
  await review.getByRole("button", { name: "Save Time" }).click();
  await expect(freelancerPage.getByRole("dialog")).toBeHidden();
  await expect(freelancerPage.getByRole("region", { name: "Running timer" })).toHaveCount(0);
  await expect(freelancerPage.getByRole("button", { name: "Start Timer", exact: true })).toBeVisible();

  await freelancerPage.getByRole("button", { name: "Add Time" }).click();
  const addTime = freelancerPage.getByRole("dialog");
  await addTime.getByLabel("Duration").fill("2h");
  await addTime.getByLabel("What did you work on?").fill("Layout past the ceiling.");
  await addTime.getByRole("button", { name: "Add Time" }).click();
  await expect(freelancerPage.getByText("Time added.")).toBeVisible();
  await expect(
    freelancerPage.getByRole("row", { name: /Layout past the ceiling/ }).getByText(/^\d+m$/),
  ).toBeVisible();

  await freelancerPage.getByRole("button", { name: "Request Extra Hours" }).first().click();
  const extra = freelancerPage.getByRole("dialog");
  await extra.getByLabel("Extra hours").fill("1h");
  await extra.getByLabel("Reason").fill("The homepage needs another pass.");
  await extra.getByRole("button", { name: "Request Extra Hours" }).click();
  await expect(freelancerPage.getByText("Extra hours requested.")).toBeVisible();

  await adminPage.goto("/approvals");
  await adminPage.getByRole("link", { name: /Extra-hours request/ }).click();
  await expect(adminPage.getByRole("heading", { name: TIMED_TASK })).toBeVisible();
  await adminPage.getByRole("button", { name: "Approve Extra Hours" }).click();
  await expect(adminPage.getByText("Approved 1h of extra hours.")).toBeVisible();

  await freelancerPage.goto(homepageUrl);
  await expect(
    freelancerPage.getByRole("row", { name: /Layout past the ceiling/ }).getByText(/^\d+m$/),
  ).toHaveCount(0);
  await freelancerPage.getByRole("button", { name: "Mark Done", exact: true }).click();
  const done = freelancerPage.getByRole("dialog");
  await done.getByLabel("Comment").fill("Ready for review.");
  await done.getByRole("button", { name: "Mark Done" }).click();
  await expect(freelancerPage.getByText("Task marked Done.")).toBeVisible();
  await expect(freelancerPage.getByText("Done", { exact: true }).first()).toBeVisible();

  await adminPage.goto("/approvals");
  await adminPage.getByRole("link", { name: /Marked Done/ }).click();
  await expect(adminPage.getByRole("heading", { name: TIMED_TASK })).toBeVisible();
  await adminPage.getByRole("button", { name: "Accept", exact: true }).click();
  await adminPage.getByRole("dialog").getByRole("button", { name: "Accept", exact: true }).click();
  await expect(adminPage.getByText("Task accepted.")).toBeVisible();
  await expect(adminPage.getByText("Accepted", { exact: true }).first()).toBeVisible();

  // Homepage is accepted, so it cannot take more time. Last month's entry goes on the other task.
  await seedLastMonth(dbUrl, freelancerEmail, SEEDED_TASK);

  await adminPage.goto("/months");
  const monthRow = adminPage.getByRole("row", { name: new RegExp(lastMonthLabel) });
  await monthRow.getByRole("button", { name: "Close Month" }).click();
  await adminPage.getByRole("dialog").getByRole("button", { name: "Close Month" }).click();
  await expect(adminPage.getByText(`${lastMonthLabel} is closed.`)).toBeVisible();
  await expect(monthRow.getByText("Closed", { exact: true })).toBeVisible();

  await adminPage.goto(`/reports/${lastMonth}`);
  await expect(adminPage.getByRole("heading", { name: lastMonthLabel })).toBeVisible();
  const downloadPromise = adminPage.waitForEvent("download");
  await adminPage.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`olifant-workboard-${lastMonth}.csv`);
  const file = await download.path();
  if (!file) throw new Error("The CSV download was not saved.");
  const csv = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  const rows = csv.split(/\r?\n/).filter((line) => line.length > 0);
  expect(rows).toHaveLength(2);
  expect(rows[1]).toContain(freelancerName);
  expect(rows[1]).toContain(PROJECT);
  expect(rows[1]).toContain(SEEDED_TASK);
  expect(rows[1]).toContain(SEEDED_DESCRIPTION);
  expect(rows[1]).toContain("manual");
  expect(rows[1]).toContain("67.50");
  expect(csv).not.toContain("Layout past the ceiling.");
});

async function acceptInvitation(page: Page, url: string, fullName: string) {
  await page.goto(url);
  await expect(page.getByRole("heading", { name: "Set up your account" })).toBeVisible();
  await expect(page.getByLabel("Your name")).toHaveValue(fullName);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

async function openProject(page: Page) {
  await page.goto("/projects");
  await page.getByRole("link", { name: PROJECT, exact: true }).click();
  await expect(page.getByRole("heading", { name: PROJECT })).toBeVisible();
}

async function createEstimatedTask(
  page: Page,
  task: { title: string; description: string; minimum: string; maximum: string },
) {
  await openProject(page);
  await page.getByRole("link", { name: "New Task" }).click();
  await expect(page.getByRole("heading", { name: "New task" })).toBeVisible();
  await page.getByLabel("Title").fill(task.title);
  await page.getByLabel("Description").fill(task.description);
  await page.getByLabel("Minimum").fill(task.minimum);
  await page.getByLabel("Maximum").fill(task.maximum);
  await page.getByRole("button", { name: "Create Task" }).click();
  await expect(page).toHaveURL(/\/tasks\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: task.title })).toBeVisible();
  return page.url();
}
