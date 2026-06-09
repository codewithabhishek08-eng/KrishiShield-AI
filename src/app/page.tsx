"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Root route serves as a redirect to the cinematic landing page.
 * This ensures the immersive experience is the first touchpoint.
 */
export default function LandingRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Navigate to the standalone cinematic WebGL page
    window.location.replace('/monsoon_landing.html');
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0D1B] flex items-center justify-center">
      <div className="w-12 h-12 border-2 border-[#81C784]/20 border-t-[#81C784] rounded-full animate-spin" />
    </div>
  );
}