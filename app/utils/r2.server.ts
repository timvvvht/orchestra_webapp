export async function fetchR2Object(env: Env): Promise<Response> {
  const key = (env as any).R2_OBJECT_KEY as string;
  const bucket = (env as any).DOWNLOADS_BUCKET as R2Bucket;

  const object = await bucket.get(key);
  if (!object) {
    return new Response("Not Found", { status: 404 });
  }

  const headers = new Headers();
  const filename = key.split("/").pop() || "download.bin";
  headers.set("Content-Disposition", `attachment; filename="${filename}"`);
  headers.set("Cache-Control", "no-store");
  
  // Set content type if available from R2 metadata
  if (object.httpMetadata?.contentType) {
    headers.set("Content-Type", object.httpMetadata.contentType);
  }

  return new Response(object.body, { 
    status: 200, 
    headers 
  });
}