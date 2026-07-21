export interface PixelBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface PreparedPetImage {
  bytes: Uint8Array;
  mime: "image/webp";
  width: number;
  height: number;
  previewUrl: string;
}

export function removeConnectedLightBackground(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  tolerance: number,
): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(source);
  const visited = new Uint8Array(width * height);
  const queue = new Uint32Array(width * height);
  let head = 0;
  let tail = 0;
  const threshold = 255 - Math.max(4, Math.min(96, tolerance));
  const canRemove = (index: number): boolean => {
    const offset = index * 4;
    return (
      pixels[offset + 3]! > 0 &&
      pixels[offset]! >= threshold &&
      pixels[offset + 1]! >= threshold &&
      pixels[offset + 2]! >= threshold
    );
  };
  const enqueue = (index: number): void => {
    if (visited[index] || !canRemove(index)) return;
    visited[index] = 1;
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }
  while (head < tail) {
    const index = queue[head++]!;
    const x = index % width;
    const y = Math.floor(index / width);
    pixels[index * 4 + 3] = 0;
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y + 1 < height) enqueue(index + width);
  }
  return pixels;
}

export function findOpaqueBounds(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): PixelBounds | null {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3]! <= 8) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  return right < left || bottom < top ? null : { left, top, right, bottom };
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("无法生成宠物图片。"))),
      "image/webp",
      0.92,
    );
  });
}

export async function preparePetImage(file: File, tolerance = 28): Promise<PreparedPetImage> {
  if (!(["image/png", "image/jpeg"] as string[]).includes(file.type)) {
    throw new Error("请选择 PNG 或 JPG 图片。");
  }
  if (file.size > 5_000_000) throw new Error("图片不能超过 5 MB。");
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width < 32 || bitmap.height < 32 || bitmap.width > 8_192 || bitmap.height > 8_192) {
      throw new Error("图片尺寸需要在 32 到 8192 像素之间。");
    }
    const scale = Math.min(1, 1_024 / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = width;
    sourceCanvas.height = height;
    const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
    if (!sourceContext) throw new Error("浏览器无法处理这张图片。");
    sourceContext.drawImage(bitmap, 0, 0, width, height);
    const imageData = sourceContext.getImageData(0, 0, width, height);
    imageData.data.set(removeConnectedLightBackground(imageData.data, width, height, tolerance));
    sourceContext.putImageData(imageData, 0, 0);
    const bounds = findOpaqueBounds(imageData.data, width, height);
    if (!bounds) throw new Error("去除背景后没有发现可用的宠物图像。");
    const padding = Math.max(8, Math.round(Math.max(width, height) * 0.025));
    const cropLeft = Math.max(0, bounds.left - padding);
    const cropTop = Math.max(0, bounds.top - padding);
    const cropRight = Math.min(width - 1, bounds.right + padding);
    const cropBottom = Math.min(height - 1, bounds.bottom + padding);
    const output = document.createElement("canvas");
    output.width = cropRight - cropLeft + 1;
    output.height = cropBottom - cropTop + 1;
    const outputContext = output.getContext("2d");
    if (!outputContext) throw new Error("浏览器无法生成宠物预览。");
    outputContext.drawImage(
      sourceCanvas,
      cropLeft,
      cropTop,
      output.width,
      output.height,
      0,
      0,
      output.width,
      output.height,
    );
    const blob = await canvasBlob(output);
    if (blob.size > 1_500_000) throw new Error("处理后的图片仍然过大，请换一张更简单的图片。");
    return {
      bytes: new Uint8Array(await blob.arrayBuffer()),
      mime: "image/webp",
      width: output.width,
      height: output.height,
      previewUrl: URL.createObjectURL(blob),
    };
  } finally {
    bitmap.close();
  }
}
