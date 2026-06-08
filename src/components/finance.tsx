"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Landmark, CheckCircle2, TrendingUp, ShieldCheck, 
  UserCheck, Quote, ChevronDown, ChevronUp, 
  Leaf, Satellite, Shield, Landmark as BankIcon, 
  Clock, Download, ArrowRight, Wallet, Users,
  TrendingUp as TrendUpIcon, Info, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getLoanAdvice, type LoanAdvisorOutput } from '@/ai/flows/loan-advisor-flow';
import { getEligibilityExplanation, type EligibilityExplanationOutput } from '@/ai/flows/eligibility-explanation-flow';
import { impactStoryGenerator } from '@/ai/flows/impact-story-generator-flow';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function Counter({ target, prefix = "", suffix = "" }: { target: number, prefix?: string, suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 800;
    const animate = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOutCubic * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target]);
  return <span>{prefix}{count.toLocaleString('en-IN')}{suffix}</span>;
}

function Sparkline({ color, points }: { color: string, points: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const stepX = canvas.width / (points.length - 1);
    const maxY = Math.max(...points);
    const minY = Math.min(...points);
    const rangeY = maxY - minY || 1;
    
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = i * stepX;
      const y = canvas.height - ((p - minY) / rangeY) * canvas.height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [color, points]);
  return <canvas ref={canvasRef} width={60} height={24} className="opacity-50" />;
}

