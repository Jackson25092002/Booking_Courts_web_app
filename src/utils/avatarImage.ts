const MAX_SOURCE_SIZE = 100 * 1024 * 1024;
const MAX_OUTPUT_SIZE = 5 * 1024 * 1024;
const MAX_DIMENSION = 1024;
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không thể đọc tệp ảnh đã chọn."));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Không thể xử lý ảnh đại diện.")),
      "image/webp",
      quality,
    );
  });
}

export async function prepareAvatarImage(file: File) {
  if (!acceptedTypes.has(file.type)) {
    throw new Error("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.");
  }
  if (file.size > MAX_SOURCE_SIZE) {
    throw new Error("Ảnh gốc không được vượt quá 100 MB.");
  }

  const image = await loadImage(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let blob = await canvasToBlob(canvas, 0.86);
  if (blob.size > MAX_OUTPUT_SIZE) blob = await canvasToBlob(canvas, 0.72);
  if (blob.size > MAX_OUTPUT_SIZE) {
    throw new Error("Không thể nén ảnh xuống dưới 5 MB. Vui lòng chọn ảnh khác.");
  }
  return blob;
}
