"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ReferenceLine, ComposedChart 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Minus, ShieldCheck, Wallet, Sparkles, 
  ChevronRight, Lock, CheckCircle2, Calendar, Info, ArrowUpRight, 
  ArrowDownRight, Search, Star, ArrowLeft, Droplets, Thermometer,
  Microscope, Activity, Lightbulb, TrendingUp as TrendIcon, Plus
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CROPS, type Crop } from '@/lib/crop-data';
import { generateMarketSignals } from '@/ai/flows/market-signal-generator-flow';
import { getWeatherAssessment } from '@/ai/flows/weather-assessment-flow';
import { getDiseaseRisks } from '@/ai/flows/disease-risk-flow';
import { getCropIntelligence } from '@/ai/flows/crop-intelligence-flow';

function Sparkline({ values, trend }: { values: number[], trend: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = trend === 'bullish' ? '#4CAF50' : trend === 'bearish' ? '#F44336' : '#9E9E9E';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const slice = values.slice(-14);
    const stepX = canvas.width / (slice.length - 1);
    const max = Math.max(...slice);
    const min = Math.min(...slice);
    const range = max - min || 1;
    
    ctx.beginPath();
    slice.forEach((v, i) => {
      const x = i * stepX;
      const y = canvas.height - ((v - min) / range) * canvas.height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [values, trend]);
  return <canvas ref={canvasRef} width={40} height={16} />;
}

export function MarketScreen() {
  // State: Browser
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'All' | 'vegetable' | 'fruit' | 'crop' | 'seed'>('All');
  const [sort, setSort] = useState<'A-Z' | 'PriceH' | 'PriceL' | 'Trending'>('A-Z');
  const [selectedCropId, setSelectedCropId] = useState('tomato');
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [showWatchlist, setShowWatchlist] = useState(false);

  // State: Intelligence Panel
  const [activeTab, setActiveTab] = useState<'Price' | 'Weather' | 'Irrigation' | 'Protection' | 'Growth' | 'AI Insight'>('Price');
  const [aiData, setAiData] = useState<any>({});
  const [loadingAi, setLoadingAi] = useState<Record<string, boolean>>({});

  // Simulation State
  const [crops, setCrops] = useState<Crop[]>(CROPS);

  const { toast } = useToast();

  // Derived Data
  const filteredCrops = useMemo(() => {
    let list = crops.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) && 
      (category === 'All' || c.category === category)
    );
    if (sort === 'A-Z') list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'PriceH') list.sort((a, b) => b.basePrice - a.basePrice);
    if (sort === 'PriceL') list.sort((a, b) => a.basePrice - b.basePrice);
    if (sort === 'Trending') list.sort((a, b) => Math.abs(b.changeToday) - Math.abs(a.changeToday));
    return list;
  }, [search, category, sort, crops]);

  const selectedCrop = useMemo(() => 
    crops.find(c => c.id === selectedCropId) || crops[0], 
  [selectedCropId, crops]);

  // Effects
  useEffect(() => {
    const saved = localStorage.getItem('ks_watchlist');
    if (saved) setWatchlist(JSON.parse(saved));
  }, []);

  // Real-time Simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setCrops(prev => {
        const next = [...prev];
        for (let i = 0; i < 5; i++) {
          const idx = Math.floor(Math.random() * next.length);
          const c = { ...next[idx] };
          const nudge = (Math.random() - 0.495) * c.basePrice * 0.004;
          c.basePrice = parseFloat((c.basePrice + nudge).toFixed(2));
          c.changeToday = parseFloat((c.changeToday + (nudge / c.basePrice) * 100).toFixed(2));
          const nextHistory = [...c.priceHistory];
          nextHistory[nextHistory.length - 1] = c.basePrice;
          c.priceHistory = nextHistory;
          next[idx] = c;
        }
        return next;
      });
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const fetchAiTab = async (tab: string) => {
    const key = `${selectedCrop.id}_${tab}`;
    if (aiData[key] || loadingAi[key]) return;

    setLoadingAi(prev => ({ ...prev, [key]: true }));
    try {
      let res;
      if (tab === 'Price') res = await generateMarketSignals({ cropName: selectedCrop.name, trend: selectedCrop.trend });
      if (tab === 'Weather') res = await getWeatherAssessment({ 
        cropName: selectedCrop.name, 
        ideal: `${selectedCrop.weather.minTemp}-${selectedCrop.weather.maxTemp}C, ${selectedCrop.weather.rainfall} rainfall`,
        current: "32C, 65% humidity, partly cloudy"
      });
      if (tab === 'Protection') res = await getDiseaseRisks({ cropName: selectedCrop.name, location: selectedCrop.states[0] });
      if (tab === 'AI Insight') res = await getCropIntelligence({ 
        cropName: selectedCrop.name, 
        data: `Price ₹${selectedCrop.basePrice}, Trend: ${selectedCrop.trend}, Season: ${selectedCrop.season}` 
      });
      
      setAiData(prev => ({ ...prev, [key]: res }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAi(prev => ({ ...prev, [key]: false }));
    }
  };

  useEffect(() => {
    fetchAiTab(activeTab);
  }, [selectedCrop.id, activeTab]);

  const toggleWatch = (id: string) => {
    const next = watchlist.includes(id) ? watchlist.filter(x => x !== id) : [...watchlist, id];
    setWatchlist(next);
    localStorage.setItem('ks_watchlist', JSON.stringify(next));
    toast({ title: watchlist.includes(id) ? "Removed from watchlist" : "Added to watchlist" });
  };

  // Profitability Calc Logic
  const [land, setLand] = useState([1]);
  const [invest, setInvestment] = useState([20000]);
  const yieldKg = useMemo(() => {
    const range = selectedCrop.yieldPerHectare.match(/\d+/g);
    const avg = range ? (parseInt(range[0]) + parseInt(range[1])) / 2 : 20;
    return land[0] * avg * 1000;
  }, [land, selectedCrop]);
  const gross = yieldKg * selectedCrop.basePrice;
  const net = gross - invest[0];
  const roi = ((net / invest[0]) * 100).toFixed(1);

  return (
    <div className="flex flex-col gap-4 animate-in pb-20">
      {/* Ticker Strip */}
      <div className="relative overflow-hidden border-y border-white/5 py-2 bg-white/[0.02]">
        <div className="flex animate-ticker whitespace-nowrap gap-12">
          {[1, 2].map(group => (
            <div key={group} className="flex gap-12 items-center">
              {crops.slice(0, 20).sort((a,b) => Math.abs(b.changeToday) - Math.abs(a.changeToday)).map(c => (
                <div key={c.id} className="flex items-center gap-2">
                  <span className="text-sm">{c.emoji}</span>
                  <span className="text-[13px] font-body text-white/55">{c.name}</span>
                  <span className="text-[13px] font-bold text-white">₹{c.basePrice}</span>
                  <span className={cn("text-[11px] font-bold", c.changeToday > 0 ? "text-[#4CAF50]" : "text-[#F44336]")}>
                    {c.changeToday > 0 ? '▲' : '▼'}{Math.abs(c.changeToday)}%
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-180px)] overflow-hidden">
        {/* Left Panel: Browser */}
        <div className={cn(
          "lg:w-[380px] w-full flex flex-col gap-4 bg-white/[0.03] border border-white/10 rounded-2xl p-4 overflow-hidden transition-all duration-300",
          mobileView === 'detail' ? 'hidden lg:flex' : 'flex'
        )}>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
              <Input 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search 200 crops..." 
                className="bg-white/5 border-white/10 pl-9 rounded-xl h-10"
              />
            </div>
            
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {['All', 'vegetable', 'fruit', 'crop', 'seed'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat as any)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border",
                    category === cat ? "bg-primary/20 border-primary/40 text-primary" : "bg-white/5 border-white/10 text-white/40"
                  )}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 text-[11px] font-bold text-white/30 border-b border-white/5 pb-2">
              <span>Sort:</span>
              {(['A-Z', 'PriceH', 'PriceL', 'Trending'] as const).map(s => (
                <button 
                  key={s} 
                  onClick={() => setSort(s)}
                  className={cn("hover:text-white transition-colors", sort === s && "text-primary")}
                >
                  {s.replace('PriceH', 'Price ↑').replace('PriceL', 'Price ↓')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar relative">
            <div style={{ height: filteredCrops.length * 72 }}>
              {filteredCrops.map((c, i) => (
                <div 
                  key={c.id}
                  onClick={() => { setSelectedCropId(c.id); setMobileView('detail'); }}
                  className={cn(
                    "absolute w-full h-[72px] flex items-center gap-4 px-4 cursor-pointer transition-all hover:bg-white/5 group",
                    selectedCropId === c.id ? "bg-primary/5 border-l-4 border-primary" : "border-l-4 border-transparent"
                  )}
                  style={{ top: i * 72 }}
                >
                  <div className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center text-xl shrink-0">
                    {c.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold truncate">{c.name}</h4>
                    <p className="text-[11px] opacity-30 uppercase tracking-tighter">{c.category} · {c.states[0]}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <p className="text-sm font-bold">₹{c.basePrice}</p>
                    <div className="flex items-center gap-2">
                      <Sparkline values={c.priceHistory} trend={c.trend} />
                      <Badge className={cn("text-[9px] px-1 h-4", c.changeToday > 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400")}>
                        {c.changeToday}%
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel: Intelligence */}
        <div className={cn(
          "flex-1 bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col overflow-hidden transition-all duration-300",
          mobileView === 'list' ? 'hidden lg:flex' : 'flex'
        )}>
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              {mobileView === 'detail' && (
                <button onClick={() => setMobileView('list')} className="lg:hidden p-2 bg-white/5 rounded-full">
                  <ArrowLeft size={18} />
                </button>
              )}
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-4xl shadow-2xl">
                {selectedCrop.emoji}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-headline font-black">{selectedCrop.name}</h2>
                  <button onClick={() => toggleWatch(selectedCrop.id)} className={cn("transition-colors", watchlist.includes(selectedCrop.id) ? "text-yellow-400" : "text-white/20")}>
                    <Star size={20} fill={watchlist.includes(selectedCrop.id) ? "currentColor" : "none"} />
                  </button>
                </div>
                <p className="text-[13px] opacity-40 uppercase tracking-widest">{selectedCrop.category} · {selectedCrop.states.join(' · ')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={cn("uppercase text-[10px] px-3 py-1", 
                selectedCrop.trend === 'bullish' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                selectedCrop.trend === 'bearish' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                "bg-blue-500/10 text-blue-400 border-blue-500/20"
              )}>
                {selectedCrop.trend}
              </Badge>
              <Badge className={cn("text-[10px] px-3 py-1", selectedCrop.changeToday > 0 ? "bg-green-500 text-white" : "bg-red-500 text-white")}>
                {selectedCrop.changeToday > 0 ? '+' : ''}{selectedCrop.changeToday}% Today
              </Badge>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar px-6 py-3 border-b border-white/5 bg-white/[0.01]">
            {(['Price', 'Weather', 'Irrigation', 'Protection', 'Growth', 'AI Insight'] as const).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={cn(
                  "px-6 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all uppercase tracking-widest border",
                  activeTab === t ? "bg-primary/15 border-primary/40 text-primary" : "bg-white/5 border-white/10 text-white/40"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-8 no-scrollbar bg-black/20">
            {activeTab === 'Price' && (
              <div className="space-y-12 animate-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: "Current Price", val: `₹${selectedCrop.basePrice}/${selectedCrop.unit}`, sub: `${selectedCrop.changeToday}% change`, color: "#4CAF50" },
                    { label: "6-Month Forecast", val: `₹${selectedCrop.forecastPrices[179]}/${selectedCrop.unit}`, sub: "AI predicted peak", color: "#1976D2" },
                    { label: "MSP Level", val: selectedCrop.mspINR ? `₹${selectedCrop.mspINR}` : "N/A", sub: "Government minimum", color: "white" },
                  ].map((s, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                      <p className="text-[10px] uppercase font-black tracking-widest opacity-30 mb-4">{s.label}</p>
                      <p className="text-3xl font-headline font-black" style={{ color: s.color }}>{s.val}</p>
                      <p className="text-[11px] mt-2 opacity-40">{s.sub}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={selectedCrop.priceHistory.map((v, i) => ({ 
                      day: i, 
                      price: v,
                      upper: selectedCrop.forecastPrices[i] ? selectedCrop.forecastPrices[i] + (i * 0.05) : null,
                      lower: selectedCrop.forecastPrices[i] ? selectedCrop.forecastPrices[i] - (i * 0.05) : null,
                      forecast: selectedCrop.forecastPrices[i]
                    }))}>
                      <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="day" hide />
                      <YAxis domain={['auto', 'auto']} hide />
                      <Tooltip contentStyle={{ background: '#0C1C0C', border: 'none', borderRadius: '12px' }} />
                      <Area type="monotone" dataKey="price" stroke="#4CAF50" strokeWidth={3} fill="url(#colorPrice)" fillOpacity={0.1} />
                      <Area type="monotone" dataKey="forecast" stroke="#1976D2" strokeWidth={2} strokeDasharray="5 5" fill="none" />
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#4CAF50" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest opacity-30">Groq Market Signals</h4>
                  <div className="flex gap-4 overflow-x-auto no-scrollbar">
                    {loadingAi[`${selectedCrop.id}_Price`] ? [1,2,3].map(i => <Skeleton key={i} className="h-24 w-64 bg-white/5" />) :
                      (aiData[`${selectedCrop.id}_Price`] || []).map((s: any, i: number) => (
                        <div key={i} className="min-w-[240px] bg-white/5 border border-white/10 p-5 rounded-2xl space-y-3">
                          <span className="text-2xl">{s.emoji}</span>
                          <h5 className="font-bold text-sm uppercase tracking-tight">{s.title}</h5>
                          <p className="text-[11px] opacity-40 leading-relaxed">{s.detail}</p>
                          <div className="flex justify-between items-center pt-2">
                            <Badge variant="outline" className="text-[9px] uppercase border-none bg-white/10">{s.sentiment}</Badge>
                            <span className={cn("text-xs font-bold", s.pct_impact > 0 ? "text-green-400" : "text-red-400")}>{s.pct_impact}%</span>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Weather' && (
              <div className="space-y-12 animate-in">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Temp Range</p>
                    <div className="flex items-center justify-between">
                      <Thermometer size={32} className="text-red-400" />
                      <div className="text-right">
                        <p className="text-2xl font-black">{selectedCrop.weather.minTemp}° – {selectedCrop.weather.maxTemp}°</p>
                        <p className="text-[10px] opacity-40">Optimal Range</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Rainfall</p>
                    <div className="flex items-center gap-4">
                      <div className="w-4 h-16 bg-white/5 rounded-full relative overflow-hidden">
                        <div className="absolute bottom-0 w-full bg-blue-500 transition-all duration-1000" style={{ height: selectedCrop.weather.rainfall === 'high' ? '90%' : selectedCrop.weather.rainfall === 'medium' ? '60%' : '30%' }} />
                      </div>
                      <div>
                        <p className="text-xl font-bold uppercase">{selectedCrop.weather.rainfall}</p>
                        <p className="text-[10px] opacity-40">Water Demand</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Humidity</p>
                    <div className="relative w-20 h-10 mx-auto overflow-hidden">
                      <svg viewBox="0 0 80 40" className="w-full h-full">
                        <path d="M5 40 A 35 35 0 0 1 75 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                        <path d="M5 40 A 35 35 0 0 1 75 40" fill="none" stroke="#4DB6AC" strokeWidth="8" strokeDasharray="110" strokeDashoffset="40" />
                      </svg>
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[12px] font-bold">{selectedCrop.weather.humidity}</span>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Best Season</p>
                    <div className="grid grid-cols-6 gap-1">
                      {['J','F','M','A','M','J','J','A','S','O','N','D'].map((m, i) => (
                        <div key={i} className={cn("h-4 rounded-sm flex items-center justify-center text-[8px] font-bold", i >= 9 || i <= 1 ? "bg-primary/40 text-white" : "bg-white/5 text-white/20")}>
                          {m}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/20 p-8 rounded-3xl space-y-6">
                  <div className="flex items-center gap-4">
                    <Sparkles className="text-primary" />
                    <h3 className="font-bold">AI Weather Assessment</h3>
                  </div>
                  {loadingAi[`${selectedCrop.id}_Weather`] ? <Skeleton className="h-20 w-full" /> : 
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="flex flex-col items-center justify-center">
                        <div className="relative w-20 h-20">
                          <svg className="w-full h-full -rotate-90">
                            <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                            <circle cx="40" cy="40" r="35" fill="none" stroke="#4CAF50" strokeWidth="6" strokeDasharray="220" strokeDashoffset={220 - (220 * (aiData[`${selectedCrop.id}_Weather`]?.match_score || 85) / 100)} />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-lg font-black">{aiData[`${selectedCrop.id}_Weather`]?.match_score}%</span>
                        </div>
                        <p className="text-[10px] uppercase font-bold opacity-30 mt-2">Match Score</p>
                      </div>
                      <div className="md:col-span-2 space-y-4">
                        <p className="text-sm italic opacity-70">"{aiData[`${selectedCrop.id}_Weather`]?.assessment}"</p>
                        <div className="space-y-2">
                          {(aiData[`${selectedCrop.id}_Weather`]?.recommendations || []).map((r: string, i: number) => (
                            <div key={i} className="flex items-center gap-3 text-xs opacity-60">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                              {r}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            )}

            {activeTab === 'Irrigation' && (
              <div className="space-y-12 animate-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/5 border border-white/10 p-6 rounded-2xl text-center space-y-4">
                    <div className="w-12 h-12 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center">
                      <Droplets className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase opacity-30 font-black">Method</p>
                      <p className="text-lg font-bold">{selectedCrop.irrigation.method}</p>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-6 rounded-2xl text-center space-y-4">
                    <div className="w-12 h-12 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center relative overflow-hidden">
                      <div className="absolute bottom-0 w-full bg-blue-400/40" style={{ height: '70%' }} />
                      <Droplets className="text-blue-400 z-10" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase opacity-30 font-black">Requirement</p>
                      <p className="text-lg font-bold">{selectedCrop.irrigation.waterReq}</p>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-6 rounded-2xl text-center space-y-4">
                    <div className="w-12 h-12 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center">
                      <Calendar className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase opacity-30 font-black">Frequency</p>
                      <p className="text-lg font-bold">{selectedCrop.irrigation.frequency}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-white/5 bg-white/2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest opacity-30">Weekly Growth Stage Demand (mm)</h4>
                  </div>
                  <div className="grid grid-cols-7 divide-x divide-white/5">
                    {['Sowing', 'Germ', 'Veg', 'Flow', 'Fruit', 'Mat', 'Harv'].map((s, i) => (
                      <div key={i} className="p-4 text-center space-y-2">
                        <p className="text-[9px] font-bold opacity-30 uppercase">{s}</p>
                        <div className={cn("w-full h-1.5 rounded-full", i > 3 ? "bg-blue-500" : "bg-blue-900/40")} />
                        <p className="text-xs font-bold">{[15, 22, 35, 45, 50, 20, 10][i]}mm</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Protection' && (
              <div className="space-y-12 animate-in">
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest opacity-30">Recommended Pesticides</h4>
                  <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-white/5 border-b border-white/5">
                        <tr>
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-40">Product</th>
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-40">Target</th>
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-40">Dosage</th>
                          <th className="p-4 text-[10px] font-black uppercase tracking-widest opacity-40 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {selectedCrop.pesticides.map((p, i) => (
                          <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-4 text-sm font-bold">{p.name}</td>
                            <td className="p-4 text-sm opacity-60">{p.target}</td>
                            <td className="p-4">
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-none text-[10px]">{p.dosage}</Badge>
                            </td>
                            <td className="p-4 text-right">
                              <button className="text-[11px] font-bold text-blue-400 hover:underline">Safety Info</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-red-500/[0.03] border border-red-500/15 rounded-3xl p-8 space-y-6">
                  <div className="flex items-center gap-4 text-red-400">
                    <Microscope size={24} />
                    <h3 className="font-bold">AI Disease Risk Profile</h3>
                  </div>
                  {loadingAi[`${selectedCrop.id}_Protection`] ? <Skeleton className="h-40 w-full" /> : 
                    <div className="space-y-4">
                      {(aiData[`${selectedCrop.id}_Protection`]?.risks || []).map((r: any, i: number) => (
                        <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-white/2 rounded-2xl border border-white/5 gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h5 className="font-bold text-white">{r.disease}</h5>
                              <Badge className={cn("text-[9px] uppercase", 
                                r.likelihood === 'high' ? "bg-red-500" : 
                                r.likelihood === 'medium' ? "bg-amber-500" : "bg-green-500"
                              )}>{r.likelihood} risk</Badge>
                            </div>
                            <p className="text-[11px] opacity-40 mt-1">{r.symptom}</p>
                          </div>
                          <div className="bg-white/5 px-4 py-2 rounded-xl">
                            <p className="text-[9px] font-black uppercase opacity-30 mb-1">Prevention</p>
                            <p className="text-[11px] font-medium">{r.prevention}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  }
                </div>
              </div>
            )}

            {activeTab === 'Growth' && (
              <div className="space-y-12 animate-in">
                <div className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-10">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black uppercase tracking-widest opacity-30">Life Cycle Tracker</h4>
                    <span className="text-xl font-black text-primary">{selectedCrop.growthDays} Days</span>
                  </div>
                  <div className="relative pt-6 pb-12">
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-white/10 -translate-y-1/2 rounded-full" />
                    <div className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 rounded-full transition-all duration-1000" style={{ width: '40%' }} />
                    <div className="flex justify-between relative">
                      {['Sowing', 'Germ', 'Veg', 'Flower', 'Fruit', 'Harv'].map((s, i) => (
                        <div key={i} className="flex flex-col items-center">
                          <div className={cn("w-4 h-4 rounded-full border-2 transition-all", i < 2 ? "bg-primary border-primary" : i === 2 ? "bg-primary border-primary ring-4 ring-primary/20" : "bg-white/10 border-white/20")} />
                          <span className={cn("absolute top-8 text-[10px] font-bold uppercase", i <= 2 ? "text-white" : "opacity-30")}>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: "Soil", val: selectedCrop.soilType },
                    { label: "Growth", val: `${selectedCrop.growthDays} Days` },
                    { label: "Yield", val: selectedCrop.yieldPerHectare },
                    { label: "Season", val: selectedCrop.season },
                    { label: "Top State", val: selectedCrop.states[0] },
                    { label: "MSP", val: selectedCrop.mspINR ? `₹${selectedCrop.mspINR}` : "N/A" },
                  ].map((s, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-2xl hover:-translate-y-1 transition-transform">
                      <p className="text-[10px] uppercase font-black opacity-30 mb-1">{s.label}</p>
                      <p className="text-sm font-bold text-white">{s.val}</p>
                    </div>
                  ))}
                </div>

                {/* Profit Calc */}
                <div className="bg-[#1B5E20]/10 border border-primary/20 p-8 rounded-3xl space-y-8">
                  <h3 className="font-headline font-black text-xl flex items-center gap-3">
                    <TrendIcon className="text-primary" />
                    Estimate Earnings
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <div className="flex justify-between text-xs font-bold opacity-60">
                          <span>Land Area</span>
                          <span>{land[0]} Hectares</span>
                        </div>
                        <Slider value={land} onValueChange={setLand} min={0.1} max={5} step={0.1} className="bg-primary/20" />
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between text-xs font-bold opacity-60">
                          <span>Investment</span>
                          <span>₹{invest[0].toLocaleString('en-IN')}</span>
                        </div>
                        <Slider value={invest} onValueChange={setInvestment} min={5000} max={500000} step={5000} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: "Exp. Yield", val: `${yieldKg.toLocaleString()} kg` },
                        { label: "Revenue", val: `₹${gross.toLocaleString()}` },
                        { label: "Net Profit", val: `₹${net.toLocaleString()}`, color: net > 0 ? "text-primary" : "text-red-400" },
                        { label: "ROI", val: `${roi}%`, color: parseFloat(roi) > 0 ? "text-primary" : "text-red-400" },
                      ].map((r, i) => (
                        <div key={i} className="bg-black/20 p-4 rounded-xl">
                          <p className="text-[9px] font-black uppercase opacity-30 mb-1">{r.label}</p>
                          <p className={cn("text-lg font-black", r.color || "text-white")}>{r.val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'AI Insight' && (
              <div className="space-y-12 animate-in">
                {loadingAi[`${selectedCrop.id}_AI Insight`] ? <div className="space-y-6"><Skeleton className="h-20 w-full" /><Skeleton className="h-40 w-full" /></div> :
                  <div className="space-y-8">
                    <div className="border-l-4 border-primary pl-6 py-2">
                      <p className="text-lg font-body leading-relaxed text-white/80">
                        {aiData[`${selectedCrop.id}_AI Insight`]?.summary}
                      </p>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl flex items-start gap-4">
                      <div className="p-2 bg-amber-500/20 rounded-lg text-amber-500"><Calendar size={20} /></div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500/60">Best Time to Sell</p>
                        <p className="text-sm font-bold text-amber-200 mt-1">{aiData[`${selectedCrop.id}_AI Insight`]?.best_time_to_sell}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase opacity-30">Risk Factors</h4>
                        {(aiData[`${selectedCrop.id}_AI Insight`]?.risk_factors || []).map((r: string, i: number) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                            <Info size={14} className="text-red-400 shrink-0" />
                            <span className="text-xs opacity-70">{r}</span>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase opacity-30">Market Opportunities</h4>
                        {(aiData[`${selectedCrop.id}_AI Insight`]?.opportunities || []).map((o: string, i: number) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/10 rounded-xl">
                            <Plus size={14} className="text-primary shrink-0" />
                            <span className="text-xs opacity-70">{o}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-primary/10 border border-primary/20 p-8 rounded-3xl relative overflow-hidden group">
                      <Sparkles className="absolute -right-4 -top-4 w-32 h-32 opacity-5 rotate-12 group-hover:scale-110 transition-transform" />
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-2 bg-primary/20 rounded-lg text-primary"><Lightbulb size={24} /></div>
                        <h4 className="font-bold text-primary">AI Strategy Tip</h4>
                      </div>
                      <p className="text-lg italic font-medium leading-relaxed text-primary/80">
                        "{aiData[`${selectedCrop.id}_AI Insight`]?.farmer_tip}"
                      </p>
                    </div>

                    <p className="text-[10px] text-right opacity-20 italic">AI Intelligence Engine · Model: llama-3.3-70b · Ref ID: {selectedCrop.id}</p>
                  </div>
                }
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 25s linear infinite;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
