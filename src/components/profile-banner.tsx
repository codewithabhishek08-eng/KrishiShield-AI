"use client";
import React, { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { hasProfile } from '@/lib/user-profile';

export function ProfileBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const check = () => setShow(!hasProfile());
    check();
    window.addEventListener('profileUpdated', check);
    return () => window.removeEventListener('profileUpdated', check);
  }, []);

  if (!show) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 px-6 py-4 rounded-2xl mb-8 flex items-center justify-between animate-in slide-in-from-top-4">
      <div className="flex items-center gap-3">
        <Info size={18} className="text-amber-500" />
        <p className="text-sm font-medium text-amber-200/80">Set your location and crops in Profile for personalised field intelligence.</p>
      </div>
      <div className="flex items-center gap-4">
        <button 
          className="text-[11px] font-black uppercase tracking-widest text-amber-500 hover:underline"
        >
          Go to Profile →
        </button>
      </div>
    </div>
  );
}
