"use client";

import { useEffect } from 'react';

/**
 * Root route serves as a redirect to the standalone cinematic WebGL landing page.
 * This file (monsoon_landing.html) is located in the public directory and
 * handles its own high-fidelity rendering lifecycle.
 */
export default function LandingRedirect() {
  useEffect(() => {
    // Direct replacement of location ensures we bypass standard React hydration
    // for the heavy WebGL experience.
    window.location.replace('/monsoon_landing.html');
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0D1B] flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="w-12 h-12 border-2 border-[#81C784]/20 border-t-[#81C784] rounded-full animate-spin" />
        <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-[#81C784]/40">Calibrating Field Intelligence</span>
      </div>
    </div>
  );
}