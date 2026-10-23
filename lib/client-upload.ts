export async function toWebp(file: File, maxSide: number) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.8));
  if (blob?.type !== "image/webp") throw new Error("Browser can't make WebP");
  return blob;
}

export const sendWebp = <T,>(url: string, blob: Blob, onProgress?: (pct: number) => void) =>
  new Promise<T>((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("POST", url);
    x.setRequestHeader("content-type", "image/webp");
    x.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    x.onload = () => {
      const body = (() => { try { return JSON.parse(x.responseText); } catch { return {}; } })();
      if (x.status === 201) resolve(body);
      else reject(new Error(body.error ?? `Upload failed (${x.status})`));
    };
    x.onerror = () => reject(new Error("Network error"));
    x.send(blob);
  });
