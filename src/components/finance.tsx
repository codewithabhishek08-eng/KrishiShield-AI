
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Landmark, CheckCircle2, TrendingUp, ShieldCheck, 
  UserCheck, Quote, ChevronDown, ChevronUp, 
  Leaf, Satellite, Shield, Landmark as BankIcon, 
  Clock, Download, ArrowRight, Wallet, Users,
  TrendingUp as TrendUpIcon, Info, Sparkles, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getLoanAdvice, type LoanAdvisorOutput } from '@/ai/flows/loan-advisor-flow';
import { getEligibilityExplanation, type EligibilityExplanationOutput } from '@/ai/flows/eligibility-explanation-flow';
import { impactStoryGenerator } from '@/ai/flows/impact-story-generator-flow';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getProfile } from '@/lib/user-profile';

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

const SCHEME_DATA: Record<string, any> = {
  'PM-FASAL Bima': {
    name: 'Pradhan Mantri Fasal Bima Yojana',
    eligibility: 'All farmers including sharecroppers and tenant farmers growing notified crops in notified areas.',
    apply: 'Register on PMFBY portal or through designated banks/CSC centres within notified dates.',
    benefits: 'Comprehensive insurance cover against failure of crop due to non-preventable natural risks.'
  },
  'PM-Kisan Samman': {
    name: 'PM-Kisan Samman Nidhi',
    eligibility: 'Landholding farmer families with cultivable landholding in their names.',
    apply: 'Direct registration on PM-Kisan portal using Aadhaar and land record details.',
    benefits: 'Income support of ₹6,000 per year in three equal instalments.'
  },
  'eNAM Digital': {
    name: 'Electronic National Agriculture Market',
    eligibility: 'Any farmer, FPO, or trader registered on the eNAM platform.',
    apply: 'Online registration on enam.gov.in with KYC documents.',
    benefits: 'Direct access to national mandi auctions, transparent price discovery, and digital payments.'
  },
  'KCC Harvest Bridge': {
    name: 'Kisan Credit Card (KCC)',
    eligibility: 'Individual/joint borrowers who are owner cultivators, tenant farmers, or sharecroppers.',
    apply: 'Apply through any commercial, rural, or cooperative bank with field documents.',
    benefits: 'Credit for crop cultivation, post-harvest expenses, and working capital at subsidised rates.'
  }
};

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
  const [selectedScheme, setSelectedScheme] = useState<string | null>(null);
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
      const profile = getProfile();
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
                { label: 'Identity Verified', icon: UserCheck, color: '#FF9800' },
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
                      </button>
                    ))}
                  </div>
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
                  ) : loanAdvice ? (
                    <div className="space-y-4 animate-in">
                      <p className="text-sm font-bold text-primary leading-tight">AI Suggests ₹{loanAdvice.optimal_amount.toLocaleString('en-IN')}</p>
                      <p className="text-[11px] opacity-60 leading-relaxed italic">&quot;{loanAdvice.advice}&quot;</p>
                      <Button 
                        variant="link" 
                        className="text-[10px] p-0 h-auto text-primary font-black uppercase tracking-widest mt-2"
                        onClick={() => {
                          setLoanAmount([loanAdvice.optimal_amount]);
                          toast({ title: "Applied AI Suggestion" });
                        }}
                      >
                        Apply Suggestion →
                      </Button>
                    </div>
                  ) : (
                    <p className="text-[11px] opacity-40">Adjust amount to get AI loan advice.</p>
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
              </Button>
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-12 animate-in duration-300">
          <section className="bg-primary/[0.03] border border-primary/15 rounded-3xl p-10 space-y-6 relative overflow-hidden">
            <span className="text-6xl absolute top-0 left-6 opacity-10 select-none">“</span>
            {loadingStory ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full bg-primary/10" />
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
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 px-2">Schemes you qualify for</h4>
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x">
              {Object.keys(SCHEME_DATA).map((schemeKey, i) => (
                <div 
                  key={i} 
                  className="min-w-[220px] snap-center bg-white/[0.04] border border-white/10 rounded-2xl p-5 space-y-3 group hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => setSelectedScheme(schemeKey)}
                >
                  <h5 className="font-bold text-sm text-white group-hover:text-primary transition-colors">{schemeKey}</h5>
                  <p className="text-[11px] opacity-40 leading-relaxed">{SCHEME_DATA[schemeKey].benefits.slice(0, 60)}...</p>
                  <button className="text-[10px] font-black uppercase tracking-widest text-blue-400 mt-2 block">Check Eligibility →</button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {selectedScheme && (
        <Dialog open={!!selectedScheme} onOpenChange={() => setSelectedScheme(null)}>
          <DialogContent className="bg-[#0F230F] border-white/10 rounded-[2rem] max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline font-black text-white">{SCHEME_DATA[selectedScheme].name}</DialogTitle>
              <DialogDescription className="text-primary/60 font-bold uppercase text-[10px] tracking-widest">Official Government Scheme</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-black tracking-widest opacity-30">Eligibility Criteria</p>
                <p className="text-sm text-white/80 leading-relaxed">{SCHEME_DATA[selectedScheme].eligibility}</p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-black tracking-widest opacity-30">Key Benefits</p>
                <p className="text-sm text-white/80 leading-relaxed">{SCHEME_DATA[selectedScheme].benefits}</p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-black tracking-widest opacity-30">How to Apply</p>
                <p className="text-sm text-white/80 leading-relaxed">{SCHEME_DATA[selectedScheme].apply}</p>
              </div>
              <Button 
                onClick={() => setSelectedScheme(null)}
                className="w-full bg-primary hover:bg-primary/90 rounded-xl uppercase font-black tracking-widest h-12"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
      `}</style>
    </div>
  );
}
