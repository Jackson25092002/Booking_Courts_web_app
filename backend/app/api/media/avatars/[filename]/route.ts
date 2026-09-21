import { readAvatar } from "@/lib/avatar-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const contentTypes: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(_request: Request, context: RouteContext<"/api/media/avatars/[filename]">) {
  const { filename } = await context.params;
  const image = await readAvatar(filename);
  if (!image) return new Response("Not found", { status: 404 });

  const extension = filename.split(".").pop() ?? "";
  return new Response(image, {
    headers: {
      "Content-Type": contentTypes[extension] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
