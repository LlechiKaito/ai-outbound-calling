import { test, expect } from "@playwright/test";

const MOCK_KPIS = {
  isSuccess: true,
  data: {
    totalLeads: 10,
    totalCalled: 5,
    successCount: 3,
    successRate: 60,
    avgInterestLevel: 7.2,
    pendingCount: 4,
    retryLimitCount: 1,
  },
};

const MOCK_LEADS = {
  isSuccess: true,
  data: [
    {
      rowIndex: 2,
      companyName: "テスト株式会社",
      contactName: "山田太郎",
      phoneNumber: "+819012345678",
      email: "yamada@example.com",
      status: "完了",
      retryCount: 0,
      lastCalledAt: "2026-02-28 10:00",
      callResult: "応答",
      interestLevel: "8",
      nextAction: "フォロー",
      memo: "良い反応",
    },
    {
      rowIndex: 3,
      companyName: "サンプル株式会社",
      contactName: "佐藤花子",
      phoneNumber: "+819087654321",
      email: "",
      status: "",
      retryCount: 0,
      lastCalledAt: "",
      callResult: "",
      interestLevel: "",
      nextAction: "",
      memo: "",
    },
  ],
};

const MOCK_PENDING_LEADS = {
  isSuccess: true,
  data: [MOCK_LEADS.data[1]],
};

const MOCK_CALL_HISTORY = {
  isSuccess: true,
  data: [
    {
      companyName: "テスト株式会社",
      contactName: "山田太郎",
      phoneNumber: "+819012345678",
      callResult: "応答",
      interestLevel: "8",
      lastCalledAt: "2026-02-28 10:00",
      memo: "良い反応",
    },
  ],
};

const MOCK_STATUS = {
  isSuccess: true,
  data: {
    orchestratorState: "idle",
    processedCount: 0,
    totalLeads: 0,
    currentLead: null,
    spreadsheetUrl: "https://docs.google.com/spreadsheets/d/test-sheet-id",
  },
};

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/dashboard/kpis", (route) =>
      route.fulfill({ json: MOCK_KPIS }),
    );
    await page.route("**/api/dashboard/leads?status=pending", (route) =>
      route.fulfill({ json: MOCK_PENDING_LEADS }),
    );
    await page.route("**/api/dashboard/leads", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ json: MOCK_LEADS });
      }
      return route.fulfill({
        status: 201,
        json: { isSuccess: true, data: null },
      });
    });
    await page.route("**/api/dashboard/call-history", (route) =>
      route.fulfill({ json: MOCK_CALL_HISTORY }),
    );
    await page.route("**/api/dashboard/status", (route) =>
      route.fulfill({ json: MOCK_STATUS }),
    );
  });

  test("should display KPI cards with correct values", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.locator("#kpi-total-leads")).toHaveText("10");
    await expect(page.locator("#kpi-total-called")).toHaveText("5");
    await expect(page.locator("#kpi-success-count")).toHaveText("3");
    await expect(page.locator("#kpi-success-rate")).toHaveText("60%");
    await expect(page.locator("#kpi-avg-interest")).toHaveText("7.2");
    await expect(page.locator("#kpi-pending")).toHaveText("4");
    await expect(page.locator("#kpi-retry-limit")).toHaveText("1");
  });

  test("should display lead list", async ({ page }) => {
    await page.goto("/dashboard");

    const rows = page.locator("#leads-tbody tr");
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toContainText("テスト株式会社");
    await expect(rows.first()).toContainText("山田太郎");
    await expect(rows.nth(1)).toContainText("サンプル株式会社");
  });

  test("should filter leads by pending tab", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForSelector("#leads-tbody tr");

    await page.click('[data-tab="pending"]');
    await page.waitForTimeout(500);

    const rows = page.locator("#leads-tbody tr");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("サンプル株式会社");
  });

  test("should display call history", async ({ page }) => {
    await page.goto("/dashboard");

    const rows = page.locator("#history-tbody tr");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("テスト株式会社");
    await expect(rows.first()).toContainText("良い反応");
  });

  test("should show orchestrator state as idle", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.locator("#orchestrator-state")).toHaveText("待機中");
    await expect(page.locator("#btn-start")).toBeEnabled();
    await expect(page.locator("#btn-pause")).toBeDisabled();
    await expect(page.locator("#btn-resume")).toBeDisabled();
    await expect(page.locator("#btn-stop")).toBeDisabled();
  });

  test("should have Google Sheets link", async ({ page }) => {
    await page.goto("/dashboard");

    const link = page.locator("#sheets-link");
    await expect(link).toHaveAttribute("href", "https://docs.google.com/spreadsheets/d/test-sheet-id");
  });

  test("should toggle add lead form", async ({ page }) => {
    await page.goto("/dashboard");

    const form = page.locator("#add-lead-form");
    await expect(form).toBeHidden();

    await page.click("#btn-add-lead");
    await expect(form).toBeVisible();

    await page.click("#add-lead-form button:has-text('キャンセル')");
    await expect(form).toBeHidden();
  });

  test("should submit new lead", async ({ page }) => {
    let addLeadCalled = false;
    await page.route("**/api/dashboard/leads", (route) => {
      if (route.request().method() === "POST") {
        addLeadCalled = true;
        return route.fulfill({
          status: 201,
          json: { isSuccess: true, data: null },
        });
      }
      return route.fulfill({ json: MOCK_LEADS });
    });

    await page.goto("/dashboard");

    await page.click("#btn-add-lead");
    await page.fill("#new-company", "新規会社");
    await page.fill("#new-contact", "新規担当");
    await page.fill("#new-phone", "09011112222");
    await page.fill("#new-email", "new@test.com");
    await page.click("#add-lead-form button:has-text('追加')");

    await page.waitForTimeout(500);
    expect(addLeadCalled).toBe(true);
  });

  test("should show validation error for empty fields", async ({ page }) => {
    await page.goto("/dashboard");

    await page.click("#btn-add-lead");
    await page.click("#add-lead-form button:has-text('追加')");

    const error = page.locator("#add-lead-error");
    await expect(error).toBeVisible();
    await expect(error).toContainText("必須");
  });

  test("should update controls when orchestrator is running", async ({ page }) => {
    await page.route("**/api/dashboard/status", (route) =>
      route.fulfill({
        json: {
          isSuccess: true,
          data: {
            orchestratorState: "running",
            processedCount: 2,
            totalLeads: 5,
            currentLead: { companyName: "進行中会社", contactName: "進行中名前", phoneNumber: "+819099999999" },
            spreadsheetUrl: "https://docs.google.com/spreadsheets/d/test-sheet-id",
          },
        },
      }),
    );

    await page.goto("/dashboard");

    await expect(page.locator("#orchestrator-state")).toHaveText("実行中");
    await expect(page.locator("#btn-start")).toBeDisabled();
    await expect(page.locator("#btn-pause")).toBeEnabled();
    await expect(page.locator("#btn-stop")).toBeEnabled();
    await expect(page.locator("#live-progress")).toContainText("2 / 5 件");
    await expect(page.locator("#live-current-lead")).toContainText("進行中会社");
  });
});
