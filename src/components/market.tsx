
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Search, ArrowLeft, Sparkles, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CROPS, type Crop } from '@/lib/crop-data';
import { getProfile, buildPrompt, type UserProfile } from '@/lib/user-profile';
import { getTacticalInsight } from '@/ai/flows/tactical-insight-flow';

export function MarketScreen() {
  const [profile, setProfile] = useState<UserProfile>(getProfile());
  const [search, setSearch] = useState('');
  const [selectedCropId, setSelectedCropId] = useState(profile.crops[0] || 'tomato');
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [priceForecast, setPriceForecast] = useState('');
  const [loadingForecast, setLoadingForecast] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      const p = getProfile();
      setProfile(p);
      setSelectedCropId(p.crops[0] || 'tomato');
    };
    window.addEventListener('profileUpdated', handleUpdate);
    return () => window.removeEventListener('profileUpdated', handleUpdate);
  }, []);

  const selectedCrop = useMemo(() => 
    CROPS.find(c => c.id === selectedCropId) || CROPS[0], 
  [selectedCropId]);

  useEffect(() => {
    async function fetchForecast() {
      setLoadingForecast(true);
      try {
        const prompt = buildPrompt('MARKET_FORECAST', profile, { 
          crop: selectedCrop.name, 
          price: selectedCrop.basePrice 
        });
        const res = await getTacticalInsight({ 
          prompt, 
          system: "You are a professional agricultural commodity analyst for India." 
        });
        setPriceForecast(res.insight);
      } catch (e) {
        setPriceForecast("Market analysis temporarily unavailable for this region.");
      } finally {
        setLoadingForecast(false);
      }
    }
    fetchForecast();
  }, [selectedCrop, profile]);

  const filteredCrops = useMemo(() => 
    CROPS.filter(c => c.name.toLowerCase().includes(search.toLowerCase())),
  [search]);

  return (
    <div className="flex flex-col gap-4 animate-in pb-20">
      <div className="px-1 space-y-2">
        <h2 className="text-2xl font-headline font-black text-white">Mandi Intelligence</h2>
        <div className="flex items-center gap-2 text-primary">
          <MapPin size={14} />
          <span className="text-[11px] font-black uppercase tracking-widest" data-location="city">{profile.city}</span>
          <span className="text-white/20">/</span>
          <span className="text-[11px] font-black uppercase tracking-widest opacity-40" data-location="state">{profile.state}</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-220px)] overflow-hidden">
        {/* Browser */}
        <div className={cn("lg:w-[380px] w-full flex flex-col gap-4 bg-white/[0.03] border border-white/10 rounded-2xl p-4 overflow-hidden", mobileView === 'detail' ? 'hidden lg:flex' : 'flex')}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search crops..." className="bg-white/5 border-white/10 pl-9 rounded-xl" />
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {filteredCrops.map(c => (
              <div key={c.id} onClick={() => { setSelectedCropId(c.id); setMobileView('detail'); }} className={cn("flex items-center gap-4 px-4 py-3 cursor-pointer transition-all hover:bg-white/5", selectedCropId === c.id ? "bg-primary/5 border-l-4 border-primary" : "border-l-4 border-transparent")}>
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl">{c.emoji}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold truncate">{c.name}</h4>
                  <p className="text-[10px] opacity-30 uppercase">Rate in <span data-location="city">{profile.city}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">₹{c.basePrice}/{c.unit}</p>
                  <p className={cn("text-[9px] font-bold", c.changeToday > 0 ? "text-green-400" : "text-red-400")}>{c.changeToday}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Intelligence Detail */}
        <div className={cn("flex-1 bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col overflow-hidden", mobileView === 'list' ? 'hidden lg:flex' : 'flex')}>
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {mobileView === 'detail' && <button onClick={() => setMobileView('list')} className="lg:hidden p-2 bg-white/5 rounded-full"><ArrowLeft size={18} /></button>}
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-3xl">{selectedCrop.emoji}</div>
              <div>
                <h2 className="text-xl font-headline font-black">{selectedCrop.name}</h2>
                <p className="text-xs opacity-40">Local Analysis for <span data-location="city">{profile.city}</span> Mandi</p>
              </div>
            </div>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-[11px] font-black h-8">Lock Price for {selectedCrop.name}</Button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
             <div className="bg-primary/5 border border-primary/20 p-6 rounded-2xl space-y-4">
               <div className="flex items-center gap-3 text-primary">
                 <Sparkles size={18} />
                 <h4 className="font-bold uppercase text-xs tracking-widest">AI Price Forecast</h4>
               </div>
               {loadingForecast ? <div className="space-y-2 animate-pulse"><div className="h-4 bg-white/5 w-full rounded" /></div> : 
                 <p className="text-[15px] italic text-white/80 leading-relaxed">&quot;{priceForecast}&quot;</p>}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
