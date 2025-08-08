import { AwsClient } from "aws4fetch";

export async function fetchS3Object(env: Env): Promise<Response> {
  const region = (env as any).AWS_REGION as string;
  const bucket = (env as any).S3_BUCKET as string;
  const key = (env as any).S3_OBJECT_KEY as string;
  const accessKeyId = (env as any).AWS_ACCESS_KEY_ID as string;
  const secretAccessKey = (env as any).AWS_SECRET_ACCESS_KEY as string;

  const client = new AwsClient({ accessKeyId, secretAccessKey, region, service: "s3" });
  const url = `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`;
  const res = await client.fetch(url, { method: "GET" });
  if (!res.ok) return new Response("Not Found", { status: 404 });

  const headers = new Headers(res.headers);
  const filename = key.split("/").pop() || "download.bin";
  headers.set("Content-Disposition", `attachment; filename="${filename}"`);
  headers.set("Cache-Control", "no-store");
  return new Response(res.body, { status: 200, headers });
}
