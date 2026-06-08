"use client";

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { generateMarketSignals, type MarketSignalOutput } from '@/ai/flows/market-signal-generator-flow';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus, ShieldCheck, Wallet, Calendar, AlertCircle } from 'lucide-react';

const mockChartData = [
  { date: 'Jan', historical: 45, predicted: null },
  { date: 'Feb', historical: 48, predicted: null },
  { date: 'Mar', historical: 52, predicted: null },
  { date: 'Apr', historical: 50, predicted: 50 },
  { date: 'May', historical: null, predicted: 54, low: 50, high: 58 },
  { date: 'Jun', historical: null, predicted: 62, low: 55, high: 69 },
  { date: 'Jul', historical: null, predicted: 58, low: 50, high: 66 },
  { date: 'Aug', historical: null, predicted: 65, low: 55, high: 75 },
  { date: 'Sep', historical: null, predicted: 70, low: 58, high: 82 },
];

export function MarketScreen() {
  const [signals, setSignals] = useState<MarketSignalOutput>([]);
  const [loadingSignals, setLoadingSignals] = useState(true);
  const [quantity, setQuantity] = useState([500]);
  const [step, setStep] = useState(1);
  const [locking, setLocking] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const loadSignals = async () => {
      try {
        const data = await generateMarketSignals({ crop: 'tomato', region: 'Maharashtra', duration: '6 months' });
        setSignals(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSignals(false);
      }
    };
    loadSignals();
  }, []);

  const handleLock = () => {
    setLocking(true);
    setTimeout(() => {
      setLocking(false);
      setLocked(true);
    }, 2000);
  };

  return (
    <div className="space-y-12">
      <Tabs defaultValue="forecast" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-12">
          <TabsTrigger value="forecast">Market Forecast</TabsTrigger>
          <TabsTrigger value="lock">Lock Price</TabsTrigger>
        </TabsList>

        <TabsContent value="forecast" className="space-y-12 animate-in">
          <div className="bg-card border border-white/5 rounded-3xl p-6 md:p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-headline font-black">Tomato Price Forecast</h3>
                <p className="text-xs opacity-40">Nashik APMC • Last updated 2m ago</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-primary">Groq AI Confidence: 94%</span>
              </div>
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockChartData}>
                  <defs>
                    <linearGradient id="colorHist" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1B5E20" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#1B5E20" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1976D2" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#1976D2" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.4 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.4 }}
                    domain={[30, 90]}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="historical" 
                    stroke="#1B5E20" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorHist)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="predicted" 
                    stroke="#1976D2" 
                    strokeWidth={3} 
                    strokeDasharray="5 5"
                    fillOpacity={1} 
                    fill="url(#colorPred)" 
                  />
                  {/* Confidence Band */}
                  <Area 
                    type="monotone" 
                    dataKey="high" 
                    stroke="none" 
                    fill="#1976D2" 
                    fillOpacity={0.05} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="low" 
                    stroke="none" 
                    fill="#1976D2" 
                    fillOpacity={0.05} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 px-1">Market Signals</h4>
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {loadingSignals ? (
                [1, 2, 3, 4].map(i => <div key={i} className="min-w-[140px] h-[160px] bg-card rounded-2xl animate-pulse" />)
              ) : (
                signals.map((signal, i) => (
                  <div key={i} className="min-w-[180px] p-5 bg-card border border-white/5 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-2xl mb-3 block">{signal.icon_name}</span>
                      <h5 className="font-bold text-sm leading-tight mb-2">{signal.title}</h5>
                      <p className="text-[11px] opacity-60 leading-relaxed">{signal.detail}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      {signal.sentiment === 'bullish' ? <TrendingUp size={12} className="text-primary" /> : signal.sentiment === 'bearish' ? <TrendingDown size={12} className="text-destructive" /> : <Minus size={12} className="text-muted-foreground" />}
                      <span className={`text-[9px] font-black uppercase tracking-widest ${signal.sentiment === 'bullish' ? 'text-primary' : signal.sentiment === 'bearish' ? 'text-destructive' : 'text-muted-foreground'}`}>
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
          <div className="max-w-xl mx-auto space-y-8">
            <div className="bg-card border border-white/5 rounded-3xl p-8">
              {step === 1 && (
                <div className="space-y-8 animate-in">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-headline font-black">Step 1: Set Quantity</h3>
                    <Badge variant="outline" className="font-code">₹52/kg Current Rate</Badge>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-4xl font-headline font-black">{quantity[0]}kg</span>
                      <span className="text-xs opacity-40">Min: 100kg • Max: 10k kg</span>
                    </div>
                    <Slider 
                      value={quantity} 
                      onValueChange={setQuantity} 
                      max={10000} 
                      min={100} 
                      step={100} 
                      className="py-4"
                    />
                  </div>
                  <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                    <p className="text-sm opacity-60">Estimated harvest value</p>
                    <p className="text-2xl font-headline font-bold text-primary">₹{(quantity[0] * 52).toLocaleString()}</p>
                  </div>
                  <Button onClick={() => setStep(2)} className="w-full h-12">Continue to Agreement</Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-12 animate-in text-center">
                  <h3 className="text-xl font-headline font-black">Step 2: Confirm Price Lock</h3>
                  
                  <div className="relative mx-auto w-40 h-40">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/5" />
                      <path 
                        d="M30 40 V30 A20 20 0 0 1 70 30 V40" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="6" 
                        className={`transition-all duration-1000 ${locking ? 'translate-y-2' : ''}`}
                      />
                      <rect x="25" y="40" width="50" height="40" rx="4" fill="currentColor" className="text-primary" />
                    </svg>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm opacity-60">You are locking {quantity[0]}kg at</p>
                    <p className="text-3xl font-headline font-bold">₹52.00 / kg</p>
                  </div>

                  <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                    <Button onClick={() => { handleLock(); setStep(3); }} className="flex-1">Confirm Lock</Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8 animate-in">
                  <div className="flex items-center gap-4 mb-8">
                    {locked ? <ShieldCheck className="text-primary" size={32} /> : <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />}
                    <div>
                      <h3 className="text-xl font-headline font-black">{locked ? 'Price Secured' : 'Executing Contract...'}</h3>
                      <p className="text-xs opacity-40 font-code">{locked ? '0x8f2d...4a1e Confirmed' : 'Syncing with Chain'}</p>
                    </div>
                  </div>

                  <div className="bg-[#0F1123] rounded-2xl p-6 font-code text-xs space-y-4 border border-white/5">
                    <div className="flex justify-between opacity-40">
                      <span>WALLET_ADDR</span>
                      <span>0x71C...3d2e</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-40">STRIKE_PRICE</span>
                      <span className="text-primary">INR 52.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-40">EXPIRY_DATE</span>
                      <span>2024-09-12</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-40">STATUS</span>
                      <span className={locked ? 'text-primary' : 'text-accent'}>{locked ? 'VALID_AND_LOCKED' : 'PENDING_SIG'}</span>
                    </div>
                  </div>

                  {locked && (
                    <Button variant="outline" className="w-full flex gap-2" onClick={() => { setStep(1); setLocked(false); }}>
                      <Wallet size={16} />
                      View in Harvest Wallet
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
