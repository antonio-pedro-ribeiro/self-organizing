import { expect, test, type Page } from '@playwright/test';

/** Node's Buffer, for Playwright's file chooser; declared here to avoid adding @types/node. */
declare const Buffer: { from(data: string): Uint8Array };

interface Saved {
  size: number;
  head: number[];
  text: string;
}

type BlobWindow = Window & { __blobs?: Blob[] };

/** Click a button and return the blob it handed to the download helper, read inside the page. */
async function save(page: Page, button: string, timeout = 15_000): Promise<Saved> {
  const before = await page.evaluate(() => (window as BlobWindow).__blobs?.length ?? 0);
  await page.getByText(button).click();
  await page.waitForFunction((n) => ((window as BlobWindow).__blobs?.length ?? 0) > n, before, { timeout });
  return page.evaluate(async () => {
    const blobs = (window as BlobWindow).__blobs ?? [];
    const blob = blobs[blobs.length - 1] as Blob;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return { size: blob.size, head: Array.from(bytes.subarray(0, 8)), text: blob.type.includes('json') ? await blob.text() : '' };
  });
}

/** Capture and state: PNG snapshot, 10 s WebM, JSON export and import (SPEC.md sections 5 and 6). */
test('snapshot, recording, and state export/import', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?test');
  await page.waitForFunction(() => window.__selforg !== undefined, undefined, { timeout: 30_000 });
  await page.evaluate(() => {
    const w = window as BlobWindow;
    w.__blobs = [];
    const original = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (obj: Blob | MediaSource): string => {
      if (obj instanceof Blob) w.__blobs?.push(obj);
      return original(obj);
    };
  });

  const png = await save(page, 'Snapshot PNG');
  expect(png.head.slice(1, 4)).toEqual([0x50, 0x4e, 0x47]); // "PNG"
  expect(png.size).toBeGreaterThan(10_000);

  const webm = await save(page, 'Record 10 s WebM', 30_000);
  expect(webm.head.slice(0, 4)).toEqual([0x1a, 0x45, 0xdf, 0xa3]); // EBML header
  expect(webm.size).toBeGreaterThan(10_000);

  await page.evaluate(() => {
    const s = window.__selforg;
    if (!s) return;
    s.state.seed = 4242;
    s.state.F = 0.05;
    s.state.agents.sensingNoise = 0.6;
  });
  const exported = await save(page, 'Export state JSON');
  const json = JSON.parse(exported.text) as { seed: number; F: number; agents: { sensingNoise: number } };
  expect(json.seed).toBe(4242);
  expect(json.F).toBe(0.05);
  expect(json.agents.sensingNoise).toBe(0.6);

  await page.evaluate(() => {
    const s = window.__selforg;
    if (!s) return;
    s.state.seed = 1;
    s.state.F = 0.0367;
  });
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByText('Import state JSON').click()]);
  await chooser.setFiles({ name: 'state.json', mimeType: 'application/json', buffer: Buffer.from(exported.text) });
  await page.waitForFunction(() => window.__selforg?.state.seed === 4242);
  const after = await page.evaluate(() => ({ F: window.__selforg?.state.F, ticks: window.__selforg?.ticks() }));
  expect(after.F).toBe(0.05);
  console.info(`capture: PNG ${png.size} B, WebM ${webm.size} B; import restored seed 4242 and reset (ticks ${after.ticks})`);
});
