"use client";

import React, { useState, useEffect } from 'react';
import { Landmark, CheckCircle2, TrendingUp, ShieldCheck, UserCheck, Quote, BarChart3 } from 'lucide-react';
import { impactStoryGenerator, type ImpactStoryGeneratorOutput } from '@/ai/flows/impact-story-generator-flow';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';

function Counter({ target, duration = 1500, prefix = "", suffix = "" }: { target: number, duration?: number, prefix?: string, suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
}

export function FinanceScreen() {
  const [checks, setChecks] = useState([false, false, false, false]);
  const [loanAmount, setLoanAmount] = useState([70000]);
  const [impactStory, setImpactStory] = useState<ImpactStoryGeneratorOutput | null>(null);
  const [loadingStory, setLoadingStory] = useState(true);

  useEffect(() => {
    // Staggered eligibility check
    const timers = [
      setTimeout(() => setChecks(c => [true, ...c.slice(1)]), 400),
      setTimeout(() => setChecks(c => [c[0], true, ...c.slice(2)]), 800),
      setTimeout(() => setChecks(c => [c[0], c[1], true, c[3]]), 1200),
      setTimeout(() => setChecks(c => [c[0], c[1], c[2], true]), 1600),
    ];

    const loadStory = async () => {
      try {
        const data = await impactStoryGenerator({ farmerName: 'Ramesh Kumar', crop: 'tomato', location: 'Nasik' });
        setImpactStory(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingStory(false);
      }
    };
    loadStory();

    return () => timers.forEach(clearTimeout);
  }, []);

  const eligibilityItems = [
    { label: 'Crop Health Score', icon: ShieldCheck },
    { label: 'Satellite Verification', icon: Landmark },
    { label: 'Identity Verified', icon: UserCheck },
    { label: 'Risk Score Profile', icon: TrendingUp },
  ];

  const loanComparison = [
    { label: 'KrishiShield AI', rate: 1, color: 'bg-primary' },
    { label: 'Local Moneylender', rate: 36, color: 'bg-muted' },
    { label: 'Traditional Bank', rate: 15, color: 'bg-muted' },
  ];

  return (
    <div className="space-y-16">
      {/* Harvest Loan Section */}
      <section className="animate-in">
        <div className="max-w-4xl mx-auto bg-card border border-white/5 rounded-[2.5rem] p-8 md:p-12 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
            <Landmark size={240} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
            <div className="space-y-8">
              <h3 className="text-3xl font-headline font-black leading-tight">
                Harvest-Backed <br /> Instant Liquidity
              </h3>
              
              <div className="space-y-4">
                {eligibilityItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-background/40 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <item.icon size={18} className="text-primary opacity-60" />
                      <span className="text-xs font-medium opacity-80">{item.label}</span>
                    </div>
                    {checks[i] ? (
                      <CheckCircle2 size={16} className="text-primary animate-in scale-110" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-white/10 border-t-primary animate-spin" />
                    )}
                  </div>
                ))}
              </div>

              {checks.every(c => c) && (
                <div className="animate-in space-y-6">
                  <div className="p-6 bg-primary/5 border border-primary/20 rounded-2xl">
                    <p className="text-xs uppercase font-bold tracking-widest opacity-40 mb-2">Maximum Eligibility</p>
                    <p className="text-4xl font-headline font-black text-primary">₹1,40,000</p>
                    <p className="text-[10px] opacity-40 mt-2 font-medium">Interest rate: 1% per annum Fixed</p>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-2xl font-headline font-bold">₹{loanAmount[0].toLocaleString()}</span>
                      <span className="text-xs opacity-40">Loan Amount Selector</span>
                    </div>
                    <Slider value={loanAmount} onValueChange={setLoanAmount} max={140000} min={10000} step={5000} />
                  </div>
                  <Button className="w-full h-12 text-md">Request Disbursement</Button>
                </div>
              )}
            </div>

            <div className="space-y-8">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] opacity-30 mt-2">Interest Comparison</h4>
              <div className="space-y-8">
                {loanComparison.map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                      <span>{item.label}</span>
                      <span className={item.rate === 1 ? 'text-primary' : ''}>{item.rate}% p.a.</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${item.color} transition-all duration-1000 ease-out delay-500`} 
                        style={{ width: `${(item.rate / 36) * 100}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-12 p-6 bg-[#0F1123] rounded-3xl border border-white/5">
                <p className="text-sm opacity-60 leading-relaxed italic">
                  "Traditional lenders rely on credit scores. We rely on your soil health and satellite proof. That's why we can offer the lowest rates in the industry."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Dashboard */}
      <section className="animate-in space-y-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Income Increase', val: 22, suffix: '%', prefix: '+' },
            { label: 'Risk Reduction', val: 90, suffix: '%', prefix: '' },
            { label: 'Capital Saved', val: 2.4, suffix: 'L', prefix: '₹' },
            { label: 'Farmers Protected', val: 47, suffix: '', prefix: '' },
          ].map((m, i) => (
            <div key={i} className="bg-card border border-white/5 p-6 rounded-3xl text-center group hover:border-primary/30 transition-all">
              <p className="text-[40px] font-headline font-black mb-1 group-hover:scale-110 transition-transform block">
                <Counter target={m.val} prefix={m.prefix} suffix={m.suffix} />
              </p>
              <p className="text-[10px] uppercase font-black tracking-widest opacity-30">{m.label}</p>
            </div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto">
          {loadingStory ? (
            <Skeleton className="h-32 w-full rounded-3xl" />
          ) : (
            <div className="relative p-12 bg-card border border-white/5 rounded-[3rem] text-center">
              <Quote size={48} className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary opacity-20" />
              <p className="text-xl md:text-2xl font-light italic leading-relaxed opacity-90 mb-8">
                "{impactStory?.story}"
              </p>
              <div className="flex flex-col items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full ring-2 ring-primary/20 ring-offset-4 ring-offset-background"
                  style={{ backgroundColor: `hsl(${('Ramesh Kumar'.length * 40) % 360}, 60%, 50%)` }}
                />
                <div>
                  <p className="font-bold text-sm">Ramesh Kumar</p>
                  <p className="text-[10px] uppercase font-black tracking-widest opacity-30">Tomato Farmer • Nasik</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
