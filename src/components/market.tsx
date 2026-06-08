"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, ArrowLeft, Sparkles, MapPin, 
  TrendingUp, TrendingDown, Minus, RefreshCw, 
  CloudSun, Droplets, Bug, Sprout, Leaf,
  ChevronRight, Archive, Target, AlertTriangle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CROPS, type Crop } from '@/lib/crop-data';
import { getProfile, type UserProfile } from '@/lib/user-profile';
import { getTacticalInsight } from '@/ai/flows/tactical-insight-flow';

export function MarketScreen() {
  const [profile, setProfile] = useState<UserProfile>(getProfile());
  const [search, setSearch] = useState('');
  const [activeCropName, setActiveCropName] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

  useEffect(() => {
    const handleUpdate = () => {
      const p = getProfile();
      setProfile(p);
    };
    window.addEventListener('profileUpdated', handleUpdate);
    return () => window.removeEventListener('profileUpdated', handleUpdate);
  }, []);

  const filteredCrops = useMemo(() => {
    if (!search.trim()) return CROPS;
    return CROPS.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const activeCropData = useMemo(() => {
    return CROPS.find(c => c.name === activeCropName) || null;
  }, [activeCropName]);

  const handleSelectCrop = (name: string) => {
    setActiveCropName(name);
    setMobileView('detail');
    // Scroll to detail panel smoothly on mobile
    if (window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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
      </div>

      <div className="flex flex-col lg:flex-row gap-6 min-h-[700px]">
        {/* Crop Browser Sidebar */}
        <div className={cn(
          "lg:w-[320px] shrink-0 flex flex-col gap-4 bg-[#0F230F]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 overflow-hidden h-[700px]",
          mobileView === 'detail' ? 'hidden lg:flex' : 'flex'
        )}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
            <Input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search 200+ Mandi items..." 
              className="bg-black/20 border-white/10 pl-9 rounded-xl text-sm focus-visible:ring-primary/30" 
            />
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-1 pr-4">
              {filteredCrops.map(c => (
                <div 
                  key={c.id} 
                  onClick={() => handleSelectCrop(c.name)} 
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all hover:bg-white/5 group",
                    activeCropName === c.name ? "bg-primary/15 border-l-4 border-primary" : "border-l-4 border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl group-hover:scale-125 transition-transform">{c.emoji}</span>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold truncate">{c.name}</span>
                      <span className="text-[9px] opacity-30 uppercase tracking-tighter">Category: {c.category}</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="opacity-0 group-hover:opacity-40 transition-opacity" />
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Intelligence Detail Panel */}
        <div className={cn(
          "flex-1 bg-[#070D07]/90 backdrop-blur-3xl border border-white/10 rounded-3xl flex flex-col overflow-hidden min-h-[700px]",
          mobileView === 'list' ? 'hidden lg:flex' : 'flex'
        )}>
          {!activeCropName ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <Leaf size={40} className="text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-headline font-bold text-white">Select a Crop</h3>
                <p className="text-sm opacity-40 max-w-xs">Search or select any crop from the Mandi list to load comprehensive AI intelligence.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Detail Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02] sticky top-0 z-10 backdrop-blur-md">
                <div className="flex items-center gap-4">
                  {mobileView === 'detail' && (
                    <button onClick={() => setMobileView('list')} className="lg:hidden p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                      <ArrowLeft size={18} />
                    </button>
                  )}
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-4xl shadow-2xl">
                    {activeCropData?.emoji || '🌿'}
                  </div>
                  <div>
                    <h2 className="text-2xl font-headline font-black text-white">{activeCropName}</h2>
                    <p className="text-xs opacity-40">Tactical Brief for <span className="text-primary">{profile.city}</span> Mandi</p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-3">
                  <Badge variant="outline" className="border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest px-3 py-1">
                    Live Intelligence
                  </Badge>
                </div>
              </div>

              {/* Detail Cards Scrollable Area */}
              <ScrollArea className="flex-1">
                <div className="p-8 space-y-8">
                  {/* Summary Bar */}
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <Sparkles className="text-primary animate-pulse" size={24} />
                      <p className="text-sm font-medium text-white/80">AI is analyzing {activeCropName} supply chains for your region...</p>
                    </div>
                    <Button className="bg-primary hover:bg-primary/90 text-[11px] font-black uppercase tracking-widest h-10 px-6 rounded-xl shadow-[0_10px_30px_rgba(76,175,80,0.2)]">
                      Secure Market Access
                    </Button>
                  </div>

                  {/* 2-Column Intelligence Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <IntelligenceBlock 
                      title="Price Intelligence" 
                      icon={TrendingUp} 
                      cropName={activeCropName} 
                      profile={profile}
                      prompt={`Current mandi price range for ${activeCropName} in ${profile.city}, ${profile.state}. Give today's price per kg, 30-day trend (up/down/%), 6-month forecast, and best time to sell. Be specific with numbers.`}
                    />
                    
                    <PriceChartBlock 
                      cropName={activeCropName} 
                      profile={profile} 
                    />

                    <IntelligenceBlock 
                      title="Weather & Season" 
                      icon={CloudSun} 
                      cropName={activeCropName} 
                      profile={profile}
                      prompt={`Ideal weather conditions to grow ${activeCropName} in ${profile.state}. Best sowing month, harvest month, temperature range, rainfall need, and current season suitability for ${profile.state} in the current month.`}
                    />

                    <IntelligenceBlock 
                      title="Irrigation Guide" 
                      icon={Droplets} 
                      cropName={activeCropName} 
                      profile={profile}
                      prompt={`Irrigation guide for ${activeCropName} in ${profile.state}. Water needed per acre per week, best irrigation method, critical watering stages, and signs of overwatering or drought stress.`}
                    />

                    <IntelligenceBlock 
                      title="Pest & Disease Watch" 
                      icon={Bug} 
                      cropName={activeCropName} 
                      profile={profile}
                      prompt={`Top 3 pest and disease threats for ${activeCropName} in ${profile.state} this season. For each: name, symptoms, recommended pesticide with dosage, and organic alternative.`}
                    />

                    <IntelligenceBlock 
                      title="Soil & Fertiliser" 
                      icon={Sprout} 
                      cropName={activeCropName} 
                      profile={profile}
                      prompt={`NPK fertiliser recommendation for ${activeCropName} in ${profile.state}. Application schedule, quantity per acre, best fertiliser brands available in India, and signs of nutrient deficiency.`}
                    />

                    <IntelligenceBlock 
                      title="Storage & Post-Harvest" 
                      icon={Archive} 
                      cropName={activeCropName} 
                      profile={profile}
                      prompt={`Post harvest storage guide for ${activeCropName}. Ideal temperature, humidity, storage duration, common spoilage causes, and how to maximise shelf life before selling.`}
                    />

                    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4">
                      <Target size={32} className="text-primary/40" />
                      <h4 className="text-sm font-bold opacity-60 uppercase tracking-widest">Yield Estimator</h4>
                      <p className="text-[11px] opacity-30">Field-specific yield modeling requires active NDVI telemetry from your Satellite page.</p>
                      <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10">Go to Satellite →</Button>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Reusable Intelligence Card Component
function IntelligenceBlock({ title, icon: Icon, cropName, profile, prompt }: { title: string, icon: any, cropName: string, profile: UserProfile, prompt: string }) {
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function fetchInsight() {
      setLoading(true);
      setError(false);
      setInsight('');
      try {
        const res = await getTacticalInsight({ 
          prompt, 
          system: "You are a professional agricultural expert. Respond in 3 short, sharp sentences max. Use professional terminology." 
        });
        setInsight(res.insight);
      } catch (e) {
        console.error(e);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchInsight();
  }, [cropName, prompt, refreshKey]);

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 relative group transition-all hover:border-primary/30 hover:bg-white/[0.05] flex flex-col min-h-[160px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Icon size={18} />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest opacity-60">{title}</span>
        </div>
        {!loading && (
          <button 
            onClick={() => setRefreshKey(k => k + 1)} 
            className="p-1.5 text-white/10 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
          >
            <RefreshCw size={12} />
          </button>
        )}
      </div>
      
      <div className="flex-1 flex flex-col justify-center">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-3 w-full bg-white/5" />
            <Skeleton className="h-3 w-4/5 bg-white/5" />
            <Skeleton className="h-3 w-2/3 bg-white/5" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-[11px] text-amber-500 font-bold uppercase">Uplink Error</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setRefreshKey(k => k + 1)}
              className="h-7 text-[9px] border-white/10 bg-white/5"
            >
              Tap to Retry
            </Button>
          </div>
        ) : (
          <p className="text-[13px] text-white/70 leading-relaxed font-body italic animate-in fade-in slide-in-from-bottom-2">
            <Typewriter text={insight} speed={28} />
          </p>
        )}
      </div>
    </div>
  );
}

// Specialized Price Chart Block
function PriceChartBlock({ cropName, profile }: { cropName: string, profile: UserProfile }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<{ month: string, price: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchChartData() {
      setLoading(true);
      setError(false);
      try {
        const prompt = `Give monthly average price data for ${cropName} in ${profile.state} for the last 12 months as a valid JSON array of objects: [{"month": "Jan", "price": 100}]. Respond with JSON only, no other text. Use realistic Indian mandi rates for ${cropName}.`;
        const res = await getTacticalInsight({ 
          prompt, 
          system: "You are a JSON data generator. Only return a valid JSON array of objects." 
        });
        
        // Try to parse the insight as JSON
        const raw = res.insight.trim();
        const jsonMatch = raw.match(/\[.*\]/s);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setData(parsed);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (e) {
        console.error("Chart data failed", e);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchChartData();
  }, [cropName, profile.state]);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    
    const prices = data.map(d => d.price);
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    const range = max - min || 1;
    const padding = 20;
    
    const getX = (i: number) => padding + (i * (width - padding * 2) / (data.length - 1));
    const getY = (v: number) => (height - padding) - ((v - min) / range * (height - padding * 2));

    // Animation progress
    let progress = 0;
    const animate = () => {
      progress += 0.02;
      ctx.clearRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      for(let i=0; i<4; i++) {
        const y = padding + (i * (height - padding*2) / 3);
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Main line
      ctx.beginPath();
      ctx.strokeStyle = '#4CAF50';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 12;
      ctx.shadowColor = 'rgba(76, 175, 80, 0.5)';
      
      for(let i=0; i < data.length * progress; i++) {
        const x = getX(i);
        const y = getY(data[i].price);
        if(i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Points
      if (progress >= 1) {
        data.forEach((d, i) => {
          const x = getX(i);
          const y = getY(d.price);
          const isMax = d.price === max;
          const isMin = d.price === min;
          
          ctx.fillStyle = isMax ? '#4CAF50' : isMin ? '#EF5350' : 'white';
          ctx.beginPath();
          ctx.arc(x, y, isMax || isMin ? 4 : 2, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      if (progress < 1) requestAnimationFrame(animate);
    };

    animate();
  }, [data]);

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 flex flex-col h-[220px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <TrendingUp size={18} />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest opacity-60">12-Month Price Trend</span>
        </div>
      </div>
      <div className="flex-1 relative">
        {loading ? (
          <Skeleton className="absolute inset-0 bg-white/5 rounded-xl" />
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] opacity-20 uppercase font-black">Trend Data Unavailable</div>
        ) : (
          <canvas ref={canvasRef} className="w-full h-full" width={400} height={140} />
        )}
      </div>
    </div>
  );
}

// Simple typewriter utility
function Typewriter({ text, speed = 28 }: { text: string, speed?: number }) {
  const [displayed, setDisplayed] = useState('');
  
  useEffect(() => {
    let i = 0;
    setDisplayed('');
    if (!text) return;
    const timer = setInterval(() => {
      setDisplayed(text.slice(0, i));
      i++;
      if (i > text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return (
    <>
      {displayed.split(/(\d+(?:\.\d+)?|[\u0900-\u097F]+)/g).map((part, i) => {
        const isNum = /^\d+(?:\.\d+)?$/.test(part);
        const isHindi = /[\u0900-\u097F]/.test(part);
        return (
          <span key={i} className={cn(isNum ? "text-primary font-bold" : "", isHindi ? "text-amber-500/80" : "")}>
            {part}
          </span>
        );
      })}
      <span className="inline-block w-1 h-3.5 bg-primary ml-1 animate-pulse" />
    </>
  );
}
