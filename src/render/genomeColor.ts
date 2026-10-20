/**
 * Display colour of a genome: the hue of (gain, motility, build) read as RGB,
 * at fixed brightness and 75% saturation. Mirrors `hueColor` in
 * agentShaders.ts so charts match the canvas. Returns RGB in 0..1.
 */
export function genomeColor(gain: number, motility: number, build: number): [number, number, number] {
  const mx = Math.max(gain, motility, build);
  const mn = Math.min(gain, motility, build);
  const d = mx - mn;
  let h = 0;
  if (d > 1e-5) {
    if (mx === gain) h = ((((motility - build) / d) % 6) + 6) % 6;
    else if (mx === motility) h = (build - gain) / d + 2;
    else h = (gain - motility) / d + 4;
  }
  const channel = (offset: number): number => {
    const k = (offset + h) % 6;
    const rgb = 1 - Math.min(Math.max(Math.min(k, 4 - k), 0), 1);
    return 1 + (rgb - 1) * 0.75;
  };
  return [channel(5), channel(3), channel(1)];
}
