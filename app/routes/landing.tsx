import type { Route } from "./+types/landing";
import { Form, useActionData, useLoaderData } from "react-router";
import { useEffect, useState } from "react";
import { Glass } from "../components/ui/Glass";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
// import {
//   sanitizeCode,
//   timingSafeEqual,
//   hashCode,
//   getClientIp,
// } from "../utils/security.server";
// import { checkRateLimit } from "../utils/rateLimit.server";
// import { issueToken } from "../utils/tokens.server";
import MissionControl from "@/components/mission-control/MissionControl";


export default function Landing({}: Route.ComponentProps) {

  return (
    <main className="min-h-screen relative orchestra-page">
      hi
      {/* Background layers */}
      <div className="page-void">
        <div className="page-void-gradient" />
        <div className="page-void-orb-blue" />
        <div className="page-void-orb-purple" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center py-24 px-6">
        <Glass className="content-narrow w-full p-10">
          hi
          <MissionControl />
        </Glass>
        
      </div>
    </main>
  );
}
