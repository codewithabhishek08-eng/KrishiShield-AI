"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ReferenceLine, ComposedChart 
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, ShieldCheck, Wallet, Sparkles, ChevronRight, Lock, CheckCircle2, Calendar, Info, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { generateMarketSignals, type MarketSignalOutput } from '@/ai/flows/market-signal-generator-flow';
import { getMarketInsight } from '@/ai/flows/market-insight-flow';
import { getHedgeAdvice, type HedgeAdvisorOutput } from '@/ai/flows/hedge-advisor-flow';

// --- MOCK DATA GENERATION ---
const generateMockData = (days: number) => {
  const data = [];
  let basePrice = 22;
  for (let i = -180; i <= 180; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const month = date.toLocaleString('default', { month: 'short' });
    
    // Seasonal patterns
    const seasonality = Math.sin((i / 360) * Math.PI * 2) * 4;
    const volatility = (Math.random() - 0.5) * 2;
    const price = Math.max(16, Math.min(80, basePrice + seasonality + (i > 0 ? i * 0.1 : 0) + volatility));
    
    const type = i <= 0 ? 'historical' : 'predicted';
    const variance = i > 0 ? (i / 180) * 8 + 1.5 : 0;

    data.push({
      date: i % 30 === 0 ? month : '',
      displayDate: date.toLocaleDateString(),
      price: parseFloat(price.toFixed(2)),
      type,
      upper: type === 'predicted' ? price + variance : null,
      lower: type === 'predicted' ? price - variance : null,
      dayIndex: i
    });
  }
  return data;
};

const CHART_DATA = generateMockData(180);

