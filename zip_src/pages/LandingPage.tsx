import React from "react";
import LandingPageOrchestrator from "@/components/landing-page/LandingPageOrchestrator";
// import LandingPageTranscendent from "@/components/landing-page/LandingPageTranscendent";
// import LandingPageMinimal from "@/components/landing-page/LandingPageMinimal";
// import LandingPageMax from "@/components/landing-page/LandingPageMax";

function LandingPageWrapper() {
  // Switch between versions by uncommenting
  return <LandingPageOrchestrator />;
  // return <LandingPageTranscendent />;
  // return <LandingPageMinimal />;
  // return <LandingPageMax />;
}

export default LandingPageWrapper;
