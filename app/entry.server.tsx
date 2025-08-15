import type { AppLoadContext, EntryContext } from "react-router";

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: AppLoadContext
) {
  // Minimal HTML shell for CSR-only app with ssr: false
  // React Router dev needs this to serve the document, but no SSR occurs
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>Orchestra</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/@vite/client"></script>
    <script type="module" src="/app/entry.client.tsx"></script>
  </body>
</html>`;

  responseHeaders.set("Content-Type", "text/html");
  return new Response(html, { headers: responseHeaders, status: responseStatusCode });
}