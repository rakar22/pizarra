export type PackedImage = {
  mime: "image/jpeg";
  data: string;
  preview: string;
};

const MAX_EDGE = 1024;
const MAX_CHARS = 1_200_000;

export async function compressImage(file: File): Promise<PackedImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Solo se aceptan fotos (jpg o png).");
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la foto.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const preview = canvas.toDataURL("image/jpeg", 0.72);
  const data = preview.split(",")[1] ?? "";
  if (!data || data.length > MAX_CHARS) {
    throw new Error("La foto sigue siendo demasiado pesada. Prueba otra más ligera.");
  }
  return { mime: "image/jpeg", data, preview };
}
