import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 900 } });

/** Field only (both tests concern the field), at speed 4: 4 ticks per frame. */
async function open(page: Page): Promise<void> {
  await page.goto('/?test');
  await page.waitForFunction(() => window.__selforg !== undefined, undefined, { timeout: 30_000 });
  await expect(page.locator('#error')).toBeHidden();
}

async function fieldOnly(page: Page, seed: number): Promise<void> {
  await page.evaluate((sd) => {
    const s = window.__selforg;
    if (!s) return;
    s.state.seed = sd;
    s.state.initialAgents = 0;
    s.state.speed = 4;
    s.state.view = 1;
    s.refresh();
    s.reset();
  }, seed);
}

test('test 2 (browser): F sweep up then down shows at least one abrupt change', async ({ page }, info) => {
  test.setTimeout(900_000);
  await open(page);
  await fieldOnly(page, 1);
  await page.evaluate(() => window.__selforg?.startSweep());
  await page.waitForFunction(() => window.__selforg?.sweep()?.done === true, undefined, { timeout: 840_000, polling: 2000 });
  const points = (await page.evaluate(() => window.__selforg?.sweep()?.points)) ?? [];
  const branch = (dir: string): number[] => points.filter((p) => p.dir === dir).map((p) => p.order);
  const jumps = (xs: number[]): number => {
    let n = 0;
    for (let i = 1; i < xs.length; i++) {
      const a = Math.max(xs[i - 1] as number, 1e-3);
      const b = Math.max(xs[i] as number, 1e-3);
      if (a / b > 3 || b / a > 3) n++;
    }
    return n;
  };
  const fmt = (dir: string): string =>
    points.filter((p) => p.dir === dir).map((p) => `${p.F.toFixed(4)}:${p.order.toFixed(3)}`).join(' ');
  console.info(`test 2 (browser) up:   ${fmt('up')}`);
  console.info(`test 2 (browser) down: ${fmt('down')}`);
  console.info(`test 2 (browser): ${jumps(branch('up'))} abrupt up, ${jumps(branch('down'))} abrupt down`);
  await page.screenshot({ path: info.outputPath('bifurcation.png'), clip: { x: 0, y: 0, width: 340, height: 900 } });
  expect(branch('up').length).toBe(branch('down').length);
  expect(jumps(branch('up')) + jumps(branch('down'))).toBeGreaterThan(0);
});

test('test 3 (browser): 10 seeds, pairwise |r| < 0.2, wavelength within 15%', async ({ page }) => {
  test.setTimeout(900_000);
  await open(page);
  const fields: number[][] = [];
  const wavelengths: number[] = [];
  for (let seed = 1; seed <= 10; seed++) {
    await fieldOnly(page, seed);
    await page.waitForFunction(() => (window.__selforg?.ticks() ?? 0) >= 6000, undefined, { timeout: 120_000, polling: 500 });
    await page.waitForTimeout(400); // let the metrics readback catch up
    fields.push(await page.evaluate(() => window.__selforg?.fieldV() ?? []));
    wavelengths.push(await page.evaluate(() => window.__selforg?.wavelength() ?? 0));
  }
  const pearson = (a: number[], b: number[]): number => {
    const n = a.length;
    const ma = a.reduce((s, x) => s + x, 0) / n;
    const mb = b.reduce((s, x) => s + x, 0) / n;
    let sab = 0;
    let saa = 0;
    let sbb = 0;
    for (let i = 0; i < n; i++) {
      sab += ((a[i] as number) - ma) * ((b[i] as number) - mb);
      saa += ((a[i] as number) - ma) ** 2;
      sbb += ((b[i] as number) - mb) ** 2;
    }
    return sab / Math.sqrt(saa * sbb);
  };
  let maxR = 0;
  for (let i = 0; i < 10; i++) for (let j = i + 1; j < 10; j++) maxR = Math.max(maxR, Math.abs(pearson(fields[i] ?? [], fields[j] ?? [])));
  const median = [...wavelengths].sort((a, b) => a - b)[5] as number;
  const maxDev = Math.max(...wavelengths.map((w) => Math.abs(w / median - 1)));
  console.info(
    `test 3 (browser): max |r| ${maxR.toFixed(3)}; wavelengths ${wavelengths.map((w) => w.toFixed(1)).join(', ')} ` +
      `(median ${median.toFixed(1)}, max deviation ${(maxDev * 100).toFixed(1)}%)`,
  );
  expect(maxR).toBeLessThan(0.2);
  expect(maxDev).toBeLessThanOrEqual(0.15);
});
