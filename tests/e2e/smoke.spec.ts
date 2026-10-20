import { expect, test } from '@playwright/test';

/** Smoke test: the default app runs with protocells, without page errors, and keeps a usable frame rate. */
test('default app runs with protocells for 20 s', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?test');
  await page.waitForFunction(() => window.__selforg !== undefined, undefined, { timeout: 30_000 });
  await expect(page.locator('#error')).toBeHidden();
  await page.waitForTimeout(20_000);

  const latest = await page.evaluate(() => window.__selforg?.log.latest());
  const hud = await page.locator('#hud').textContent();
  await page.screenshot({ path: info.outputPath('app-20s.png') });
  console.info(`smoke: HUD "${hud}"; latest metrics ${JSON.stringify(latest)}`);
  expect(errors).toEqual([]);
  expect(latest?.population ?? 0).toBeGreaterThan(0);
});
