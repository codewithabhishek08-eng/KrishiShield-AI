"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  User, Settings, Shield, Bell, HelpCircle, LogOut, 
  CheckCircle2, Globe, Download, Info, Lightbulb, 
  Calendar, Clock, Leaf, Lock, Cloud, Moon, 
  TrendingUp, Activity, Smartphone, Monitor, Palette, Type, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getFarmInsight } from '@/ai/flows/farm-insight-flow';
import { getAiWeeklySummary } from '@/ai/flows/ai-weekly-summary-flow';
import { useTheme } from '@/components/theme-provider';

function Counter({ target, suffix = "" }: { target: number, suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1200;
    const animate = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOutCubic * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target]);
  return <span>{count}{suffix}</span>;
}

function SparkBar({ value, max = 20, color }: { value: number, max?: number, color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const width = (value / max) * canvas.width;
    
    ctx.fillStyle = color;
    // Draw rounded rect
    const radius = 2;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, canvas.height, radius);
    ctx.fill();
    
    // Background fill
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.roundRect(width, 0, canvas.width - width, canvas.height, radius);
    ctx.fill();
  }, [value, max, color]);
  return <canvas ref={canvasRef} width={60} height={8} className="rounded-full" />;
}

export function ProfileScreen() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  // States
  const [isEditing, setIsEditing] = useState(false);
  const [farmInsight, setFarmInsight] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [loadingInsight, setLoadingInsight] = useState(true);
  const [fontSize, setFontSizeState] = useState('15px');
  const [showKYC, setShowKYC] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [farmProfile, setFarmProfile] = useState({
    crop: 'Tomato (Hybrid)',
    area: '1.2 hectares',
    location: 'Nasik, Maharashtra · Plot 44B',
    irrigation: 'Drip Irrigation',
    soil: 'Red Laterite',
    cycle: '120 days · Next: 22 Sep 2026'
  });

  const [prefs, setPrefs] = useState({
    price: true,
    weather: true,
    disease: true,
    contract: true,
    community: true,
    morning: false,
    repayment: false,
    satellite: true
  });

  const canvasAvatarRef = useRef<HTMLCanvasElement>(null);
  const aiStatsCanvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize from LocalStorage
  useEffect(() => {
    const savedProfile = localStorage.getItem('ks_farm_profile');
    if (savedProfile) setFarmProfile(JSON.parse(savedProfile));
    
    const savedPrefs = localStorage.getItem('ks_prefs');
    if (savedPrefs) setPrefs(JSON.parse(savedPrefs));

    const savedFs = localStorage.getItem('ks_fontsize');
    if (savedFs) {
      setFontSizeState(savedFs);
      document.documentElement.style.fontSize = savedFs;
    }
  }, []);

  // Avatar Canvas
  useEffect(() => {
    const canvas = canvasAvatarRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const name = "Ramesh Kumar";
    const hue = (name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 37) % 360;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = `hsl(${hue}, 45%, 28%)`;
    ctx.beginPath();
    ctx.arc(48, 48, 48, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px Anybody';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RK', 48, 48);
  }, []);

  // AI Weekly Stats Canvas
  useEffect(() => {
    const canvas = aiStatsCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const data = [4, 7, 3, 9, 5, 11, 6];
    const max = Math.max(...data);
    const w = canvas.width;
    const h = canvas.height;
    const barWidth = (w / data.length) * 0.8;
    const gap = (w / data.length) * 0.2;
    
    ctx.clearRect(0, 0, w, h);
    data.forEach((val, i) => {
      const barH = (val / max) * h;
      ctx.fillStyle = '#1976D2';
      ctx.beginPath();
      ctx.roundRect(i * (barWidth + gap), h - barH, barWidth, barH, [4, 4, 0, 0]);
      ctx.fill();
    });
  }, []);

  // Load Insights
  useEffect(() => {
    async function loadInsights() {
      try {
        const [insightRes, summaryRes] = await Promise.all([
          getFarmInsight({ crop: farmProfile.crop, location: 'Nasik', soil: farmProfile.soil }),
          getAiWeeklySummary({ stats: '47 calls: 14 price, 18 disease, 15 loan' })
        ]);
        setFarmInsight(insightRes.insight);
        setAiSummary(summaryRes.summary);
      } catch (e) {
        setFarmInsight("Ensure consistent drip irrigation to prevent moisture stress.");
      } finally {
        setLoadingInsight(false);
      }
    }
    loadInsights();
  }, [farmProfile.crop, farmProfile.soil]);

  const handleToggle = (key: keyof typeof prefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    localStorage.setItem('ks_prefs', JSON.stringify(next));
    toast({
      title: next[key] ? "Alert enabled" : "Alert disabled",
      className: next[key] ? "bg-[#1B5E20] text-white border-none" : "bg-[#323232] text-white border-none"
    });
  };

  const handleFontSize = (size: string) => {
    setFontSizeState(size);
    document.documentElement.style.fontSize = size;
    localStorage.setItem('ks_fontsize', size);
  };

  const handleSaveProfile = () => {
    setIsEditing(false);
    localStorage.setItem('ks_farm_profile', JSON.stringify(farmProfile));
    toast({ title: "Profile updated", className: "bg-primary text-white border-none" });
  };

  const exportData = () => {
    toast({ title: "Preparing data export..." });
    setTimeout(() => {
      const blob = new Blob([JSON.stringify({ farmer: "Ramesh Kumar", farm: farmProfile, stats: { health: 78, score: 742 } }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'KrishiShield_Data_Ramesh.json';
      a.click();
    }, 1500);
  };

  return (
    <div className="space-y-8 animate-in pb-20 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-end px-1">
        <div>
          <h2 className="text-2xl font-headline font-black text-white">Profile & Security</h2>
          <p className="text-[13px] opacity-40 font-body">Personalized field operations</p>
        </div>
        <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 gap-1 self-start">
          {['loan', 'impact'].map((tab) => (
            <button key={tab} className="hidden" /> // Mock to maintain page pattern
          ))}
        </div>
      </div>

      {/* Credit Score Bar */}
      <div className="space-y-3 px-1">
        <div className="flex justify-between items-center">
          <span className="text-[10px] uppercase font-black tracking-[0.2em] opacity-40">AI Credit Score</span>
          <div className="text-right">
            <span className="text-[13px] font-bold text-primary">742 / 1000</span>
            <p className="text-[10px] font-bold text-primary/60">Low Risk · Tier 1 Eligible</p>
          </div>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-primary animate-progress-74" style={{ width: '74.2%' }} />
        </div>
      </div>

      {/* Hero Card */}
      <section className="relative overflow-hidden bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 space-y-8 group transition-all hover:border-white/20">
        <div className="absolute inset-0 bg-hero-gradient animate-gradient-shift pointer-events-none opacity-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="flex flex-col items-center gap-4">
            <div className="relative p-[2px] rounded-full bg-conic-rotate overflow-hidden">
              <div className="bg-[#0D1F0D] rounded-full p-0.5">
                <canvas ref={canvasAvatarRef} width={96} height={96} className="rounded-full shadow-2xl" />
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Badge className="bg-primary/15 text-primary border-primary/30 uppercase tracking-widest text-[9px] font-black px-2.5 py-1">
                <CheckCircle2 size={10} className="mr-1.5" /> Verified Farmer
              </Badge>
              <button className="text-[10px] font-black uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity">Edit Photo</button>
            </div>
          </div>

          <div className="flex-1 space-y-6 text-center md:text-left">
            <div>
              <h3 className="text-4xl font-headline font-black text-white">Ramesh Kumar</h3>
              <p className="text-sm opacity-50 font-medium">Tomato Farmer · Nasik, Maharashtra</p>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              {['1.2 ha field', 'Season 3', 'Since 2023'].map((tag) => (
                <span key={tag} className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[11px] font-bold opacity-60">{tag}</span>
              ))}
            </div>

            <div className="flex flex-col items-center md:items-start gap-2">
              <div className="flex items-center gap-2 text-[12px] opacity-60">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                <span>Aadhaar Verified</span>
                <button onClick={() => setShowKYC(!showKYC)} className="ml-2 text-blue-400 font-bold hover:underline">View KYC →</button>
              </div>
              
              {showKYC && (
                <div className="w-full bg-black/40 rounded-xl p-4 space-y-2 border border-white/5 animate-in slide-in-from-top-2">
                  <div className="flex justify-between items-center text-[12px] opacity-50">
                    <span>Aadhaar: **** 8821</span>
                    <button onClick={() => toast({ title: "Copied" })}><Shield size={12} /></button>
                  </div>
                  <div className="flex justify-between items-center text-[12px] opacity-50">
                    <span>Bank: HDFC **** 4412</span>
                    <button onClick={() => toast({ title: "Copied" })}><Shield size={12} /></button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 grid grid-cols-3 gap-4">
          {[
            { label: 'AI Credit Score', val: 742, color: 'text-primary', sub: 'Low Risk' },
            { label: 'Active Hedges', val: 2, color: 'text-blue-400', sub: '₹94,000 locked' },
            { label: 'Farm Health', val: 78, suffix: '%', color: 'text-amber-400', sub: 'Good condition' },
          ].map((m, i) => (
            <div key={i} className="text-center space-y-1">
              <p className="text-[22px] font-headline font-black leading-none" className={m.color}><Counter target={m.val} suffix={m.suffix} /></p>
              <p className="text-[9px] uppercase font-black tracking-widest opacity-30">{m.label}</p>
              <p className="text-[10px] opacity-40 italic">{m.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Farm Details */}
      <section className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 space-y-8 group hover:border-white/20 transition-all">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-headline font-bold text-white">Farm Profile</h3>
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-white/5 border-white/10 text-[11px] font-black uppercase tracking-widest h-8"
            onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
          >
            {isEditing ? 'Save' : 'Edit'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          {[
            { label: 'Crop Type', key: 'crop', icon: '🍅' },
            { label: 'Land Area', key: 'area' },
            { id: 'loc', label: 'Location', key: 'location' },
            { label: 'Irrigation', key: 'irrigation' },
            { label: 'Soil Type', key: 'soil' },
            { label: 'Harvest Cycle', key: 'cycle' },
          ].map((field, i) => (
            <div key={i} className="space-y-1.5 border-b border-white/[0.03] pb-4">
              <p className="text-[10px] uppercase font-black tracking-widest opacity-30">{field.label}</p>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <input 
                    className="bg-transparent border-b border-primary/40 text-sm font-medium focus:outline-none w-full"
                    value={farmProfile[field.key as keyof typeof farmProfile]}
                    onChange={(e) => setFarmProfile({ ...farmProfile, [field.key]: e.target.value })}
                  />
                ) : (
                  <span className="text-sm font-medium text-white/80">
                    {field.icon && <span className="mr-2">{field.icon}</span>}
                    {farmProfile[field.key as keyof typeof farmProfile]}
                  </span>
                )}
              </div>
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

      {/* Season Progress */}
      <section className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 space-y-10 group hover:border-white/20 transition-all">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-headline font-bold text-white">Season 3 Progress</h3>
          <span className="text-[11px] font-bold opacity-30">2026 Kharif</span>
        </div>

        <div className="relative pt-8 pb-12">
          {/* Base Line */}
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/10 -translate-y-1/2" />
          {/* Progress Line */}
          <div className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 animate-progress-80" style={{ width: '80%' }} />
          
          <div className="relative flex justify-between items-center">
            {[
              { label: 'Sowing', date: 'Mar 15', status: 'completed' },
              { label: 'Germination', date: 'Mar 28', status: 'completed' },
              { label: 'Vegetative', date: 'Apr 20', status: 'completed' },
              { label: 'Flowering', date: 'May 15', status: 'completed' },
              { label: 'Fruiting', date: 'Jun 7', status: 'active' },
              { label: 'Harvest', date: 'Sep 22', status: 'upcoming' },
            ].map((m, i) => (
              <div key={i} className="relative flex flex-col items-center">
                <div className={cn(
                  "w-3.5 h-3.5 rounded-full z-10 border-2 transition-all duration-500",
                  m.status === 'completed' ? "bg-primary border-primary" :
                  m.status === 'active' ? "bg-amber-500 border-amber-500 ring-4 ring-amber-500/20 animate-pulse" :
                  "bg-white/10 border-white/20"
                )}>
                  {m.status === 'completed' && <CheckCircle2 size={8} className="text-white mx-auto mt-0.5" />}
                </div>
                <div className={cn(
                  "absolute whitespace-nowrap text-[10px] font-bold uppercase tracking-tighter",
                  i % 2 === 0 ? "bottom-6" : "top-6",
                  m.status === 'active' ? "text-amber-500" : "opacity-30"
                )}>
                  {m.label}
                  <span className="block text-[8px] font-medium mt-0.5">{m.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-center text-[12px] opacity-30 italic">Days to harvest: <span className="text-primary font-bold">107 days</span> · Target yield: 4.2 tons</p>
      </section>

      {/* Preferences */}
      <section className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 space-y-6 group hover:border-white/20 transition-all">
        <div>
          <h3 className="text-lg font-headline font-bold text-white">Alert Preferences</h3>
          <p className="text-[12px] opacity-30">Customise your field intelligence triggers</p>
        </div>

        <div className="space-y-2">
          {[
            { id: 'price', label: 'Price alerts when mandi changes >10%', icon: TrendingUp },
            { id: 'weather', label: 'Weather warnings 24h before rain', icon: Cloud },
            { id: 'disease', label: 'Disease detection notifications', icon: Leaf },
            { id: 'contract', label: 'Smart contract confirmations', icon: Lock },
            { id: 'community', label: 'Community outbreak alerts', icon: Globe },
            { id: 'morning', label: 'Daily 6AM morning briefing', icon: Moon },
            { id: 'repayment', label: 'Loan repayment reminders', icon: Clock },
            { id: 'satellite', label: 'Satellite rescan completed', icon: Activity },
          ].map((p) => (
            <div key={p.id} className="flex items-center justify-between p-4 border-b border-white/[0.03] last:border-none">
              <div className="flex items-center gap-4">
                <p.icon size={16} className="opacity-30" />
                <span className="text-sm font-medium opacity-80">{p.label}</span>
              </div>
              <button 
                onClick={() => handleToggle(p.id as keyof typeof prefs)}
                className={cn(
                  "w-10 h-5.5 rounded-full relative transition-all duration-300",
                  prefs[p.id as keyof typeof prefs] ? "bg-primary" : "bg-white/10"
                )}
              >
                <div className={cn(
                  "absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-all shadow-sm",
                  prefs[p.id as keyof typeof prefs] ? "left-5" : "left-0.5"
                )} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Theme Settings */}
      <section className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 space-y-8 group hover:border-white/20 transition-all">
        <h3 className="text-lg font-headline font-bold text-white">Display Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { id: 'dark', name: 'Night Field', sub: 'Dark · Default', bg: '#0D1F0D' },
            { id: 'field-mode', name: 'Field Mode', sub: 'Sunlight · High Contrast', bg: '#FDF6E3' },
            { id: 'dawn-mode', name: 'Dawn', sub: 'Low light · Evening', bg: '#1A1A2E' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id as any)}
              className={cn(
                "p-4 rounded-xl border-2 text-left transition-all space-y-4 group",
                theme === t.id ? "bg-primary/5 border-primary" : "bg-white/5 border-white/5 hover:border-white/10"
              )}
            >
              <div className="w-full aspect-video rounded-lg overflow-hidden border border-white/5 relative" style={{ background: t.bg }}>
                <div className="absolute top-2 left-2 w-3/4 h-1.5 bg-white/10 rounded-full" />
                <div className="absolute top-5 left-2 w-1/2 h-1.5 bg-white/10 rounded-full" />
                <div className="absolute bottom-2 right-2 w-3 h-3 bg-primary rounded-full" />
                {theme === t.id && <div className="absolute inset-0 bg-primary/10 flex items-center justify-center"><CheckCircle2 className="text-primary" /></div>}
              </div>
              <div>
                <p className="text-[13px] font-bold text-white">{t.name}</p>
                <p className="text-[10px] opacity-40 uppercase tracking-widest">{t.sub}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div className="flex items-center gap-3 text-white/60">
            <Type size={18} />
            <span className="text-sm font-medium">Interface Scale</span>
          </div>
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

      {/* AI Transparency */}
      <section className="bg-blue-500/[0.03] border border-blue-500/15 rounded-2xl p-8 space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-headline font-bold text-white">AI Activity Log</h3>
            <p className="text-[12px] opacity-40">Privacy-first intelligence processing</p>
          </div>
          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-none px-3 h-7 flex items-center gap-2">
            <Activity size={12} /> Powered by Groq
          </Badge>
        </div>

        <div className="space-y-6">
          <div className="h-[72px] w-full bg-black/20 rounded-xl p-4">
            <canvas ref={aiStatsCanvasRef} width={800} height={40} className="w-full h-full" />
          </div>
          
          {aiSummary && (
            <p className="text-[13px] italic opacity-50 border-l-2 border-blue-500/30 pl-4">&quot;{aiSummary}&quot;</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 pt-4 border-t border-white/5">
            {[
              { label: 'Price Forecasts', val: 14, color: '#4CAF50' },
              { label: 'Disease Analysis', val: 18, color: '#EF5350' },
              { label: 'Loan Advisories', val: 15, color: '#FFB74D' },
              { label: 'General Queries', val: 0, color: '#1976D2' },
            ].map((stat, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-[12px] opacity-60">{stat.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold opacity-30">{stat.val} calls</span>
                  <SparkBar value={stat.val} color={stat.color} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Account Danger Zone */}
      <section className="bg-red-500/[0.03] border border-red-500/10 rounded-2xl p-8 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-white/30">Account Management</h3>
        
        <div className="space-y-2">
          {[
            { label: 'Export my farm data', icon: Download, action: exportData },
            { label: 'Language · English (EN)', icon: Globe },
            { label: 'Privacy & AI Transparency', icon: Shield },
          ].map((item, i) => (
            <button 
              key={i} 
              onClick={item.action}
              className="w-full flex items-center justify-between p-4 bg-white/2 hover:bg-white/5 rounded-xl border border-white/5 transition-all group"
            >
              <div className="flex items-center gap-4">
                <item.icon size={16} className="opacity-30 group-hover:opacity-60 transition-opacity" />
                <span className="text-sm font-medium opacity-80">{item.label}</span>
              </div>
              <ChevronRight size={16} className="opacity-20" />
            </button>
          ))}

          <div className="pt-4 mt-4 border-t border-white/5">
            {!showLogoutConfirm ? (
              <button 
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full flex items-center justify-between p-4 bg-red-500/10 hover:bg-red-500/20 rounded-xl border border-red-500/10 transition-all text-red-400 group"
              >
                <div className="flex items-center gap-4">
                  <LogOut size={16} className="opacity-60" />
                  <span className="text-sm font-bold">Sign Out Securely</span>
                </div>
              </button>
            ) : (
              <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 flex items-center justify-between animate-in zoom-in-95">
                <span className="text-sm font-bold text-red-400">Exit KrishiShield?</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowLogoutConfirm(false)} className="text-[11px] font-black h-8">Cancel</Button>
                  <Button variant="destructive" size="sm" onClick={() => { toast({ title: "Logging out..." }); setTimeout(() => window.location.reload(), 1500); }} className="text-[11px] font-black h-8">Log Out</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <style jsx global>{`
        @keyframes progress-74 { from { width: 0; } to { width: 74.2%; } }
        .animate-progress-74 { animation: progress-74 1.4s ease-out forwards; }
        
        @keyframes progress-80 { from { width: 0; } to { width: 80%; } }
        .animate-progress-80 { animation: progress-80 1.5s ease-out forwards; }

        @keyframes gradient-shift {
          0% { background-position: 0% 0%; }
          100% { background-position: 100% 100%; }
        }
        .bg-hero-gradient {
          background: linear-gradient(135deg, rgba(27,94,32,0.18), rgba(25,118,210,0.08));
          background-size: 200% 200%;
        }
        .animate-gradient-shift { animation: gradient-shift 12s ease-in-out infinite alternate; }

        .bg-conic-rotate {
          background: conic-gradient(from 0deg, #4CAF50, #1976D2, #4CAF50);
          animation: rotate 6s linear infinite;
        }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
