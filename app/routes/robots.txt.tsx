export async function loader() {
  return new Response(`User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
export default function Robots() { return null }
