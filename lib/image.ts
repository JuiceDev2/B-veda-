/**
 * Convierte cualquier imagen que suba el usuario a un WebP ligero
 * (recortado a cuadrado, máx. 512x512, calidad 0.82) antes de subirla
 * a Supabase Storage. Todo ocurre en el navegador con <canvas>, no
 * requiere librerías externas.
 */
export async function toWebpAvatar(
  file: File,
  maxSize = 512,
  quality = 0.82
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const outSize = Math.min(maxSize, side);
  const canvas = document.createElement("canvas");
  canvas.width = outSize;
  canvas.height = outSize;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener el contexto de canvas");

  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, outSize, outSize);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falló la conversión a WebP"))),
      "image/webp",
      quality
    );
  });
}
