import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const AVATAR_DIRECTORY = path.join(process.cwd(), "storage", "avatars");

const signatures = {
  jpg: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  png: (bytes: Uint8Array) => bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47,
  webp: (bytes: Uint8Array) =>
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP",
};

export function detectAvatarExtension(bytes: Uint8Array) {
  if (signatures.jpg(bytes)) return "jpg";
  if (signatures.png(bytes)) return "png";
  if (signatures.webp(bytes)) return "webp";
  return null;
}

export async function saveAvatar(bytes: Uint8Array, extension: string) {
  await mkdir(AVATAR_DIRECTORY, { recursive: true });
  const filename = `${randomUUID()}.${extension}`;
  await writeFile(path.join(AVATAR_DIRECTORY, filename), bytes);
  return filename;
}

export async function readAvatar(filename: string) {
  if (!/^[0-9a-f-]{36}\.(?:jpg|png|webp)$/.test(filename)) return null;
  try {
    return await readFile(path.join(AVATAR_DIRECTORY, filename));
  } catch {
    return null;
  }
}

export async function removeStoredAvatar(avatarUrl: string | null) {
  if (!avatarUrl) return;
  const match = avatarUrl.match(/\/api\/media\/avatars\/([0-9a-f-]{36}\.(?:jpg|png|webp))$/);
  if (!match) return;
  try {
    await unlink(path.join(AVATAR_DIRECTORY, match[1]));
  } catch {
    // The database remains valid even when an old local file was already removed.
  }
}
