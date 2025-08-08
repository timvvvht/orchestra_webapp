import type { Route } from "./+types/landing";
import { Form, useActionData, useLoaderData } from "react-router";
import { useEffect, useState } from "react";
import { Glass } from "../components/ui/Glass";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { sanitizeCode, timingSafeEqual, hashCode, getClientIp } from "../utils/security.server";
import { checkRateLimit } from "../utils/rateLimit.server";
import { issueToken } from "../utils/tokens.server";

export async function loader({ request }: Route.LoaderArgs) {
  const ua = request.headers.get("user-agent") || "";
  const platformHint = request.headers.get("sec-ch-ua-platform") || "";
  const isMac = /macos/i.test(platformHint) || /Macintosh|Mac OS X|Mac OS/i.test(ua);
  return Response.json({ isMac });
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const raw = (form.get("code") || "") as string;
  const code = sanitizeCode(raw);
  const ip = getClientIp(request);
  const { allowed } = await checkRateLimit(context.cloudflare.env as any, ip);
  if (!allowed || !code) return Response.json({ error: "Invalid code" }, { status: 401 });

  const { ACCESS_CODE_SHA256, ACCESS_CODE_PEPPER, MASTER_ACCESS_CODE } = context.cloudflare.env as any;
  const isMaster = MASTER_ACCESS_CODE && code === MASTER_ACCESS_CODE;
  let ok = false;
  if (!isMaster) {
    const digest = await hashCode(code, ACCESS_CODE_PEPPER);
    ok = timingSafeEqual(digest, ACCESS_CODE_SHA256);
  } else {
    ok = true;
  }
  if (!ok) return Response.json({ error: "Invalid code" }, { status: 401 });

  const token = await issueToken(context.cloudflare.env as any, ip, 600);
  return Response.redirect(`/download?token=${encodeURIComponent(token)}`);
}

export default function Landing({}: Route.ComponentProps) {
  const data = useActionData<typeof action>() as any;
  const info = useLoaderData<typeof loader>() as { isMac: boolean };
  const [isAppleSilicon, setIsAppleSilicon] = useState<boolean | null>(null);

  // Optional client-side architecture hint when available
  useEffect(() => {
    const anyNav: any = navigator as any;
    if (anyNav?.userAgentData?.getHighEntropyValues) {
      anyNav.userAgentData
        .getHighEntropyValues(["architecture"]) // chromium-based
        .then((res: { architecture?: string }) => {
          const arch = (res?.architecture || "").toLowerCase();
          if (arch.includes("arm")) setIsAppleSilicon(true);
          else if (arch) setIsAppleSilicon(false);
          else setIsAppleSilicon(null);
        })
        .catch(() => setIsAppleSilicon(null));
    } else {
      setIsAppleSilicon(null);
    }
  }, []);
  return (
    <main className="min-h-screen relative orchestra-page">
      {/* Background layers */}
      <div className="page-void">
        <div className="page-void-gradient" />
        <div className="page-void-orb-blue" />
        <div className="page-void-orb-purple" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center py-24 px-6">
        <Glass className="content-narrow w-full p-10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />

          <div className="gradient-frame">
            <div className="frame-content p-8 space-y-4">
              <h1 className="text-display text-white/90">Orchestra</h1>
              <p className="text-body text-white/70">The Sane Way to Vibe Code.</p>
              {info.isMac && isAppleSilicon === true && (
                <div className="text-xs-ox text-white/50">Apple Silicon detected</div>
              )}
              {info.isMac && isAppleSilicon === false && (
                <div className="text-xs-ox text-white/50">Intel Mac detected</div>
              )}

              <Form method="post" className="mt-6 space-y-3">
                <label className="text-label" htmlFor="code">
                  Access Code
                </label>
                <Input variant="code" id="code" name="code" placeholder="••••••" autoComplete="off" inputMode="text" spellCheck={false} />
                {data?.error && (
                  <p className="text-sm text-red-400/80">{data.error}</p>
                )}
                <Button type="submit">Download for macOS</Button>
                <p className="text-micro text-white/40">Authorized access only</p>
              </Form>
            </div>
          </div>
        </Glass>
      </div>
    </main>
  );
}