export interface PreviewStatus {
  running: boolean;
  port?: number;
}

export async function getPreviewStatus(acsBaseUrl: string, sessionId: string): Promise<PreviewStatus> {
  const res = await fetch(`${acsBaseUrl}/api/v1/preview/${sessionId}/status`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function startPreview(acsBaseUrl: string, sessionId: string): Promise<PreviewStatus> {
  const res = await fetch(`${acsBaseUrl}/api/v1/preview/${sessionId}/start`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function stopPreview(acsBaseUrl: string, sessionId: string): Promise<{ stopped: boolean }>{
  const res = await fetch(`${acsBaseUrl}/api/v1/preview/${sessionId}/stop`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