export function FinanceScreen() {
  const [activeTab, setActiveTab] = useState<'loan' | 'impact'>('loan');
  const [checks, setChecks] = useState([false, false, false, false]);
  const [checksVisible, setChecksVisible] = useState([false, false, false, false]);
  const [loanAmount, setLoanAmount] = useState([80000]);
  const [loanDuration, setLoanDuration] = useState(12);
  const [explanation, setExplanation] = useState<EligibilityExplanationOutput | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [isExpOpen, setIsExpOpen] = useState(false);
  const [loanAdvice, setLoanAdvice] = useState<LoanAdvisorOutput | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [impactStory, setImpactStory] = useState('');
  const [loadingStory, setLoadingStory] = useState(true);
  const { toast } = useToast();

  const healthScore = 78;
  const riskScore = 28;
  const maxEligibility = 140000;

  useEffect(() => {
    if (activeTab === 'loan') {
      const timers = [
        setTimeout(() => setChecksVisible(c => [true, ...c.slice(1)]), 0),
        setTimeout(() => setChecks(c => [true, ...c.slice(1)]), 600),
        setTimeout(() => setChecksVisible(c => [c[0], true, ...c.slice(2)]), 400),
        setTimeout(() => setChecks(c => [c[0], true, ...c.slice(2)]), 1000),
        setTimeout(() => setChecksVisible(c => [c[0], c[1], true, c[3]]), 800),
        setTimeout(() => setChecks(c => [c[0], c[1], true, c[3]]), 1400),
        setTimeout(() => setChecksVisible(c => [c[0], c[1], c[2], true]), 1200),
        setTimeout(() => setChecks(c => [c[0], c[1], c[2], true]), 1800),
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'impact') {
      const fetchImpact = async () => {
        try {
          const res = await impactStoryGenerator({
            farmerName: 'Ramesh Kumar',
            crop: 'tomato',
            location: 'Nasik'
          });
          setImpactStory(res.story);
        } catch (err) {
          setImpactStory("KrishiShield allowed me to expand my farm and secure my family's future before the prices crashed. The 1% loan was a lifesaver.");
        } finally {
          setLoadingStory(false);
        }
      };
      fetchImpact();
    }
  }, [activeTab]);

  const fetchAdvice = async (val: number) => {
    setLoadingAdvice(true);
    try {
      const advice = await getLoanAdvice({ amount: val, healthScore });
      setLoanAdvice(advice);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAdvice(false);
    }
  };

  const handleSliderChange = (val: number[]) => {
    setLoanAmount(val);
  };

  const handleSliderCommit = (val: number[]) => {
    fetchAdvice(val[0]);
  };

  const handleApplyNow = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      toast({
        title: "Application Received",
        description: "Your harvest-backed credit is being processed.",
        className: "bg-[#1B5E20] border-primary/20 text-white"
      });
    }, 2000);
  };

  const monthlyEMI = Math.round((loanAmount[0] * 0.01 / 12) / (1 - Math.pow(1 + 0.01 / 12, -loanDuration)));
  const totalInterest = Math.round(monthlyEMI * loanDuration - loanAmount[0]);
  const totalRepayment = loanAmount[0] + totalInterest;

  const compareData = [
    { name: 'KrishiShield AI', rate: 1, color: '#4CAF50' },
    { name: 'Traditional Bank', rate: 15, color: 'rgba(255,255,255,0.2)' },
    { name: 'Local Lender', rate: 36, color: 'rgba(239,83,80,0.5)' },
  ];

  return (
    <div className="space-y-8 animate-in pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-headline font-black text-white">Finance Centre</h2>
          <p className="text-[13px] opacity-40 font-body">Harvest-backed credit · AI risk assessment</p>
        </div>
        
        <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 gap-1 self-start">
          {['loan', 'impact'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                "px-6 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-widest",
                activeTab === tab 
                  ? "bg-primary/15 border border-primary/40 text-primary" 
                  : "text-white/40 hover:text-white"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] uppercase font-black tracking-widest opacity-40">AI Credit Score</span>
          <div className="text-right">
            <span className="text-[13px] font-bold text-primary">742 / 1000</span>
            <p className="text-[10px] font-bold text-primary/60">Low Risk · Tier 1 Eligible</p>
          </div>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-[1400ms] ease-out"
            style={{ width: activeTab === 'loan' ? '74.2%' : '0%' }}
          />
        </div>
      </div>

      {activeTab === 'loan' ? (
        <div className="space-y-12 animate-in duration-300">
          <section className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 space-y-8">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-headline font-bold text-white">Eligibility Verification</h3>
              {!checks.every(c => c) ? (
                <div className="w-5 h-5 border-2 border-white/10 border-t-primary rounded-full animate-spin" />
              ) : (
                <Badge className="bg-primary/15 text-primary border-primary/30 uppercase tracking-widest text-[9px] font-black px-2.5 py-1">All checks passed</Badge>
              )}
            </div>

            <div className="space-y-4">
              {[
                { label: `Crop health verified · Score ${healthScore}/100`, icon: Leaf, color: '#1B5E20' },
                { label: 'Field scan confirmed · 1.2 hectares', icon: Satellite, color: '#1976D2' },
                { label: 'Identity Verified · Ramesh Kumar', icon: UserCheck, color: '#FF9800' },
                { label: `Risk score ${riskScore}/100 · Low risk profile`, icon: ShieldCheck, color: '#009688' },
              ].map((item, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border border-white/5 transition-all duration-500",
                    checksVisible[i] ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: item.color + '20' }}>
                      <item.icon size={16} style={{ color: item.color }} />
                    </div>
                    <span className="text-sm font-medium opacity-80">{item.label}</span>
                  </div>
                  {checks[i] ? (
                    <CheckCircle2 size={20} className="text-primary animate-draw-check" />
                  ) : (
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-pulse" />
                      <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-pulse delay-150" />
                      <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-pulse delay-300" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className={cn(
              "text-center transition-all duration-500",
              checks.every(c => c) ? "opacity-100 translate-y-0 h-auto" : "opacity-0 translate-y-4 h-0 overflow-hidden"
            )}>
              <div className="py-6 border-t border-white/5 mt-4">
                <p className="text-sm opacity-50">You qualify for up to</p>
                <h4 className="text-5xl font-headline font-black text-primary my-2">₹1,40,000</h4>
                <p className="text-sm opacity-50">at 1% per annum</p>
                <p className="text-[10px] opacity-20 uppercase tracking-[0.2em] mt-4">Disbursed within 4 hours of approval</p>
              </div>

              <Collapsible open={isExpOpen} onOpenChange={setIsExpOpen} className="w-full">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest h-8" onClick={async () => {
                    if (!explanation) {
                      setLoadingExplanation(true);
                      try {
                        const data = await getEligibilityExplanation({ healthScore, riskScore, amount: maxEligibility });
                        setExplanation(data);
                      } catch (e) {} finally {
                        setLoadingExplanation(false);
                      }
                    }
                  }}>
                    Why am I eligible? {isExpOpen ? <ChevronUp size={12} className="ml-2" /> : <ChevronDown size={12} className="ml-2" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 text-left">
                  {loadingExplanation ? <Skeleton className="h-24 w-full bg-white/5 rounded-xl" /> : explanation && (
                    <div className="bg-white/2 border border-white/5 p-5 rounded-xl space-y-4">
                      <p className="text-sm italic opacity-60 leading-relaxed">&quot;{explanation.summary}&quot;</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {explanation.factors.map((f, i) => (
                          <div key={i} className="flex gap-3">
                            <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5", f.impact === 'positive' ? 'bg-primary' : 'bg-white/20')} />
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-tight">{f.label}</p>
                              <p className="text-[11px] opacity-40">{f.note}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>
          </section>

          <section className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 space-y-10">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/50">Interest Comparison</h3>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compareData} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" domain={[0, 40]} hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} />
                  <Bar dataKey="rate" radius={[0, 4, 4, 0]} barSize={24}>
                    {compareData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/5">
              {compareData.map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-[11px] font-bold text-white">{item.name}</span>
                  </div>
                  <p className="text-xs font-medium text-white/40">{item.rate}% p.a.</p>
                  {item.rate > 1 && (
                    <p className="text-[10px] font-bold text-primary">Save ₹{((item.rate - 1) / 100 * loanAmount[0] * (loanDuration / 12)).toLocaleString('en-IN')}/yr</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 space-y-10 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-headline font-bold text-white">Apply for Loan</h3>
              <Badge variant="outline" className="border-white/10 text-[9px] font-mono opacity-30">V3_HARVEST_BRIDGE</Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-8 space-y-10">
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <p className="text-sm font-medium text-white/60">How much do you need?</p>
                    <span className="text-xs opacity-30 uppercase font-black tracking-widest">Max ₹1.4L</span>
                  </div>
                  <Slider 
                    value={loanAmount} 
                    onValueChange={handleSliderChange} 
                    onValueCommit={handleSliderCommit}
                    max={140000} min={10000} step={5000} 
                  />
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-6">
                    <div className="text-center md:text-left">
                      <p className="text-4xl font-headline font-black text-white">₹{loanAmount[0].toLocaleString('en-IN')}</p>
                      <p className="text-[11px] font-bold text-white/30">@ 1% per annum</p>
                    </div>
                    <div className="text-center md:text-right">
                      <p className="text-[10px] uppercase font-black tracking-widest text-primary/60 mb-1">Monthly EMI</p>
                      <p className="text-2xl font-headline font-bold text-primary">₹{monthlyEMI.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  <div className="text-center py-4 border-y border-white/5">
                    <p className="text-[11px] font-code text-white/30 uppercase">
                      Principal ₹{loanAmount[0].toLocaleString('en-IN')} + Interest ₹{totalInterest.toLocaleString('en-IN')} = Total ₹{totalRepayment.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <p className="text-sm font-medium text-white/60">Repayment Duration</p>
                  <div className="flex gap-4">
                    {[3, 6, 12].map((m) => (
                      <button
                        key={m}
                        onClick={() => setLoanDuration(m)}
                        className={cn(
                          "flex-1 h-20 rounded-xl border transition-all flex flex-col items-center justify-center gap-1",
                          loanDuration === m 
                            ? "bg-primary/10 border-primary/40 text-primary shadow-[0_0_20px_rgba(76,175,80,0.1)]" 
                            : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                        )}
                      >
                        <span className="text-sm font-bold">{m} Months</span>
                        {m === 6 && <span className="text-[9px] font-black uppercase opacity-60">Popular</span>}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] opacity-30 italic flex items-center justify-center gap-2">
                    <Clock size={12} /> Harvest-aligned repayment — no EMI until first harvest
                  </p>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-6">
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles size={16} />
                    <span className="text-[11px] font-black uppercase tracking-widest">AI Advisor</span>
                  </div>
                  {loadingAdvice ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-3/4 bg-primary/10" />
                      <Skeleton className="h-10 w-full bg-primary/10" />
                    </div>
                  ) : loanAdvice && (
                    <div className="space-y-4 animate-in">
                      <p className="text-sm font-bold text-primary leading-tight">AI suggests ₹{loanAdvice.optimal_amount.toLocaleString('en-IN')}</p>
                      <p className="text-[11px] opacity-60 leading-relaxed">{loanAdvice.advice}</p>
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-none text-[9px] font-bold px-2 py-0.5">{loanAdvice.repayment_tip}</Badge>
                      <Button 
                        variant="link" 
                        className="text-[10px] p-0 h-auto text-primary font-black uppercase tracking-widest mt-2"
                        onClick={() => setLoanAmount([loanAdvice.optimal_amount])}
                      >
                        Apply Suggestion →
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-8">
              <Button 
                onClick={handleApplyNow}
                disabled={submitting || submitted}
                className={cn(
                  "w-full h-14 rounded-xl text-lg font-bold transition-all relative overflow-hidden",
                  submitted ? "bg-primary/20 text-primary border border-primary/30" : "bg-primary hover:bg-primary/90"
                )}
              >
                {submitting ? "Processing application..." : submitted ? "Application Submitted!" : "Apply Now"}
                {submitting && (
                  <div className="absolute bottom-0 left-0 h-1 bg-white/40 animate-progress-sweep" />
                )}
                {submitted && <CheckCircle2 size={20} className="ml-2" />}
              </Button>

              {submitted && (
                <div className="mt-8 p-6 bg-primary/5 border border-primary/25 rounded-2xl flex flex-col items-center text-center animate-in zoom-in-95">
                  <div className="w-12 h-12 rounded-full border-2 border-primary/30 flex items-center justify-center mb-4">
                    <CheckCircle2 size={24} className="text-primary" />
                  </div>
                  <p className="text-[11px] opacity-40 uppercase tracking-widest mb-1">Reference: KS-2026-881244</p>
                  <p className="text-sm font-bold text-white">Disbursement in ~4 hours</p>
                  <p className="text-[11px] opacity-40 mt-2">
                    Amount: ₹{loanAmount[0].toLocaleString('en-IN')} · Rate: 1% p.a. · Duration: {loanDuration}M
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-12 animate-in duration-300">
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Season income', target: 214000, p: '₹', s: '', delta: '+₹38,200', points: [20, 45, 30, 60, 55, 80, 75, 95], color: '#4CAF50' },
              { label: 'Risk reduced', target: 90, p: '', s: '%', delta: 'from 78%', points: [90, 85, 80, 70, 60, 40, 30, 10], color: '#64B5F6' },
              { label: 'Interest saved', target: 31200, p: '₹', s: '', delta: '1% vs 18.4%', points: [10, 20, 40, 60, 80, 85, 90, 100], color: '#FFB74D' },
              { label: 'Farmers protected', target: 47, p: '', s: '', delta: '+5 this week', points: [10, 12, 18, 25, 32, 38, 42, 47], color: '#CE93D8' },
            ].map((m, i) => (
              <div 
                key={i} 
                className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 space-y-6 relative overflow-hidden group hover:border-white/20 transition-all"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-40">{m.label}</span>
                  <Sparkline color={m.color} points={m.points} />
                </div>
                <div>
                  <h4 className="text-3xl font-headline font-black text-white"><Counter target={m.target} prefix={m.p} suffix={m.s} /></h4>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp size={10} className="text-primary" />
                    <span className="text-[10px] font-bold text-primary">{m.delta}</span>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-headline font-bold text-white">Loan History</h3>
              <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-[11px] h-8 px-4" onClick={() => toast({ title: "Receipts Exported", description: "KrishiShield_Loans.pdf is ready." })}>
                <Download size={14} className="mr-2" /> Download PDF
              </Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="pb-4 text-[10px] font-black uppercase tracking-[0.1em] opacity-30">Date</th>
                    <th className="pb-4 text-[10px] font-black uppercase tracking-[0.1em] opacity-30">Amount</th>
                    <th className="pb-4 text-[10px] font-black uppercase tracking-[0.1em] opacity-30">Rate</th>
                    <th className="pb-4 text-[10px] font-black uppercase tracking-[0.1em] opacity-30">Status</th>
                    <th className="pb-4 text-[10px] font-black uppercase tracking-[0.1em] opacity-30 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {[
                    { date: 'Jan 2026', amount: 60000, rate: '1%', status: 'Repaid' },
                    { date: 'Sep 2025', amount: 45000, rate: '1%', status: 'Repaid' },
                    { date: 'Mar 2025', amount: 80000, rate: '1%', status: 'Active' },
                  ].map((row, i) => (
                    <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 text-sm font-medium opacity-60">{row.date}</td>
                      <td className="py-4 text-sm font-bold text-white">₹{row.amount.toLocaleString('en-IN')}</td>
                      <td className="py-4 text-sm opacity-60">{row.rate}</td>
                      <td className="py-4">
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-black uppercase tracking-widest border-none px-2 py-0.5",
                          row.status === 'Repaid' ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-500"
                        )}>
                          {row.status === 'Active' && <div className="w-1 h-1 bg-amber-500 rounded-full animate-pulse mr-1.5" />}
                          {row.status}
                        </Badge>
                      </td>
                      <td className="py-4 text-right">
                        <button className="text-[11px] font-bold text-blue-400 hover:underline">
                          {row.status === 'Repaid' ? 'Receipt' : 'Details'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-primary/[0.03] border border-primary/15 rounded-3xl p-10 space-y-6 relative overflow-hidden">
            <span className="text-6xl absolute top-0 left-6 opacity-10 select-none">“</span>
            {loadingStory ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full bg-primary/10" />
                <Skeleton className="h-4 w-5/6 bg-primary/10" />
                <Skeleton className="h-4 w-2/3 bg-primary/10" />
              </div>
            ) : (
              <div className="space-y-6 relative z-10">
                <p className="text-lg md:text-xl font-light italic leading-relaxed text-white/80 max-w-2xl">
                  &quot;{impactStory}&quot;
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/40 flex items-center justify-center font-bold text-white shadow-xl">
                    RK
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">— Ramesh Kumar</p>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Tomato Farmer · Nasik</p>
                  </div>
                </div>
              </div>
            )}
            <p className="text-[9px] italic opacity-20 text-right">AI-generated · Groq · Refreshes daily</p>
          </section>

          <section className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 px-2">Schemes you qualify for</h4>
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x">
              {[
                { name: 'PM-FASAL Bima', detail: 'Crop insurance premium subsidy' },
                { name: 'PM-Kisan Samman', detail: '₹6,000 direct income support' },
                { name: 'eNAM Digital', detail: 'Direct online mandi auction access' },
                { name: 'KCC Harvest Bridge', label: 'Kisan Credit Card at 4% base' },
              ].map((scheme, i) => (
                <div 
                  key={i} 
                  className="min-w-[220px] snap-center bg-white/[0.04] border border-white/10 rounded-2xl p-5 space-y-3 group hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => toast({ title: "Portal Redirect", description: "Connecting to PM-Kisan portal..." })}
                >
                  <h5 className="font-bold text-sm text-white group-hover:text-primary transition-colors">{scheme.name}</h5>
                  <p className="text-[11px] opacity-40 leading-relaxed">{scheme.detail}</p>
                  <button className="text-[10px] font-black uppercase tracking-widest text-blue-400 mt-2 block">Check Eligibility →</button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <style jsx global>{`
        @keyframes draw-check {
          from { stroke-dashoffset: 20; }
          to { stroke-dashoffset: 0; }
        }
        .animate-draw-check {
          stroke-dasharray: 20;
          stroke-dashoffset: 20;
          animation: draw-check 0.4s ease-out forwards;
        }
        @keyframes progress-sweep {
          0% { width: 0; left: 0; }
          100% { width: 100%; left: 0; }
        }
        .animate-progress-sweep {
          animation: progress-sweep 2s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}
