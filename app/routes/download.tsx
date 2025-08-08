import type { Route } from "./+types/download";
import { validateAndConsumeToken } from "../utils/tokens.server";
import { fetchS3Object } from "../utils/s3.server";
import { getClientIp } from "../utils/security.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const ip = getClientIp(request);
  if (!token) return new Response("Forbidden", { status: 403 });
  const result = await validateAndConsumeToken(context.cloudflare.env as any, token, ip);
  if (!result.ok) {
    const status = result.reason === "expired" ? 410 : 403;
    return new Response(status === 410 ? "Gone" : "Forbidden", { status });
  }
  return fetchS3Object(context.cloudflare.env as any);
}

export default function Download() { return null; }
