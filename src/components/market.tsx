"use client";

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus, ShieldCheck, Wallet, Sparkles, ChevronRight, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { generateMarketSignals, type MarketSignalOutput } from '@/ai/flows/market-signal-generator-flow';

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

  useEffect(() => {
    async function loadSignals() {
      try {
        const data = await generateMarketSignals();
        setSignals(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSignals(false);
      }
    }
    loadSignals();
  }, []);

  const handleConfirm = () => {
    setConfirming(true);
    let counter = 0;
    const interval = setInterval(() => {
      setTxHash(Math.random().toString(16).substring(2, 10).toUpperCase());
      counter++;
      if (counter > 15) {
        clearInterval(interval);
        setConfirming(false);
        setConfirmed(true);
      }
    }, 120);
  };

  return (
    <div className="space-y-12">
      <Tabs defaultValue="forecast" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8">
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="lock">Lock Price</TabsTrigger>
        </TabsList>

        <TabsContent value="forecast" className="space-y-12 animate-in">
          {/* 1. Full Width Chart */}
          <div className="bg-card border border-white/5 rounded-[2rem] p-6 md:p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-headline font-black">Tomato Market Trajectory</h3>
                <p className="text-xs opacity-40">6M History • 6M AI Prediction</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-primary">Groq AI Confidence: 94%</span>
              </div>
            </div>

            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHist" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1B5E20" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#1B5E20" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1976D2" stopOpacity={0.2}/>
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
                    domain={[20, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }} 
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  />
                  
                  {/* Historical Line */}
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    data={mockChartData.filter(d => d.type === 'historical')}
                    stroke="#1B5E20" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorHist)" 
                  />
                  
                  {/* Confidence Band */}
                  <Area 
                    type="monotone" 
                    dataKey="high" 
                    data={mockChartData.filter(d => d.type === 'predicted')}
                    stroke="none" 
                    fill="#1976D2" 
                    fillOpacity={0.12} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="low" 
                    data={mockChartData.filter(d => d.type === 'predicted')}
                    stroke="none" 
                    fill="#1976D2" 
                    fillOpacity={0.12} 
                  />

                  {/* Predicted Line */}
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    data={mockChartData.filter(d => d.type === 'predicted' || (d.date === 'Jun'))}
                    stroke="#1976D2" 
                    strokeWidth={3} 
                    strokeDasharray="8 4"
                    fillOpacity={1} 
                    fill="url(#colorPred)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Signal Cards */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 px-1">Market Signals</h4>
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {loadingSignals ? (
                [1, 2, 3, 4].map(i => <Skeleton key={i} className="min-w-[140px] h-[160px] rounded-2xl" />)
              ) : (
                signals.map((signal, i) => (
                  <div 
                    key={i} 
                    className="min-w-[140px] max-w-[140px] p-4 bg-card border border-white/5 rounded-2xl flex flex-col justify-between animate-in"
                    style={{ transitionDelay: `${i * 80}ms` }}
                  >
                    <div>
                      <span className="text-3xl mb-3 block">{signal.icon_name}</span>
                      <h5 className="font-bold text-xs leading-tight mb-2 uppercase">{signal.title}</h5>
                      <p className="text-[10px] opacity-60 leading-relaxed line-clamp-3">{signal.detail}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-3">
                      {signal.sentiment === 'bullish' ? <TrendingUp size={10} className="text-primary" /> : signal.sentiment === 'bearish' ? <TrendingDown size={10} className="text-destructive" /> : <Minus size={10} className="text-muted-foreground" />}
                      <span className={`text-[8px] font-black uppercase tracking-widest ${signal.sentiment === 'bullish' ? 'text-primary' : signal.sentiment === 'bearish' ? 'text-destructive' : 'text-muted-foreground'}`}>
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
              <div className="bg-card border border-white/5 rounded-[2.5rem] p-8 md:p-12 space-y-12 animate-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-headline font-black">Step 1: Quantity</h3>
                  <Badge variant="outline" className="font-code text-primary">Live Rate: ₹52/kg</Badge>
                </div>
                
                <div className="space-y-8">
                  <div className="flex justify-between items-end">
                    <span className="text-6xl font-headline font-black text-primary">{quantity[0]}kg</span>
                    <span className="text-xs opacity-40 font-bold uppercase tracking-widest mb-2">Adjust Selection</span>
                  </div>
                  <Slider value={quantity} onValueChange={setQuantity} max={10000} min={100} step={100} className="py-4" />
                </div>

                <div className="p-8 bg-primary/5 rounded-3xl border border-primary/10 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="text-center md:text-left">
                    <p className="text-xs opacity-40 uppercase font-black tracking-widest mb-1">Estimated Value</p>
                    <p className="text-4xl font-headline font-black">₹{(quantity[0] * 52).toLocaleString()}</p>
                  </div>
                  <Button onClick={() => setStep(2)} className="h-14 px-8 rounded-2xl w-full md:w-auto text-md group">
                    Next Step <ChevronRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="bg-card border border-white/5 rounded-[2.5rem] p-8 md:p-12 space-y-12 animate-in text-center">
                <h3 className="text-2xl font-headline font-black">Step 2: Securing Rate</h3>
                
                {/* SVG Padlock Animation */}
                <div className="relative mx-auto w-48 h-48 flex items-center justify-center">
                  <svg width="120" height="150" viewBox="0 0 120 150" className="transition-all duration-1000 ease-in-out">
                    {/* Shackle */}
                    <path 
                      d="M30 60V40C30 23.4 43.4 10 60 10C76.6 10 90 23.4 90 40V60" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="12" 
                      strokeLinecap="round"
                      className={`transition-all duration-700 ease-in-out ${confirmed ? 'translate-y-4' : ''} text-muted/30`}
                    />
                    {/* Body */}
                    <rect 
                      x="10" y="60" width="100" height="80" rx="15" 
                      className={`transition-all duration-1000 fill-muted/10 stroke-primary/20 stroke-2`}
                    />
                    <rect 
                      x="10" y="60" width="100" height="80" rx="15" 
                      className={`transition-all duration-1000 fill-primary/10 ${confirmed ? 'opacity-100' : 'opacity-0'}`}
                    />
                    {/* Keyhole */}
                    <circle cx="60" cy="100" r="10" className="fill-muted/20" />
                    <rect x="56" y="105" width="8" height="15" rx="2" className="fill-muted/20" />
                  </svg>
                  <Sparkles className={`absolute text-primary animate-pulse ${confirmed ? 'scale-150' : 'scale-0'} transition-transform duration-500`} size={80} />
                </div>

                <div className="space-y-4">
                  <p className="text-lg font-bold opacity-60">Ready to lock {quantity[0]}kg at ₹52.00?</p>
                  <div className="flex gap-4 max-w-sm mx-auto">
                    <Button variant="ghost" onClick={() => setStep(1)} className="flex-1 h-12 rounded-xl">Back</Button>
                    <Button onClick={() => setStep(3)} className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground">Lock Rate</Button>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="bg-card border border-white/5 rounded-[2.5rem] p-8 md:p-12 space-y-8 animate-in">
                <h3 className="text-2xl font-headline font-black text-center">Step 3: Blockchain Settlement</h3>
                
                {/* Smart Contract Preview */}
                <div className="bg-[#0A0B14] rounded-3xl border border-white/10 p-8 font-code space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5"><Wallet size={120} /></div>
                  
                  <div className="space-y-2 border-b border-white/5 pb-4">
                    <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Contract Stub</p>
                    <h4 className="text-lg font-bold">SMART_HEDGE_NASIK_04</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[11px]">
                    <div className="space-y-4">
                      <div><p className="opacity-40 mb-1">FID_HOLDER</p><p>0x7F...44A1_RK</p></div>
                      <div><p className="opacity-40 mb-1">STRIKE_PRICE</p><p className="text-primary font-bold">INR 52.00 / KG</p></div>
                    </div>
                    <div className="space-y-4">
                      <div><p className="opacity-40 mb-1">EXPIRY_DATE</p><p>20 SEP 2025</p></div>
                      <div><p className="opacity-40 mb-1">CONDITION</p><p>SAT_PROOF_OR_APMC_RECEIPT</p></div>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        {confirmed ? <ShieldCheck className="text-primary" size={18} /> : <div className="w-4 h-4 border-2 border-primary border-t-transparent animate-spin rounded-full" />}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase">{confirmed ? 'Validation Complete' : 'Validating Oracle'}</p>
                        <p className="text-[9px] opacity-40 font-code">{confirmed ? 'STATUS: VALID_CONTRACT' : 'STATUS: PENDING_SIG'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {!confirmed ? (
                    <Button 
                      onClick={handleConfirm} 
                      disabled={confirming}
                      className="w-full h-16 rounded-2xl text-lg relative overflow-hidden"
                    >
                      {confirming ? (
                        <span className="flex items-center gap-3 font-code text-sm">
                          TX_HASH: {txHash}
                        </span>
                      ) : (
                        "Confirm on Chain"
                      )}
                    </Button>
                  ) : (
                    <div className="space-y-6 animate-in">
                      <div className="p-6 bg-primary/10 border border-primary/30 rounded-3xl text-center">
                        <Sparkles className="text-primary mx-auto mb-2" size={32} />
                        <h4 className="text-xl font-headline font-black text-primary">Transaction Confirmed</h4>
                        <p className="text-xs opacity-60">Contract deployed to Polygon • Block #882194</p>
                      </div>
                      <Button variant="outline" onClick={() => setStep(1)} className="w-full h-14 rounded-2xl">
                        Return to Market
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
