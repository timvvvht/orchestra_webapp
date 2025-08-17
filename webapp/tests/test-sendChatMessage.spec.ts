import { test, expect } from "@playwright/test";

test.describe("Mock Chat Message Tests", () => {
  test("should send mock request to ACS endpoint", async ({ request }) => {
    const response = await request.post(
      "https://orchestra-acs.fly.dev/acs/converse/mock",
      {
        headers: { "Content-Type": "application/json" },
        data: {
          session_id: "mock_session_123",
          user_id: "f1948b82-7d6a-407e-860d-5a3acea11b8b",
          scenario: "tool_execution",
          delay_ms: 300,
        },
      }
    );

    console.log(JSON.stringify(response, null, 2));

    expect(response.ok()).toBeTruthy();
  });

  test("should test ChatMainMockTest component", async ({ page }) => {
    await page.goto("/mock-test");
    await expect(page.locator("h2")).toContainText("Mock Event Testing");

    // Click tool execution button
    await page.click('button:has-text("Tool Execution")');

    // Wait for message to appear
    await expect(page.locator(".bg-white\\/5")).toBeVisible();
  });
});
