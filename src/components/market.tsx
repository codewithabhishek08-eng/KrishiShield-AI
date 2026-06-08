"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, ArrowLeft, Sparkles, MapPin, 
  TrendingUp, TrendingDown, Minus, RefreshCw, 
  CloudSun, Droplets, Bug, Sprout, Leaf,
  ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CROPS, type Crop } from '@/lib/crop-data';
import { getProfile, buildPrompt, type UserProfile } from '@/lib/user-profile';
import { getTacticalInsight } from '@/ai/flows/tactical-insight-flow';

export function MarketScreen() {
  const [profile, setProfile] = useState<UserProfile>(getProfile());
  const [search, setSearch] = useState('');
  const [selectedCropId, setSelectedCropId] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

  useEffect(() => {
    const handleUpdate = () => {
      const p = getProfile();
      setProfile(p);
      if (!selectedCropId) setSelectedCropId(p.crops[0] || 'tomato');
    };
    window.addEventListener('profileUpdated', handleUpdate);
    setSelectedCropId(profile.crops[0] || 'tomato');
    return () => window.removeEventListener('profileUpdated', handleUpdate);
  }, [profile.crops, selectedCropId]);

  const selectedCrop = useMemo(() => 
    CROPS.find(c => c.id === selectedCropId) || CROPS[0], 
  [selectedCropId]);

  const filteredCrops = useMemo(() => 
    CROPS.filter(c => c.name.toLowerCase().includes(search.toLowerCase())),
  [search]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
        <div>
          <h2 className="text-2xl font-headline font-black text-white">Mandi Intelligence</h2>
          <div className="flex items-center gap-2 text-primary mt-1">
            <MapPin size={14} />
            <span className="text-[11px] font-black uppercase tracking-widest" data-location="city">{profile.city}</span>
            <span className="text-white/20">/</span>
            <span className="text-[11px] font-black uppercase tracking-widest opacity-40" data-location="state">{profile.state}</span>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-4 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-black opacity-30">Regional Outlook</span>
            <span className="text-[11px] font-bold text-green-400">Bullish Trend</span>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-black opacity-30">Market Status</span>
            <span className="text-[11px] font-bold">Active</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-220px)] overflow-hidden">
        {/* Crop Browser */}
        <div className={cn("lg:w-[320px] shrink-0 flex flex-col gap-4 bg-[#0F230F] border border-white/10 rounded-2xl p-4 overflow-hidden", mobileView === 'detail' ? 'hidden lg:flex' : 'flex')}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
            <Input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search Mandi..." 
              className="bg-black/20 border-white/10 pl-9 rounded-xl text-sm" 
            />
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-1 pr-4">
              {filteredCrops.map(c => (
                <div 
                  key={c.id} 
                  onClick={() => { setSelectedCropId(c.id); setMobileView('detail'); }} 
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all hover:bg-white/5",
                    selectedCropId === c.id ? "bg-primary/15 border-l-4 border-primary" : "border-l-4 border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{c.emoji}</span>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold truncate">{c.name}</span>
                      <span className="text-[9px] opacity-30 uppercase tracking-tighter">₹{c.basePrice}/{c.unit}</span>
                    </div>
                  </div>
                  <div className={cn("text-[10px] font-bold", c.changeToday > 0 ? "text-green-400" : "text-red-400")}>
                    {c.changeToday > 0 ? '+' : ''}{c.changeToday}%
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Intelligence detail */}
        <div className={cn("flex-1 bg-[#0A1A0A] border border-white/10 rounded-2xl flex flex-col overflow-hidden", mobileView === 'list' ? 'hidden lg:flex' : 'flex')}>
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-4">
              {mobileView === 'detail' && <button onClick={() => setMobileView('list')} className="lg:hidden p-2 bg-white/5 rounded-full"><ArrowLeft size={18} /></button>}
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-4xl shadow-2xl">{selectedCrop.emoji}</div>
              <div>
                <h2 className="text-2xl font-headline font-black text-white">{selectedCrop.name}</h2>
                <p className="text-xs opacity-40">Mandi Intelligence for <span data-location="city" className="text-primary">{profile.city}</span></p>
              </div>
            </div>
            <Button className="bg-primary hover:bg-primary/90 text-[11px] font-black uppercase tracking-widest h-11 px-6 rounded-xl shadow-[0_10px_30px_rgba(76,175,80,0.2)]">
              Lock Future Price
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-8 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <MarketDetailBlock title="Price Intelligence" icon={TrendingUp} templateKey="MARKET_FORECAST" profile={profile} extras={{ crop: selectedCrop.name, price: selectedCrop.basePrice }} />
                 <MarketDetailBlock title="Weather & Season" icon={CloudSun} templateKey="MARKET_WEATHER" profile={profile} extras={{ crop: selectedCrop.name }} />
                 <MarketDetailBlock title="Irrigation Guide" icon={Droplets} templateKey="MARKET_IRRIGATION" profile={profile} extras={{ crop: selectedCrop.name }} />
                 <MarketDetailBlock title="Pest & Disease" icon={Bug} templateKey="MARKET_PEST" profile={profile} extras={{ crop: selectedCrop.name }} />
                 <MarketDetailBlock title="Soil & Fertilizer" icon={Sprout} templateKey="MARKET_SOIL" profile={profile} extras={{ crop: selectedCrop.name }} />
                 <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col justify-center items-center text-center space-y-3">
                    <Sparkles size={24} className="text-primary" />
                    <h4 className="text-sm font-bold">Smart Contract Ready</h4>
                    <p className="text-[11px] opacity-40">Your {selectedCrop.name} harvest is verified. Eligible for instant price hedging in <span data-location="city">{profile.city}</span>.</p>
                    <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-primary">View Contract →</Button>
                 </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

function MarketDetailBlock({ title, icon: Icon, templateKey, profile, extras }: { title: string, icon: any, templateKey: any, profile: UserProfile, extras: any }) {
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function fetchInsight() {
      setLoading(true);
      try {
        const prompt = buildPrompt(templateKey, profile, extras);
        const res = await getTacticalInsight({ prompt, system: "You are a professional agricultural expert. Respond in 3 sentences max." });
        setInsight(res.insight);
      } catch (e) {
        setInsight("Intelligence Uplink Lost. Retrying...");
      } finally {
        setLoading(false);
      }
    }
    fetchInsight();
  }, [profile, extras, refreshKey, templateKey]);

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 relative group transition-all hover:border-primary/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon size={16} className="text-primary" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest opacity-60">{title}</span>
        </div>
        <button onClick={() => setRefreshKey(k => k + 1)} className="p-1.5 text-white/10 hover:text-primary transition-colors">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      
      <div className="min-h-[80px]">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-3 w-full bg-white/5" />
            <Skeleton className="h-3 w-4/5 bg-white/5" />
            <Skeleton className="h-3 w-2/3 bg-white/5" />
          </div>
        ) : (
          <p className="text-[13px] text-white/70 leading-relaxed font-body italic">
            &quot;{insight}&quot;
          </p>
        )}
      </div>
    </div>
  );
}
