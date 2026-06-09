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
    // Check if user has already entered the app today to skip cinematic if needed
    // For now, always show the monsoon landing for maximum impact
    router.replace('/monsoon_landing.html');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#050F08] flex items-center justify-center">
      <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );
}
