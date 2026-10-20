import { expect, test, type Page } from '@playwright/test';

/** Latest order parameter from the app's metrics log. */
const orderParameter = (page: Page): Promise<number> =>
  page.evaluate(() => window.__selforg?.log.latest()?.orderParameter ?? 0);

test('test 1: after cutting the flux, the order parameter falls below 10% within 30 s', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?test');
  await page.waitForFunction(() => window.__selforg !== undefined, undefined, { timeout: 30_000 });
  await expect(page.locator('#error')).toBeHidden();

  // Field only: the concept under test is the field's dissipative structure.
  await page.evaluate(() => {
    const s = window.__selforg;
    if (!s) return;
    s.state.initialAgents = 0;
    s.reset();
  });

  // Run until stable: order parameter within 2% over 10 s, checked every 2 s, for at most 180 s.
  const history: number[] = [];
  let pre = 0;
  for (let i = 0; i < 90 && pre === 0; i++) {
    await page.waitForTimeout(2000);
    history.push(await orderParameter(page));
    if (history.length > 6) history.shift();
    const first = history[0] as number;
    const last = history[history.length - 1] as number;
    if (history.length === 6 && first > 0 && Math.abs(last - first) / first < 0.02) pre = last;
  }
  const hud = await page.locator('#hud').textContent();
  console.info(`test 1 (browser): stable order parameter ${pre.toFixed(4)}; HUD: ${hud}`);
  expect(pre).toBeGreaterThan(0);

  await page.evaluate(() => {
    const s = window.__selforg;
    if (!s) return;
    s.state.cutFlux = true;
    s.refresh();
  });
  const cutAt = Date.now();
  let fellAfter = -1;
  while (Date.now() - cutAt < 30_000) {
    await page.waitForTimeout(250);
    if ((await orderParameter(page)) < 0.1 * pre) {
      fellAfter = (Date.now() - cutAt) / 1000;
      break;
    }
  }
  console.info(
    `test 1 (browser): ${fellAfter >= 0 ? `below 10% after ${fellAfter.toFixed(1)} s` : `still ${(await orderParameter(page)).toFixed(4)} after 30 s`}`,
  );
  expect(errors).toEqual([]);
  expect(fellAfter).toBeGreaterThanOrEqual(0);
});
