import { downloadBlob } from './download';

/** Save the canvas as PNG. Call right after drawing, inside the frame callback. */
export function snapshotPng(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, filename);
  }, 'image/png');
}

/** Record the canvas for `seconds` as WebM (MediaRecorder) and save it. Resolves when saved. */
export function recordWebm(canvas: HTMLCanvasElement, seconds: number, filename: string): Promise<void> {
  const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t));
  if (!mimeType) return Promise.reject(new Error('This browser cannot record WebM.'));
  const stream = canvas.captureStream(60);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (ev) => {
    if (ev.data.size > 0) chunks.push(ev.data);
  };
  return new Promise((resolve) => {
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      downloadBlob(new Blob(chunks, { type: 'video/webm' }), filename);
      resolve();
    };
    recorder.start(1000);
    setTimeout(() => recorder.stop(), seconds * 1000);
  });
}