export function MarketScreen() {
  const [activeTab, setActiveTab] = useState<'forecast' | 'lock'>('forecast');
  const [signals, setSignals] = useState<MarketSignalOutput>([]);
  const [loadingSignals, setLoadingSignals] = useState(true);
  const [insight, setInsight] = useState('');
  const [step, setStep] = useState(1);
  const [quantity, setQuantity] = useState([2000]);
  const [hedgeAdvice, setHedgeAdvice] = useState<HedgeAdvisorOutput | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [padlockStage, setPadlockStage] = useState<'open' | 'closing' | 'locked'>('open');
  const [confirmingChain, setConfirmingChain] = useState(false);
  const [confirmedChain, setConfirmedChain] = useState(false);
  const [txHash, setTxHash] = useState('');
  const { toast } = useToast();

  const currentRate = 24.80;

  useEffect(() => {
    async function initMarket() {
      try {
        const [signalsData, insightData] = await Promise.all([
          generateMarketSignals(),
          getMarketInsight()
        ]);
        setSignals(signalsData);
        setInsight(insightData.insight);
      } catch (err) {
        console.error("Market init error:", err);
      } finally {
        setLoadingSignals(false);
      }
    }
    initMarket();
  }, []);

  // AI Hedge Advisor logic
  useEffect(() => {
    if (activeTab === 'lock' && step === 1) {
      const timer = setTimeout(async () => {
        setLoadingAdvice(true);
        try {
          const advice = await getHedgeAdvice({ qty: quantity[0], price: currentRate });
          setHedgeAdvice(advice);
        } catch (err) {
          console.error("Advice error:", err);
        } finally {
          setLoadingAdvice(false);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [quantity, activeTab, step]);

  const handleLockPrice = () => {
    setPadlockStage('closing');
    setTimeout(() => {
      setPadlockStage('locked');
      setTimeout(() => setStep(3), 1000);
    }, 800);
  };

  const handleConfirmChain = () => {
    setConfirmingChain(true);
    let counter = 0;
    const interval = setInterval(() => {
      setTxHash(Math.random().toString(16).substring(2, 34).toUpperCase());
      counter++;
      if (counter > 30) {
        clearInterval(interval);
        setConfirmingChain(false);
        setConfirmedChain(true);
        toast({
          title: "Hedge active",
          description: `₹${(quantity[0] * currentRate).toLocaleString()} guaranteed revenue secured.`,
          className: "bg-[#1B5E20] border-[#4CAF50]/30 text-white font-body"
        });
      }
    }, 60);
  };

  return (
    <div className="space-y-8 animate-in pb-20">
      {/* Header Strip */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-headline font-black text-white">Tomato Market</h2>
          <p className="text-[13px] opacity-40 font-body">Nasik · APMC Mandi</p>
        </div>
        
        <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 gap-1 self-start">
          <button 
            onClick={() => setActiveTab('forecast')}
            className={cn(
              "px-6 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-widest",
              activeTab === 'forecast' 
                ? "bg-primary/15 border border-primary/40 text-primary" 
                : "text-white/40 hover:text-white"
            )}
          >
            Forecast
          </button>
          <button 
            onClick={() => { setActiveTab('lock'); setStep(1); }}
            className={cn(
              "px-6 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-widest",
              activeTab === 'lock' 
                ? "bg-primary/15 border border-primary/40 text-primary" 
                : "text-white/40 hover:text-white"
            )}
          >
            Lock Price
          </button>
        </div>
      </div>

      {/* Ticker Strip */}
      <div className="relative overflow-hidden border-y border-white/5 py-2.5 bg-white/[0.02]">
        <div className="flex animate-ticker whitespace-nowrap">
          {[1, 2].map((group) => (
            <div key={group} className="flex gap-8 px-4 items-center">
              {[
                { name: 'Tomato', price: 24.80, trend: 'up' },
                { name: 'Onion', price: 18.40, trend: 'down' },
                { name: 'Grape', price: 62.10, trend: 'up' },
                { name: 'Potato', price: 14.20, trend: 'neutral' },
                { name: 'Capsicum', price: 38.90, trend: 'up' },
                { name: 'Brinjal', price: 22.30, trend: 'down' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[13px] font-body text-white/55">{item.name}</span>
                  <span className="text-[13px] font-bold text-white">₹{item.price.toFixed(2)}</span>
                  {item.trend === 'up' && <ArrowUpRight size={14} className="text-[#4CAF50]" />}
                  {item.trend === 'down' && <ArrowDownRight size={14} className="text-[#F44336]" />}
                  {item.trend === 'neutral' && <Minus size={14} className="text-white/20" />}
                </div>
              ))}
            </div>
          ))}
        </div>
        {insight && (
          <p className="text-[11px] italic font-light text-white/40 mt-1.5 px-2 text-center">
            {insight}
          </p>
        )}
      </div>

      {activeTab === 'forecast' ? (
        <div className="space-y-12 animate-in duration-300">
          {/* Hero Stat Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Today's Price", val: `₹${currentRate.toFixed(2)}`, sub: "+₹1.20 vs yesterday", color: "#4CAF50", subColor: "#81C784", icon: ArrowUpRight },
              { label: "6-Month Target", val: "₹31.40", sub: "AI forecast · 94% confidence", color: "#64B5F6", subColor: "rgba(255,255,255,0.45)", icon: Info },
              { label: "Best Lock Date", val: "Jun 22", sub: "Lock before monsoon dip", color: "white", subColor: "rgba(255,255,255,0.45)", icon: Calendar },
            ].map((stat, i) => (
              <div 
                key={i} 
                className="bg-white/5 border border-white/10 rounded-2xl p-6 transition-transform hover:-translate-y-1"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <p className="text-[10px] uppercase font-black tracking-[0.2em] opacity-30 mb-4">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-headline font-black" style={{ color: stat.color }}>{stat.val}</span>
                  {i === 0 && <span className="text-[10px] font-bold text-white/40">/kg</span>}
                </div>
                <p className="text-[11px] mt-2 flex items-center gap-1.5" style={{ color: stat.subColor }}>
                  {i === 0 && <stat.icon size={12} />}
                  {stat.sub}
                </p>
              </div>
            ))}
          </div>

          {/* Forecast Chart */}
          <div className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-6 md:p-10 relative overflow-hidden shadow-2xl">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-xl font-headline font-bold text-white">Price Trajectory Analysis</h3>
                <p className="text-[11px] opacity-30 uppercase font-black tracking-widest mt-1">Multi-modal AI Forecasting</p>
              </div>
              <div className="bg-[#1976D2]/10 border border-[#1976D2]/25 px-3 py-1.5 rounded-full flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#4CAF50] rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-[#90CAF9] uppercase tracking-wider">Groq AI · 94% confidence</span>
              </div>
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={CHART_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    interval={30}
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)', fontWeight: 600 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)', fontWeight: 600 }} 
                    domain={[10, 50]}
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0C1C0C', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
                    itemStyle={{ fontSize: '12px', color: 'white' }}
                    labelStyle={{ display: 'none' }}
                  />
                  
                  {/* Confidence Band */}
                  <Area 
                    type="monotone" 
                    dataKey="upper" 
                    stroke="none" 
                    fill="#1976D2" 
                    fillOpacity={0.08} 
                    connectNulls
                  />
                  <Area 
                    type="monotone" 
                    dataKey="lower" 
                    stroke="none" 
                    fill="#1976D2" 
                    fillOpacity={0.08} 
                    connectNulls
                  />

                  {/* Historical */}
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    data={CHART_DATA.filter(d => d.type === 'historical')}
                    stroke="#4CAF50" 
                    strokeWidth={3} 
                    fill="none" 
                  />
                  
                  {/* Predicted */}
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    data={CHART_DATA.filter(d => d.type === 'predicted' || d.dayIndex === 0)}
                    stroke="#1976D2" 
                    strokeWidth={3} 
                    strokeDasharray="6 4"
                    fill="none" 
                  />

                  <ReferenceLine x="" stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" label={{ position: 'top', value: 'Today', fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Signal Cards */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 px-2">Groq Intelligence Signals</h4>
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar px-2 snap-x">
              {loadingSignals ? (
                [1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="min-w-[200px] bg-white/5 rounded-2xl p-5 border border-white/5 space-y-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))
              ) : (
                signals.map((signal, i) => (
                  <div 
                    key={i} 
                    className="min-w-[200px] snap-center bg-white/[0.04] border border-white/10 rounded-2xl p-5 space-y-4 hover:border-white/20 transition-all group"
                  >
                    <span className="text-3xl block transition-transform group-hover:scale-110">{signal.emoji}</span>
                    <h5 className="font-bold text-sm text-white leading-tight uppercase tracking-tight">{signal.title}</h5>
                    <p className="text-[12px] opacity-50 leading-relaxed line-clamp-3">{signal.detail}</p>
                    <div className="flex justify-between items-center pt-2">
                      <Badge variant="outline" className={cn(
                        "text-[9px] uppercase font-black tracking-widest px-2 py-0.5 border-none",
                        signal.sentiment === 'bullish' ? "bg-[#4CAF50]/10 text-[#4CAF50]" :
                        signal.sentiment === 'bearish' ? "bg-[#F44336]/10 text-[#F44336]" :
                        "bg-white/10 text-white/40"
                      )}>
                        {signal.sentiment}
                      </Badge>
                      <span className={cn(
                        "text-[12px] font-bold",
                        signal.pct_impact > 0 ? "text-[#4CAF50]" : "text-[#F44336]"
                      )}>
                        {signal.pct_impact > 0 ? '+' : ''}{signal.pct_impact}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-8 animate-in duration-300">
          {/* STEP 1: QUANTITY */}
          <div className={cn(
            "relative pl-10 transition-all duration-500",
            step > 1 ? "opacity-60" : "opacity-100"
          )}>
            <div className="absolute left-0 top-0 w-[1px] h-full bg-white/10" />
            <div className="absolute left-[-4px] top-0 w-2 h-2 rounded-full bg-primary ring-4 ring-primary/20" />
            
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 space-y-10">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-headline font-bold text-white flex items-center gap-3">
                  <span className="text-xs font-mono opacity-20">01</span>
                  Define Volume
                </h3>
                <Badge variant="outline" className="text-[10px] font-mono border-white/10 bg-white/5">HEDGE_PROTOCOL_V4</Badge>
              </div>

              <div className="space-y-6">
                <Slider 
                  value={quantity} 
                  onValueChange={setQuantity} 
                  max={10000} min={100} step={100} 
                  className="py-4"
                  disabled={step > 1}
                />
                <div className="flex justify-between items-center border-t border-white/5 pt-6">
                  <div className="text-center md:text-left">
                    <p className="text-[10px] uppercase font-black tracking-widest opacity-30">Quantity</p>
                    <p className="text-3xl font-headline font-black text-white">{quantity[0].toLocaleString()} <span className="text-sm opacity-40">kg</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-black tracking-widest opacity-30">Hedge Value</p>
                    <p className="text-3xl font-headline font-black text-primary">₹{(quantity[0] * currentRate).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {loadingAdvice ? (
                <Skeleton className="h-16 w-full rounded-xl" />
              ) : hedgeAdvice && (
                <div className="bg-primary/5 border border-primary/20 p-5 rounded-xl flex items-start gap-4 animate-in">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <Sparkles size={18} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-primary">AI suggests locking {hedgeAdvice.recommended_pct}%</p>
                    <p className="text-[11px] text-white/50 mt-1">{hedgeAdvice.reason}</p>
                    <Button 
                      variant="link" 
                      className="text-[10px] p-0 h-auto text-primary/70 uppercase font-black mt-2"
                      onClick={() => setQuantity([Math.round(10000 * (hedgeAdvice.recommended_pct / 100))])}
                    >
                      Apply Suggestion
                    </Button>
                  </div>
                </div>
              )}

              {step === 1 && (
                <Button onClick={() => setStep(2)} className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-lg group">
                  Continue <ChevronRight className="ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              )}
            </div>
          </div>

          {/* STEP 2: LOCK MECHANISM */}
          <div className={cn(
            "relative pl-10 transition-all duration-500",
            step < 2 ? "opacity-20 pointer-events-none" : step > 2 ? "opacity-60" : "opacity-100"
          )}>
            <div className="absolute left-0 top-0 w-[1px] h-full bg-white/10" />
            <div className={cn(
              "absolute left-[-4px] top-0 w-2 h-2 rounded-full transition-all duration-500",
              step >= 2 ? "bg-primary ring-4 ring-primary/20" : "bg-white/10"
            )} />

            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 space-y-8 text-center">
              <h3 className="text-lg font-headline font-bold text-white flex items-center justify-center gap-3">
                <span className="text-xs font-mono opacity-20">02</span>
                Secure Rate
              </h3>

              <div className="relative mx-auto w-40 h-40 flex items-center justify-center">
                <svg viewBox="0 0 160 160" className="w-full h-full">
                  {/* Lock Body */}
                  <rect 
                    x="30" y="70" width="100" height="80" rx="20" 
                    className={cn(
                      "transition-all duration-700 stroke-2",
                      padlockStage === 'locked' ? "fill-primary/20 stroke-primary" : "fill-white/5 stroke-white/20"
                    )}
                  />
                  {/* Shackle */}
                  <path 
                    d="M50 70V45C50 28.4 63.4 15 80 15C96.6 15 110 28.4 110 45V70" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="12" 
                    strokeLinecap="round"
                    className={cn(
                      "transition-all duration-700 ease-in-out origin-[80px_70px]",
                      padlockStage === 'open' ? "rotate-45 text-white/20" : 
                      padlockStage === 'closing' ? "rotate-10 text-primary/50" : 
                      "rotate-0 text-primary translate-y-3"
                    )}
                  />
                  {/* Checkmark */}
                  {padlockStage === 'locked' && (
                    <path 
                      d="M60 110L75 125L105 95" 
                      fill="none" 
                      stroke="#4CAF50" 
                      strokeWidth="8" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className="animate-draw-check"
                    />
                  )}
                </svg>
              </div>

              <div className="space-y-6">
                <p className="text-xl font-medium text-white/80">
                  Locking <span className="text-primary font-black">₹{currentRate}/kg</span> for your crop.
                </p>
                {step === 2 && (
                  <Button 
                    onClick={handleLockPrice} 
                    disabled={padlockStage !== 'open'}
                    className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-2xl"
                  >
                    {padlockStage === 'open' ? 'Confirm Price Lock' : 'Locking...'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* STEP 3: SMART CONTRACT */}
          <div className={cn(
            "relative pl-10 transition-all duration-500",
            step < 3 ? "opacity-20 pointer-events-none" : "opacity-100"
          )}>
            <div className="absolute left-0 top-0 w-[1px] h-full bg-white/10" />
            <div className={cn(
              "absolute left-[-4px] top-0 w-2 h-2 rounded-full transition-all duration-500",
              step >= 3 ? "bg-primary ring-4 ring-primary/20" : "bg-white/10"
            )} />

            <div className="bg-[#060E06] border border-primary/20 rounded-2xl p-8 space-y-8 font-mono shadow-inner">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#F44336]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FFEB3B]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#4CAF50]" />
                </div>
                <span className="text-[10px] opacity-30 uppercase tracking-widest">Smart Contract Preview</span>
              </div>

              <div className="space-y-1.5 text-[12px] md:text-[13px] leading-relaxed">
                <p className="text-[#81C784]">contract HedgeAgreement {"{"}</p>
                <p className="pl-4 text-white/55">farmer: 0x7f...3a2c</p>
                <p className="pl-4 text-white/55">crop: &apos;Tomato · Nasik&apos;</p>
                <p className="pl-4 text-white/55">quantity: {quantity[0].toLocaleString()} kg</p>
                <p className="pl-4 text-[#64B5F6]">lockPrice: ₹{currentRate.toFixed(2)} / kg</p>
                <p className="pl-4 text-[#4CAF50]">guaranteedRevenue: ₹{(quantity[0] * currentRate).toLocaleString()}</p>
                <p className="pl-4 text-white/55">expiry: 22 Dec 2026</p>
                <p className="pl-4 text-white/55">settlement: AUTO_ON_HARVEST</p>
                <p className="text-[#81C784]">{"}"} |</p>
              </div>

              <div className="space-y-4">
                <Button 
                  onClick={handleConfirmChain} 
                  disabled={confirmingChain || confirmedChain}
                  className={cn(
                    "w-full h-16 rounded-xl text-lg font-black tracking-tighter transition-all",
                    confirmedChain ? "bg-primary/20 text-primary border border-primary/30" : "bg-[#1565C0] hover:bg-[#1976D2]"
                  )}
                >
                  {confirmingChain ? 'Broadcasting...' : confirmedChain ? 'Confirmed · Block #19284711' : 'Confirm on Chain'}
                </Button>
                
                {(confirmingChain || confirmedChain) && (
                  <div className="text-[10px] text-white/20 break-all font-mono animate-in">
                    TX_HASH: {txHash || 'PENDING...'}
                    {confirmedChain && <div className="mt-2 text-primary font-bold">BLOCK_TIME: 2.4s · FINALITY: SECURED</div>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 25s linear infinite;
        }
        @keyframes draw-check {
          from { stroke-dashoffset: 100; }
          to { stroke-dashoffset: 0; }
        }
        .animate-draw-check {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: draw-check 0.4s ease-out forwards 0.2s;
        }
      `}</style>
    </div>
  );
}
