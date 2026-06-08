
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus, ShieldCheck, Wallet, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface MarketSignal {
  emoji: string;
  title: string;
  detail: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}

interface PriceLockSuggestion {
  recommendation: string;
  suggested_lock_pct: number;
  reason: string;
  risk_if_skip: string;
}

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
  const [signals, setSignals] = useState<MarketSignal[]>([]);
  const [loadingSignals, setLoadingSignals] = useState(true);
  const [quantity, setQuantity] = useState([500]);
  const [step, setStep] = useState(1);
  const [locking, setLocking] = useState(false);
  const [locked, setLocked] = useState(false);
  const [suggestion, setSuggestion] = useState<PriceLockSuggestion | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  useEffect(() => {
    const loadSignals = async () => {
      try {
        const res = await fetch('/api/groq', {
          method: 'POST',
          body: JSON.stringify({
            system: "You are an agricultural commodity analyst specializing in Maharashtra India vegetable markets. Respond ONLY in valid JSON.",
            user: "Generate 5 market signals for tomato prices in Nasik Maharashtra for the next 6 months. Base it on: monsoon season patterns, local mandi auction dynamics, cold storage capacity constraints, competing crops (onion, grape), and fuel/transport cost trends. Make each signal feel like it came from a real analyst who visits mandis.",
            opts: {
              json: true,
              cacheKey: 'market-signals-nasik',
              cacheTTL: 1200 // 20 minutes
            }
          })
        });
        const data = await res.json();
        setSignals(data.signals || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSignals(false);
      }
    };
    loadSignals();
  }, []);

  const fetchSuggestion = useCallback(async (q: number) => {
    setLoadingSuggestion(true);
    try {
      const res = await fetch('/api/groq', {
        method: 'POST',
        body: JSON.stringify({
          system: "You are a hedging advisor for smallholder farmers in India. Be direct, use simple language, no jargon. Respond in JSON.",
          user: `Farmer has ${q}kg of tomatoes. Current market price: ₹52/kg. 6-month forecast trend: volatile. Should they lock price now and how much?`,
          opts: {
            json: true,
            temperature: 0.3,
            cacheKey: `suggestion-${q}`,
            cacheTTL: 90 // 90 seconds
          }
        })
      });
      const data = await res.json();
      setSuggestion(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSuggestion(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (step === 1) fetchSuggestion(quantity[0]);
    }, 600);
    return () => clearTimeout(timeout);
  }, [quantity, step, fetchSuggestion]);

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
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.4 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.4 }} domain={[30, 90]} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ fontSize: '12px' }} />
                  <Area type="monotone" dataKey="historical" stroke="#1B5E20" strokeWidth={3} fillOpacity={1} fill="url(#colorHist)" />
                  <Area type="monotone" dataKey="predicted" stroke="#1976D2" strokeWidth={3} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorPred)" />
                  <Area type="monotone" dataKey="high" stroke="none" fill="#1976D2" fillOpacity={0.05} />
                  <Area type="monotone" dataKey="low" stroke="none" fill="#1976D2" fillOpacity={0.05} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 px-1">Market Signals</h4>
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {loadingSignals ? (
                [1, 2, 3, 4, 5].map(i => <div key={i} className="min-w-[180px] h-[160px] bg-card rounded-2xl animate-pulse" />)
              ) : (
                signals.map((signal, i) => (
                  <div 
                    key={i} 
                    className="min-w-[220px] p-5 bg-card border border-white/5 rounded-2xl flex flex-col justify-between animate-in"
                    style={{ transitionDelay: `${i * 80}ms` }}
                  >
                    <div>
                      <span className="text-3xl mb-3 block">{signal.emoji}</span>
                      <h5 className="font-bold text-sm leading-tight mb-2">{signal.title}</h5>
                      <p className="text-[11px] opacity-60 leading-relaxed line-clamp-2">{signal.detail}</p>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        {signal.sentiment === 'bullish' ? <TrendingUp size={12} className="text-primary" /> : signal.sentiment === 'bearish' ? <TrendingDown size={12} className="text-destructive" /> : <Minus size={12} className="text-muted-foreground" />}
                        <span className={`text-[9px] font-black uppercase tracking-widest ${signal.sentiment === 'bullish' ? 'text-primary' : signal.sentiment === 'bearish' ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {signal.sentiment}
                        </span>
                      </div>
                      <span className="text-[10px] font-code opacity-40">{signal.confidence}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="lock" className="animate-in">
          <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-card border border-white/5 rounded-3xl p-8 h-fit">
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
                    <Slider value={quantity} onValueChange={setQuantity} max={10000} min={100} step={100} className="py-4" />
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
                  <div className="relative mx-auto w-40 h-40 flex items-center justify-center">
                    <Sparkles className="text-primary absolute animate-pulse" size={80} />
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
                    <div className="flex justify-between opacity-40"><span>WALLET_ADDR</span><span>0x71C...3d2e</span></div>
                    <div className="flex justify-between"><span className="opacity-40">STRIKE_PRICE</span><span className="text-primary">INR 52.00</span></div>
                    <div className="flex justify-between"><span className="opacity-40">STATUS</span><span className={locked ? 'text-primary' : 'text-accent'}>{locked ? 'VALID_AND_LOCKED' : 'PENDING_SIG'}</span></div>
                  </div>
                  {locked && (
                    <Button variant="outline" className="w-full flex gap-2" onClick={() => { setStep(1); setLocked(false); }}>
                      <Wallet size={16} /> View in Harvest Wallet
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* AI Suggests Panel */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 px-1">AI Suggests</h4>
              <div className="bg-card border border-white/5 rounded-3xl p-6 relative overflow-hidden">
                {loadingSuggestion ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-4 w-1/2 bg-muted rounded" />
                    <div className="h-8 w-3/4 bg-muted rounded" />
                    <div className="h-16 w-full bg-muted rounded" />
                  </div>
                ) : suggestion ? (
                  <div className="space-y-4 animate-in">
                    <p className="text-lg font-body font-bold text-primary leading-tight">
                      {suggestion.recommendation}
                    </p>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-headline font-black text-primary">{suggestion.suggested_lock_pct}%</span>
                      <span className="text-[10px] uppercase font-bold opacity-40 mb-1">Recommended Hedge</span>
                    </div>
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <p className="text-xs opacity-60"><span className="font-bold opacity-100 mr-1">REASON:</span> {suggestion.reason}</p>
                      <p className="text-xs text-destructive/80"><span className="font-bold opacity-100 mr-1">RISK:</span> {suggestion.risk_if_skip}</p>
                    </div>
                    <Button 
                      variant="secondary" 
                      className="w-full h-10 text-xs font-bold"
                      onClick={() => setQuantity([Math.round((suggestion.suggested_lock_pct / 100) * 10000)])}
                    >
                      Apply Suggested Quantity
                    </Button>
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center opacity-20 italic text-sm">
                    Move slider to see AI hedging advice
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
