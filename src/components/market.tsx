"use client";

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus, ShieldCheck, Wallet, Sparkles, ChevronRight, Lock, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { generateMarketSignals, type MarketSignalOutput } from '@/ai/flows/market-signal-generator-flow';
import { cn } from '@/lib/utils';

const mockChartData = [
  { date: 'Jan', price: 42, type: 'historical' },
  { date: 'Feb', price: 45, type: 'historical' },
  { date: 'Mar', price: 38, type: 'historical' },
  { date: 'Apr', price: 48, type: 'historical' },
  { date: 'May', price: 52, type: 'historical' },
  { date: 'Jun', price: 50, type: 'historical' },
  { date: 'Jul', price: 54, type: 'predicted', low: 48, high: 60 },
  { date: 'Aug', price: 58, type: 'predicted', low: 50, high: 66 },
  { date: 'Sep', price: 55, type: 'predicted', low: 45, high: 65 },
  { date: 'Oct', price: 62, type: 'predicted', low: 52, high: 72 },
  { date: 'Nov', price: 68, type: 'predicted', low: 55, high: 81 },
  { date: 'Dec', price: 72, type: 'predicted', low: 58, high: 86 },
];

export function MarketScreen() {
  const [signals, setSignals] = useState<MarketSignalOutput>([]);
  const [loadingSignals, setLoadingSignals] = useState(true);
  const [step, setStep] = useState(1);
  const [quantity, setQuantity] = useState([500]);
  const [confirming, setConfirming] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [lockingActive, setLockingActive] = useState(false);

  useEffect(() => {
    async function loadSignals() {
      try {
        const data = await generateMarketSignals();
        setSignals(data);
      } catch (err) {
        console.error("Signal load failed:", err);
      } finally {
        setLoadingSignals(false);
      }
    }
    loadSignals();
  }, []);

  const handleBlockchainConfirm = () => {
    setConfirming(true);
    let counter = 0;
    const interval = setInterval(() => {
      setTxHash(Math.random().toString(16).substring(2, 12).toUpperCase());
      counter++;
      if (counter > 15) {
        clearInterval(interval);
        setConfirming(false);
        setConfirmed(true);
      }
    }, 120);
  };

  const currentRate = 52;
  const estimatedValue = quantity[0] * currentRate;

  return (
    <div className="space-y-12 pb-12">
      <Tabs defaultValue="forecast" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-10 bg-muted/30 p-1">
          <TabsTrigger value="forecast" className="rounded-lg">Forecast</TabsTrigger>
          <TabsTrigger value="lock" className="rounded-lg">Lock Price</TabsTrigger>
        </TabsList>

        <TabsContent value="forecast" className="space-y-12 animate-in">
          {/* Market Forecast Section */}
          <div className="bg-card border border-white/5 rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none"><TrendingUp size={300} /></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 relative z-10">
              <div>
                <h3 className="text-2xl font-headline font-black tracking-tight">Tomato Market Trajectory</h3>
                <p className="text-xs opacity-40 uppercase font-black tracking-widest mt-1">6M History • 6M AI Prediction • Maharashtra Mandis</p>
              </div>
              <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 rounded-full border border-primary/20 self-start">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Groq AI Confidence: 94%</span>
              </div>
            </div>

            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHist" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1B5E20" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#1B5E20" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1976D2" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#1976D2" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.4, fontWeight: 700 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.4, fontWeight: 700 }} 
                    domain={[30, 90]}
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '20px',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
                    }} 
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  />
                  
                  {/* Confidence Area */}
                  <Area 
                    type="monotone" 
                    dataKey="high" 
                    data={mockChartData.filter(d => d.type === 'predicted')}
                    stroke="none" 
                    fill="#1976D2" 
                    fillOpacity={0.08} 
                    connectNulls
                  />
                  <Area 
                    type="monotone" 
                    dataKey="low" 
                    data={mockChartData.filter(d => d.type === 'predicted')}
                    stroke="none" 
                    fill="#1976D2" 
                    fillOpacity={0.08} 
                    connectNulls
                  />

                  {/* Historical Plot */}
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    data={mockChartData.filter(d => d.type === 'historical')}
                    stroke="#1B5E20" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorHist)" 
                  />
                  
                  {/* Prediction Plot (Dashed) */}
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    data={mockChartData.filter(d => d.type === 'predicted' || d.date === 'Jun')}
                    stroke="#1976D2" 
                    strokeWidth={4} 
                    strokeDasharray="10 6"
                    fillOpacity={1} 
                    fill="url(#colorPred)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Market Signals Section */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 px-2">Groq Intelligence Signals</h4>
            <div className="flex gap-5 overflow-x-auto pb-6 no-scrollbar px-2">
              {loadingSignals ? (
                [1, 2, 3, 4].map(i => (
                  <div key={i} className="min-w-[200px] h-[220px] bg-card/50 rounded-3xl border border-white/5 p-6 space-y-4">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))
              ) : (
                signals.map((signal, i) => (
                  <div 
                    key={i} 
                    className="min-w-[200px] max-w-[200px] p-6 bg-card border border-white/5 rounded-3xl flex flex-col justify-between group hover:border-primary/30 transition-all shadow-sm animate-in"
                    style={{ transitionDelay: `${i * 100}ms` }}
                  >
                    <div>
                      <div className="text-4xl mb-6 transform group-hover:scale-110 transition-transform">{signal.icon_name}</div>
                      <h5 className="font-bold text-sm leading-tight mb-3 uppercase tracking-tight">{signal.title}</h5>
                      <p className="text-[11px] opacity-60 leading-relaxed line-clamp-4">{signal.detail}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-6">
                      <div className={cn(
                        "p-1 rounded-full",
                        signal.sentiment === 'bullish' ? 'bg-primary/10 text-primary' : 
                        signal.sentiment === 'bearish' ? 'bg-destructive/10 text-destructive' : 
                        'bg-muted-foreground/10 text-muted-foreground'
                      )}>
                        {signal.sentiment === 'bullish' ? <TrendingUp size={14} /> : 
                         signal.sentiment === 'bearish' ? <TrendingDown size={14} /> : 
                         <Minus size={14} />}
                      </div>
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest",
                        signal.sentiment === 'bullish' ? 'text-primary' : 
                        signal.sentiment === 'bearish' ? 'text-destructive' : 
                        'text-muted-foreground'
                      )}>
                        {signal.sentiment}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="lock" className="animate-in">
          <div className="max-w-4xl mx-auto">
            {step === 1 && (
              <div className="bg-card border border-white/5 rounded-[3rem] p-8 md:p-14 space-y-12 animate-in shadow-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-3xl font-headline font-black">Step 1: Define Volume</h3>
                    <p className="text-xs opacity-40 uppercase font-black tracking-widest mt-1">Hedge your harvest against price drops</p>
                  </div>
                  <Badge variant="outline" className="h-8 px-4 font-code text-primary bg-primary/5 border-primary/20 text-md">
                    Live Rate: ₹{currentRate}/kg
                  </Badge>
                </div>
                
                <div className="space-y-10 py-6">
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                      <span className="text-[10px] opacity-30 uppercase font-black tracking-widest mb-2">Quantity</span>
                      <span className="text-7xl font-headline font-black text-primary tabular-nums">{quantity[0].toLocaleString()} <span className="text-2xl opacity-40">kg</span></span>
                    </div>
                    <div className="hidden md:flex flex-col items-end opacity-20">
                      <div className="text-xs font-bold">MIN: 100kg</div>
                      <div className="text-xs font-bold">MAX: 10,000kg</div>
                    </div>
                  </div>
                  <Slider value={quantity} onValueChange={setQuantity} max={10000} min={100} step={100} className="py-6" />
                </div>

                <div className="p-10 bg-primary/5 rounded-[2rem] border border-primary/10 flex flex-col md:flex-row justify-between items-center gap-10">
                  <div className="text-center md:text-left">
                    <p className="text-xs opacity-40 uppercase font-black tracking-widest mb-2">Locked Asset Value</p>
                    <p className="text-5xl font-headline font-black">₹{estimatedValue.toLocaleString()}</p>
                    <p className="text-[10px] opacity-40 mt-3 font-medium uppercase tracking-tighter italic">Secured at Nasik Mandi index price</p>
                  </div>
                  <Button onClick={() => setStep(2)} className="h-16 px-12 rounded-2xl w-full md:w-auto text-lg font-bold group shadow-lg">
                    Next Step <ChevronRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="bg-card border border-white/5 rounded-[3rem] p-8 md:p-14 space-y-12 animate-in text-center shadow-2xl relative overflow-hidden">
                <div className="space-y-2">
                  <h3 className="text-3xl font-headline font-black">Step 2: Securing Rate</h3>
                  <p className="text-xs opacity-40 uppercase font-black tracking-widest">Activating cryptographic price lock</p>
                </div>
                
                {/* SVG Padlock Custom Animation */}
                <div className="relative mx-auto w-64 h-64 flex items-center justify-center">
                  <svg width="160" height="200" viewBox="0 0 160 200" className="transition-all duration-1000">
                    {/* Shackle */}
                    <path 
                      d="M40 80V50C40 27.9 57.9 10 80 10C102.1 10 120 27.9 120 50V80" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="16" 
                      strokeLinecap="round"
                      className={cn(
                        "transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                        lockingActive ? "translate-y-6" : "translate-y-0",
                        lockingActive ? "text-primary" : "text-muted/30"
                      )}
                    />
                    {/* Body */}
                    <rect 
                      x="15" y="80" width="130" height="100" rx="24" 
                      className={cn(
                        "transition-all duration-1000 border-2",
                        lockingActive ? "fill-primary/10 stroke-primary/30" : "fill-muted/5 stroke-white/10"
                      )}
                    />
                    {/* Keyhole */}
                    <circle cx="80" cy="130" r="12" className="fill-muted/20" />
                    <rect x="76" y="140" width="8" height="20" rx="2" className="fill-muted/20" />
                  </svg>
                  {lockingActive && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <Sparkles className="text-primary animate-pulse scale-150" size={100} />
                    </div>
                  )}
                </div>

                <div className="space-y-8">
                  <p className="text-xl font-medium opacity-80 max-w-sm mx-auto">
                    Confirm locking <span className="font-bold text-primary">{quantity[0]}kg</span> at a guaranteed price of <span className="font-bold text-primary">₹{currentRate}/kg</span>.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                    <Button variant="ghost" onClick={() => setStep(1)} className="flex-1 h-14 rounded-2xl font-bold">Adjust Quantity</Button>
                    <Button 
                      onClick={() => {
                        setLockingActive(true);
                        setTimeout(() => setStep(3), 1500);
                      }} 
                      className="flex-1 h-14 rounded-2xl font-bold bg-primary hover:bg-primary/90 shadow-xl"
                    >
                      Lock Rate Now
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="bg-card border border-white/5 rounded-[3rem] p-8 md:p-14 space-y-10 animate-in shadow-2xl">
                <div className="text-center space-y-2">
                  <h3 className="text-3xl font-headline font-black">Step 3: Blockchain Settlement</h3>
                  <p className="text-xs opacity-40 uppercase font-black tracking-widest">Hedge contract deployment phase</p>
                </div>
                
                {/* Smart Contract Interface */}
                <div className="bg-[#0F1123] rounded-[2.5rem] border border-white/10 p-10 font-code space-y-8 relative overflow-hidden shadow-inner">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03]"><Wallet size={160} /></div>
                  
                  <div className="flex items-center justify-between border-b border-white/5 pb-6">
                    <div className="space-y-1">
                      <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em]">Contract Protocol</p>
                      <h4 className="text-xl font-bold tracking-tight">HEDGE_NASIK_TOMATO_04</h4>
                    </div>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">v2.4_MAINNET</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-[12px]">
                    <div className="space-y-6">
                      <div>
                        <p className="opacity-30 mb-2 uppercase tracking-widest font-bold">Counterparty_FID</p>
                        <p className="font-medium text-white/90">0x7F...8821_RAMESH_K</p>
                      </div>
                      <div>
                        <p className="opacity-30 mb-2 uppercase tracking-widest font-bold">Strike_Price</p>
                        <p className="text-primary font-black text-lg">INR 52.00 / KG</p>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <p className="opacity-30 mb-2 uppercase tracking-widest font-bold">Expiry_Epoch</p>
                        <p className="font-medium text-white/90">20 OCT 2025 • 11:59PM</p>
                      </div>
                      <div>
                        <p className="opacity-30 mb-2 uppercase tracking-widest font-bold">Verification_Oracle</p>
                        <p className="font-medium text-white/90">SATELLITE_VEG_INDEX_V3</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-6 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        {confirmed ? <CheckCircle2 className="text-primary" size={24} /> : <div className="w-5 h-5 border-2 border-primary border-t-transparent animate-spin rounded-full" />}
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest">{confirmed ? 'Oracle Validated' : 'Connecting Oracle'}</p>
                        <p className="text-[11px] opacity-40 font-code mt-0.5">{confirmed ? 'TX_STATUS: SUCCESS' : 'TX_STATUS: PENDING'}</p>
                      </div>
                    </div>
                    {confirmed && <Badge className="bg-primary text-primary-foreground">VERIFIED</Badge>}
                  </div>
                </div>

                <div className="space-y-6">
                  {!confirmed ? (
                    <Button 
                      onClick={handleBlockchainConfirm} 
                      disabled={confirming}
                      className="w-full h-20 rounded-2xl text-xl font-black relative overflow-hidden bg-primary shadow-2xl transition-all active:scale-[0.98]"
                    >
                      {confirming ? (
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] opacity-60 mb-1">MINING BLOCK...</span>
                          <span className="font-code text-sm tracking-tighter">0x{txHash}...HASH_SET</span>
                        </div>
                      ) : (
                        "Confirm on Chain"
                      )}
                    </Button>
                  ) : (
                    <div className="space-y-6 animate-in">
                      <div className="p-10 bg-primary/10 border border-primary/30 rounded-[2.5rem] text-center shadow-xl">
                        <Sparkles className="text-primary mx-auto mb-4" size={48} />
                        <h4 className="text-2xl font-headline font-black text-primary">Price Lock Secured</h4>
                        <p className="text-xs opacity-60 mt-2 font-medium">Contract #882194-H deployed to Polygon Network</p>
                        <div className="mt-6 font-code text-[10px] opacity-30 break-all">{txHash}F2D9B4A0C11E392</div>
                      </div>
                      <Button variant="outline" onClick={() => { setStep(1); setConfirmed(false); setLockingActive(false); }} className="w-full h-14 rounded-2xl font-bold uppercase tracking-widest">
                        Manage Hedge Collection
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
