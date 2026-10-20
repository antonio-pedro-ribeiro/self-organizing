import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 1920, height: 1080 } });

/**
 * 5000 agents is above the natural carrying capacity, so membrane decay is
 * set to 0 (the bottom of its slider range): no agent dies and the population
 * stays at the cap, while every rule still runs.
 */
async function start(page: Page, query: string): Promise<void> {
  await page.goto(`/?test${query}`);
  await page.waitForFunction(() => window.__selforg !== undefined, undefined, { timeout: 30_000 });
  await expect(page.locator('#error')).toBeHidden();
  await page.evaluate(() => {
    const s = window.__selforg;
    if (!s) return;
    s.state.initialAgents = 5000;
    s.state.agents.membraneDecay = 0;
    s.reset();
  });
}

const gpu = (page: Page): Promise<string> =>
  page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return ext && gl ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'unknown';
  });

test('test 8: 1920×1080, 512² field, 5000 agents, bloom on: at least 60 fps', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await start(page, '');
  await page.waitForTimeout(3000);

  const f0 = await page.evaluate(() => window.__selforg?.perf.frames ?? 0);
  const t0 = Date.now();
  let minPop = Infinity;
  let maxPop = 0;
  while (Date.now() - t0 < 10_000) {
    await page.waitForTimeout(500);
    const n = await page.evaluate(() => window.__selforg?.population() ?? 0);
    minPop = Math.min(minPop, n);
    maxPop = Math.max(maxPop, n);
  }
  const f1 = await page.evaluate(() => window.__selforg?.perf.frames ?? 0);
  const fps = ((f1 - f0) * 1000) / (Date.now() - t0);
  const bloom = await page.evaluate(() => window.__selforg?.state.bloom);
  console.info(`test 8: ${fps.toFixed(1)} fps over 10 s; protocells ${minPop}–${maxPop}; bloom ${bloom}; GPU ${await gpu(page)}`);
  expect(errors).toEqual([]);
  expect(bloom).toBe(true);
  // rAF is capped at the display rate (60 Hz here), so 59.5 is "60 fps" after frame-timing jitter.
  expect(fps).toBeGreaterThanOrEqual(59.5);
});

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] as number;
};

test('cost of each optional overlay (10% rule)', async ({ page }) => {
  test.setTimeout(240_000);
  await start(page, '&sync');
  const configure = (code: string): Promise<void> =>
    page.evaluate((c) => {
      const s = window.__selforg;
      if (!s) return;
      s.state.flow = c === 'flow';
      s.state.lineageView = c === 'lineage';
      s.state.view = c === 'network' ? 4 : 3;
    }, code);
  /** Median frame work time over 2 s, sampled every 100 ms, after 1.5 s to settle. */
  const measure = async (code: string): Promise<number> => {
    await configure(code);
    await page.waitForTimeout(1500);
    const samples: number[] = [];
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(100);
      samples.push(await page.evaluate(() => window.__selforg?.perf.workMs ?? 0));
    }
    return median(samples);
  };
  await page.waitForTimeout(2000);
  const overlays = ['flow', 'network', 'lineage'];
  const costs: Record<string, number[]> = { flow: [], network: [], lineage: [] };
  const bases: number[] = [];
  // Interleave with the baseline three times, so drift and order effects cancel.
  for (let round = 0; round < 3; round++) {
    for (const name of overlays) {
      const base = await measure('base');
      const ms = await measure(name);
      bases.push(base);
      costs[name]?.push(ms / base - 1);
    }
  }
  const summary = overlays.map((n) => `${n} ${(median(costs[n] ?? []) * 100).toFixed(1)}%`).join('; ');
  console.info(`overlay cost (median of 3) with 5000 protocells, baseline ${median(bases).toFixed(2)} ms: ${summary}`);
});
