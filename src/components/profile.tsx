
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, Globe, Download, Shield, LogOut, 
  ChevronRight, Lightbulb, Activity, Type, User, Camera, Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getProfile, saveProfile, INDIAN_STATES, type UserProfile } from '@/lib/user-profile';
import { getFarmInsight } from '@/ai/flows/farm-insight-flow';
import { useTheme } from '@/components/theme-provider';

export function ProfileScreen() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(getProfile());
  const [farmInsight, setFarmInsight] = useState('');
  const [loadingInsight, setLoadingInsight] = useState(true);
  const [fontSize, setFontSizeState] = useState('15px');
  const [avatarImage, setAvatarImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedFs = localStorage.getItem('ks_fontsize');
    if (savedFs) {
      setFontSizeState(savedFs);
      document.documentElement.style.fontSize = savedFs;
    }
    const savedImg = localStorage.getItem('profileImage');
    if (savedImg) setAvatarImage(savedImg);
  }, []);

  useEffect(() => {
    async function loadInsight() {
      setLoadingInsight(true);
      try {
        const res = await getFarmInsight({ 
          crop: profile.crops[0] || 'tomato', 
          location: profile.city || 'Nasik', 
          soil: profile.soilType || 'Loamy'
        });
        setFarmInsight(res.insight);
      } catch (e) {
        setFarmInsight("Ensure consistent drip irrigation timing to prevent moisture stress.");
      } finally {
        setLoadingInsight(false);
      }
    }
    loadInsight();
  }, [profile.city, profile.crops, profile.soilType]);

  const handleSave = () => {
    saveProfile(profile);
    setIsEditing(false);
    toast({ title: "Profile updated", className: "bg-primary border-none text-white" });
  };

  const handleFontSize = (size: string) => {
    setFontSizeState(size);
    document.documentElement.style.fontSize = size;
    localStorage.setItem('ks_fontsize', size);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setAvatarImage(base64);
        localStorage.setItem('profileImage', base64);
        window.dispatchEvent(new Event('profileUpdated'));
        toast({ title: "Avatar Updated" });
      };
      reader.readAsDataURL(file);
    }
  };

  const initials = profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-8 animate-in pb-20 max-w-4xl mx-auto">
      <div className="px-1">
        <h2 className="text-2xl font-headline font-black text-white">Farmer Profile</h2>
        <p className="text-[13px] opacity-40 font-body">Manage your field identity and location</p>
      </div>

      {/* Identity Card */}
      <section className="relative overflow-hidden bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 space-y-8">
        <div className="absolute inset-0 bg-hero-gradient animate-gradient-shift pointer-events-none opacity-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="flex flex-col items-center gap-4">
            <div 
              onClick={handleAvatarClick}
              className="relative w-32 h-32 rounded-full cursor-pointer group bg-[#0D1F0D] border-2 border-primary/40 flex items-center justify-center overflow-hidden transition-all hover:scale-105 active:scale-95"
            >
              {avatarImage ? (
                <img src={avatarImage} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <span className="text-3xl font-black text-white opacity-40">{initials || 'RK'}</span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera size={24} className="text-white" />
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
            <Badge className="bg-primary/15 text-primary border-primary/30 uppercase tracking-widest text-[9px] font-black px-2.5 py-1">
              Verified Farmer
            </Badge>
          </div>

          <div className="flex-1 space-y-6 text-center md:text-left">
            <div>
              <h3 className="text-4xl font-headline font-black text-white">{profile.name}</h3>
              <p className="text-sm opacity-50 font-medium">{profile.city}, {profile.state}</p>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <span className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[11px] font-bold opacity-60">{profile.fieldSize} field</span>
              <span className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[11px] font-bold opacity-60">{profile.crops.join(', ')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Farm Profile Form */}
      <section className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 space-y-8">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-headline font-bold text-white">Operational Details</h3>
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-white/5 border-white/10 text-[11px] font-black uppercase tracking-widest h-8"
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          >
            {isEditing ? 'Save Profile' : 'Edit Profile'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          {[
            { label: 'Full Name', key: 'name', type: 'text' },
            { label: 'City / Mandi', key: 'city', type: 'text' },
            { label: 'State', key: 'state', type: 'select', options: INDIAN_STATES },
            { label: 'Primary Crop', key: 'crops', type: 'text', multi: true },
            { label: 'Field Size', key: 'fieldSize', type: 'text' },
            { label: 'Soil Type', key: 'soilType', type: 'text' },
          ].map((field) => (
            <div key={field.key} className="space-y-1.5 border-b border-white/[0.03] pb-4">
              <p className="text-[10px] uppercase font-black tracking-widest opacity-30">{field.label}</p>
              {isEditing ? (
                field.type === 'select' ? (
                  <select 
                    className="bg-black/40 border border-white/10 rounded-lg p-2 text-sm w-full outline-none focus:border-primary"
                    value={profile[field.key as keyof UserProfile] as string}
                    onChange={(e) => setProfile({...profile, [field.key]: e.target.value})}
                  >
                    {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input 
                    className="bg-transparent border-b border-primary/40 text-sm font-medium focus:outline-none w-full py-1"
                    value={field.multi ? profile.crops.join(', ') : profile[field.key as keyof UserProfile] as string}
                    onChange={(e) => {
                      if (field.multi) {
                        setProfile({...profile, crops: e.target.value.split(',').map(s => s.trim())});
                      } else {
                        setProfile({...profile, [field.key]: e.target.value});
                      }
                    }}
                  />
                )
              ) : (
                <span className="text-sm font-medium text-white/80">
                  {field.multi ? profile.crops.join(', ') : profile[field.key as keyof UserProfile] as string}
                </span>
              )}
            </div>
          ))}
        </div>

        {farmInsight && (
          <div className="pt-6 border-t border-primary/10 flex items-start gap-4 animate-in">
            <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
              <Lightbulb size={16} className="text-amber-500" />
            </div>
            <p className="text-[13px] italic text-white/60 leading-relaxed">&quot;{farmInsight}&quot;</p>
          </div>
        )}
      </section>

      {/* Display Settings */}
      <section className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 space-y-8">
        <h3 className="text-lg font-headline font-bold text-white">Display & UI</h3>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium opacity-60">Interface Scale</span>
          <div className="flex bg-white/5 p-1 rounded-lg gap-1 border border-white/10">
            {['13px', '15px', '17px'].map((size, idx) => (
              <button
                key={size}
                onClick={() => handleFontSize(size)}
                className={cn(
                  "w-10 h-8 flex items-center justify-center rounded text-xs font-bold transition-all",
                  fontSize === size ? "bg-primary text-white" : "text-white/30 hover:text-white"
                )}
              >
                {['A-', 'A', 'A+'][idx]}
              </button>
            ))}
          </div>
        </div>
      </section>

      <style jsx global>{`
        .bg-hero-gradient {
          background: linear-gradient(135deg, rgba(27,94,32,0.18), rgba(25,118,210,0.08));
          background-size: 200% 200%;
        }
        .animate-gradient-shift { animation: gradient-shift 12s ease-in-out infinite alternate; }
        @keyframes gradient-shift { 0% { background-position: 0% 0%; } 100% { background-position: 100% 100%; } }
      `}</style>
    </div>
  );
}
