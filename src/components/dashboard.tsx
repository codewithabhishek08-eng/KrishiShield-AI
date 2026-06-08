"use client";

import React, { useEffect, useState, useRef } from 'react';
import { 
  Droplets, Thermometer, Bug, Sun, ChevronRight, 
  Clock, AlertCircle, MapPin, Leaf, Upload, 
  Camera, User, MessageSquare, CheckCircle2, 
  History, Share2, Save, Send, RefreshCw, 
  Search, ShieldAlert, Activity, Sparkles, X,
  Info
} from 'lucide-react';
import { getAiIntelligenceFeed, type AiIntelligenceFeedOutput } from '@/ai/flows/ai-intelligence-feed-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getProfile, type UserProfile } from '@/lib/user-profile';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface DiagnosisResult {
  diagnosis: string;
  confidence: number;
  cause: string;
  treatment: string[];
  prevention: string[];
  recovery: string;
  severity: 'low' | 'medium' | 'high';
}

interface ExpertQuery {
  id: string;
  date: string;
  expertName: string;
  query: string;
  status: 'Pending' | 'Answered';
}

export function Dashboard() {
  const [profile, setProfile] = useState<UserProfile>(getProfile());
  const [feed, setFeed] = useState<AiIntelligenceFeedOutput>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [healthScore, setHealthScore] = useState(0);
  const targetScore = 82;

  useEffect(() => {
    const handleUpdate = () => {
      const p = getProfile();
      setProfile(p);
      loadFeed(p);
    };
    window.addEventListener('profileUpdated', handleUpdate);

    async function loadFeed(p: UserProfile) {
      setLoadingFeed(true);
      try {
        const data = await getAiIntelligenceFeed({ 
          city: p.city, 
          state: p.state, 
          crop: (p.crops && p.crops[0]) || 'tomato', 
          name: p.name 
        });
        setFeed(data);
      } catch (err) {
        console.error("Feed error:", err);
      } finally {
        setLoadingFeed(false);
      }
    }

    loadFeed(profile);

    let current = 0;
    const interval = setInterval(() => {
      if (current < targetScore) {
        current += 1;
        setHealthScore(current);
      } else {
        clearInterval(interval);
      }
    }, 20);

    return () => {
      window.removeEventListener('profileUpdated', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const getStatusColor = (score: number) => {
    if (score > 75) return '#4CAF50'; 
    if (score >= 50) return '#FF9800'; 
    return '#F44336'; 
  };

  const isCritical = healthScore < 50;

  const nodes = [
    { icon: Droplets, label: '84%', sub: 'Moisture', pos: 'top' },
    { icon: Thermometer, label: '22%', sub: 'Nitrogen', pos: 'right' },
    { icon: Bug, label: 'Low', sub: 'Pest Risk', pos: 'bottom' },
    { icon: Sun, label: '11h', sub: 'Sunlight', pos: 'left' },
  ];

  return (
    <div className="space-y-[64px] animate-in fade-in duration-700 pb-20">
      {/* Dynamic Header */}
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center gap-3 text-white/40">
          <MapPin size={14} className="text-primary" />
          <span className="text-[11px] font-black uppercase tracking-widest" data-location="city">{profile.city}</span>
          <span className="opacity-20">/</span>
          <span className="text-[11px] font-black uppercase tracking-widest opacity-40" data-location="state">{profile.state}</span>
        </div>
        <Badge variant="outline" className="text-[10px] opacity-40 uppercase tracking-widest border-white/5">{profile.crops[0]} Operations</Badge>
      </div>

      {/* Hero Orb Section */}
      <section className="flex flex-col items-center justify-center py-[48px] relative">
        <div className="relative w-[180px] h-[180px] md:w-[240px] md:h-[240px] flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <defs>
              <linearGradient id="orbGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={getStatusColor(healthScore)} />
                <stop offset="100%" stopColor={getStatusColor(healthScore)} stopOpacity="0.3" />
              </linearGradient>
            </defs>
            <circle cx="50%" cy="50%" r="45%" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="2" />
            <circle
              cx="50%" cy="50%" r="45%"
              fill="none"
              stroke={getStatusColor(healthScore)}
              strokeWidth="10"
              strokeDasharray={`${healthScore * 2.83} 283`}
              strokeLinecap="round"
              className={`transition-all duration-1000 ease-out ${isCritical ? 'animate-orb-pulse' : ''}`}
              style={{ filter: `drop-shadow(0 0 12px ${getStatusColor(healthScore)}66)` }}
            />
          </svg>

          <div className="text-center z-10 flex flex-col items-center">
            <span className="text-6xl md:text-8xl font-headline font-black tracking-tighter transition-colors duration-500" style={{ color: getStatusColor(healthScore) }}>
              {healthScore}
            </span>
            <span className="text-[10px] uppercase font-black tracking-[0.3em] opacity-40 mt-[-8px]">Vigor Index</span>
          </div>

          {nodes.map((node, i) => {
            const positions: Record<string, string> = {
              top: 'top-[-32px] left-1/2 -translate-x-1/2',
              right: 'right-[-32px] top-1/2 -translate-y-1/2',
              bottom: 'bottom-[-32px] left-1/2 -translate-x-1/2',
              left: 'left-[-32px] top-1/2 -translate-y-1/2',
            };
            return (
              <div key={i} className={`absolute flex flex-col items-center gap-1.5 ${positions[node.pos]}`}>
                <div className="w-[32px] h-[32px] rounded-full bg-[#0F230F] border border-white/10 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
                  <node.icon size={14} className="text-primary" />
                </div>
                <div className="text-center whitespace-nowrap">
                  <span className="text-[11px] font-bold block leading-none">{node.label}</span>
                  <span className="text-[8px] uppercase opacity-40 font-black tracking-widest">{node.sub}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Intelligence Feed */}
      <section className="animate-in slide-in-from-bottom-4 duration-1000">
        <div className="flex items-center justify-between mb-8 px-2">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Operational Briefing</h3>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            <span className="text-[9px] font-bold uppercase opacity-20">Live Intelligence Link</span>
          </div>
        </div>
        
        <div className="space-y-6">
          {loadingFeed ? (
            [1, 2, 3].map(i => (
              <div key={i} className="bg-white/2 border border-white/5 rounded-2xl p-6 space-y-4">
                <Skeleton className="h-4 w-16 bg-white/5" />
                <Skeleton className="h-[60px] w-full bg-white/5" />
              </div>
            ))
          ) : (
            feed.map((item, idx) => (
              <div key={idx} className="relative p-8 bg-[#0F230F] border border-white/5 rounded-2xl group hover:border-primary/20 transition-all flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] font-code opacity-40 font-medium tracking-tight">
                    <Clock size={12} /> {item.timestamp} IST
                  </div>
                  <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest border-none ${
                    item.type === 'PRICE' ? 'bg-blue-500/10 text-blue-400' :
                    item.type === 'WEATHER' ? 'bg-orange-500/10 text-orange-400' :
                    'bg-red-500/10 text-red-400'
                  }`}>
                    {item.type}
                  </Badge>
                </div>
                <p className="text-[15px] font-body leading-relaxed text-white/80">{item.body}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Crop Diagnostics Section */}
      <CropDiagnostics profile={profile} />
    </div>
  );
}

function CropDiagnostics({ profile }: { profile: UserProfile }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('describe');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [symptomText, setSymptomText] = useState('');
  const [selectedCrop, setSelectedCrop] = useState(profile.crops[0] || 'tomato');
  const [affectedArea, setAffectedArea] = useState('Few Plants');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  
  const [diagnosisHistory, setDiagnosisHistory] = useState<any[]>([]);
  const [expertQueries, setExpertQueries] = useState<ExpertQuery[]>([]);
  const [expertMessage, setExpertMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const history = localStorage.getItem('diagnosisHistory');
    if (history) setDiagnosisHistory(JSON.parse(history));
    
    const queries = localStorage.getItem('expertQueries');
    if (queries) setExpertQueries(JSON.parse(queries));
  }, []);

  const normalizeResult = (data: any): DiagnosisResult => {
    return {
      diagnosis: data?.diagnosis || 'Unknown Issue',
      confidence: Number(data?.confidence) || 0,
      cause: data?.cause || 'No specific cause identified.',
      treatment: Array.isArray(data?.treatment) ? data.treatment : ['Consult a local expert.'],
      prevention: Array.isArray(data?.prevention) ? data.prevention : ['Monitor field conditions.'],
      recovery: data?.recovery || 'Varies by severity.',
      severity: ['low', 'medium', 'high'].includes(data?.severity) ? data.severity : 'medium',
    };
  };

  const handleDiagnoseText = async () => {
    if (!symptomText.trim()) return;
    setLoading(true);
    setResult(null);

    const month = new Date().toLocaleString('en-IN', { month: 'long' });
    const system = `You are an expert plant pathologist and agronomist. The user is a farmer in ${profile.state}. Respond ONLY in valid JSON.`;
    const user = `A farmer in ${profile.state} growing ${selectedCrop} reports: ${symptomText}. Affected area: ${affectedArea}. Current month: ${month}. 
    Diagnose the most likely disease or pest. 
    Return JSON: { 
      "diagnosis": "Name", 
      "confidence": number(0-100), 
      "cause": "Short explanation", 
      "treatment": ["Step 1", "Step 2"], 
      "prevention": ["Tip 1", "Tip 2"], 
      "recovery": "Timeline", 
      "severity": "low"|"medium"|"high" 
    }`;

    try {
      const res = await fetch('/api/groq', {
        method: 'POST',
        body: JSON.stringify({ system, user, opts: { json: true, temperature: 0.2 } })
      });
      const data = await res.json();
      setResult(normalizeResult(data));
    } catch (err) {
      toast({ title: "Diagnosis failed", description: "Uplink error. Tap to retry.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDiagnoseImage = async (base64: string) => {
    setLoading(true);
    setIsScanning(true);
    setResult(null);

    const system = `You are a precision agriculture vision system. Analyse this crop image and provide a diagnosis. Respond ONLY in valid JSON.`;
    const user = `This is an image of ${profile.crops[0]} from a farm in ${profile.state}. 
    Identify: disease/pest, severity(low/medium/high), affected part, treatment steps, and urgency. 
    Return JSON: { 
      "diagnosis": "Name", 
      "confidence": number(0-100), 
      "cause": "Visual analysis summary", 
      "treatment": ["Product A", "Action B"], 
      "prevention": ["Step 1"], 
      "recovery": "Timeline", 
      "severity": "low"|"medium"|"high" 
    }`;

    try {
      const res = await fetch('/api/groq', {
        method: 'POST',
        body: JSON.stringify({ 
          system, 
          user, 
          opts: { 
            json: true, 
            temperature: 0.15,
            model: 'llama-3.2-11b-vision-preview',
            history: [{ role: 'user', content: `[IMAGE_DATA] ${base64}` }] 
          } 
        })
      });
      const data = await res.json();
      setResult(normalizeResult(data));
    } catch (err) {
      toast({ title: "Image analysis failed", description: "Could not process image telemetry.", variant: "destructive" });
    } finally {
      setLoading(false);
      setIsScanning(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB image allowed.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setImagePreview(base64);
      handleDiagnoseImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleExpertSend = () => {
    if (!expertMessage.trim()) return;
    const newQuery: ExpertQuery = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toLocaleDateString('en-IN'),
      expertName: "Dr. Anjali Mehta",
      query: expertMessage,
      status: 'Pending'
    };
    const updated = [newQuery, ...expertQueries];
    setExpertQueries(updated);
    localStorage.setItem('expertQueries', JSON.stringify(updated));
    setExpertMessage('');
    toast({ title: "Query Sent", description: "An expert will respond within 2 hours." });
  };

  const saveToRecords = () => {
    if (!result) return;
    const record = {
      id: Date.now(),
      date: new Date().toLocaleDateString('en-IN'),
      crop: selectedCrop,
      disease: result.diagnosis,
      severity: result.severity,
      result: result
    };
    const updated = [record, ...diagnosisHistory];
    setDiagnosisHistory(updated);
    localStorage.setItem('diagnosisHistory', JSON.stringify(updated));
    toast({ title: "Saved to Records", description: "Check history strip to revisit." });
  };

  const experts = [
    { name: "Dr. Anjali Mehta", role: "Pest Control Specialist", time: "2h", initials: "AM" },
    { name: "Mr. Rajesh Varma", role: "Soil & Crop Pathologist", time: "1h", initials: "RV" },
    { name: "Dr. Sunil Rao", role: "Organic Farming Expert", time: "3h", initials: "SR" },
  ];

  return (
    <section id="crop-diagnostics" className="animate-in slide-in-from-bottom-8 duration-1000 scroll-mt-24">
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary shadow-[0_0_15px_rgba(76,175,80,0.2)]">
            <Activity size={20} />
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Operational Intelligence</h3>
            <p className="text-lg font-headline font-black text-white">Crop Diagnostics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
          <span className="text-[9px] font-bold uppercase opacity-20">Pathology Link Active</span>
        </div>
      </div>

      <div className="bg-[#0F230F]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 space-y-10 relative overflow-hidden group hover:border-primary/20 transition-all">
        {/* History Strip */}
        {diagnosisHistory.length > 0 && (
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 border-b border-white/5">
            {diagnosisHistory.slice(0, 10).map((h, i) => (
              <button 
                key={i} 
                onClick={() => setResult(h.result)}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/5 rounded-full whitespace-nowrap hover:bg-white/10 transition-all group/chip"
              >
                <div className={cn("w-1.5 h-1.5 rounded-full", 
                  h.severity === 'high' ? 'bg-red-500' : h.severity === 'medium' ? 'bg-orange-500' : 'bg-primary'
                )} />
                <span className="text-[10px] font-bold opacity-60 group-hover/chip:opacity-100">{h.disease} · {h.date}</span>
              </button>
            ))}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-white/5 border border-white/10 p-1.5 rounded-2xl h-14 w-full md:w-auto">
            <TabsTrigger value="describe" className="rounded-xl flex-1 md:px-8 data-[state=active]:bg-primary data-[state=active]:text-white transition-all uppercase text-[10px] font-black tracking-widest">
              Describe Symptoms
            </TabsTrigger>
            <TabsTrigger value="upload" className="rounded-xl flex-1 md:px-8 data-[state=active]:bg-primary data-[state=active]:text-white transition-all uppercase text-[10px] font-black tracking-widest">
              Upload Image
            </TabsTrigger>
            <TabsTrigger value="expert" className="rounded-xl flex-1 md:px-8 data-[state=active]:bg-primary data-[state=active]:text-white transition-all uppercase text-[10px] font-black tracking-widest">
              Ask Expert
            </TabsTrigger>
          </TabsList>

          <TabsContent value="describe" className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase font-black tracking-widest opacity-30">Diagnostic Context</p>
                  <div className="grid grid-cols-2 gap-4">
                    <select 
                      value={selectedCrop}
                      onChange={(e) => setSelectedCrop(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-primary"
                    >
                      {profile.crops.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="other">Other Crop</option>
                    </select>
                    <div className="flex gap-2">
                      {['Few Plants', 'Half Field', 'Entire Field'].map(p => (
                        <button
                          key={p}
                          onClick={() => setAffectedArea(p)}
                          className={cn("flex-1 text-[9px] font-black uppercase tracking-tight rounded-xl border transition-all", 
                            affectedArea === p ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/5 text-white/40"
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] uppercase font-black tracking-widest opacity-30">Clinical Symptoms</p>
                  <Textarea 
                    value={symptomText}
                    onChange={(e) => setSymptomText(e.target.value)}
                    placeholder="Describe what you see — yellow leaves, white spots, wilting, insects..."
                    className="h-32 bg-black/40 border-white/10 rounded-2xl focus-visible:ring-primary/40 resize-none"
                  />
                </div>

                <Button 
                  onClick={handleDiagnoseText}
                  disabled={loading || !symptomText.trim()}
                  className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-[11px] font-black uppercase tracking-[0.2em] shadow-xl relative"
                >
                  {loading ? "Analysing pathology..." : "Diagnose Now"}
                  {loading && <div className="absolute bottom-0 left-0 h-1 bg-white/20 animate-loading-bar" />}
                </Button>
              </div>

              <div className="relative">
                {loading ? (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center bg-white/2 border border-white/5 rounded-3xl space-y-6">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                      <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-white">Generating AI Diagnosis</p>
                      <p className="text-[10px] opacity-40 uppercase tracking-widest">Cross-referencing global crop database</p>
                    </div>
                  </div>
                ) : result ? (
                  <ResultCard result={result} saveToRecords={saveToRecords} onExpertClick={() => {
                    setExpertMessage(`I was diagnosed with ${result.diagnosis} for my ${selectedCrop}. I need a second opinion.`);
                    setActiveTab('expert');
                  }} />
                ) : (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 bg-white/2 border border-white/5 rounded-3xl border-dashed">
                    <ShieldAlert size={48} className="text-white/10 mb-6" />
                    <h4 className="text-lg font-headline font-bold text-white/60">Awaiting Input</h4>
                    <p className="text-[11px] opacity-30 uppercase tracking-[0.2em] mt-2">Describe symptoms to start analysis</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-8">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="group cursor-pointer relative aspect-video bg-black/40 border-2 border-dashed border-primary/20 rounded-3xl flex flex-col items-center justify-center overflow-hidden hover:border-primary transition-all"
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} className="w-full h-full object-cover" alt="Scan preview" />
                      {isScanning && (
                        <div className="absolute inset-0 bg-black/40">
                          <div className="h-1 bg-primary w-full animate-scan-line shadow-[0_0_15px_#4CAF50]" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60">
                        <RefreshCw className="text-white" />
                        <span className="ml-2 text-xs font-bold">Replace Image</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Upload className="text-primary" />
                      </div>
                      <h4 className="text-base font-bold text-white/80">Drop leaf image here</h4>
                      <p className="text-[10px] opacity-40 uppercase tracking-widest mt-2">Max 5MB · JPG, PNG, WEBP</p>
                    </>
                  )}
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                </div>

                <div className="flex gap-4">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.setAttribute('capture', 'environment');
                        fileInputRef.current.click();
                      }
                    }}
                    className="flex-1 h-14 rounded-2xl border-white/10 bg-white/5 text-[11px] font-black uppercase tracking-widest hover:bg-white/10"
                  >
                    <Camera className="mr-2" size={16} /> Take Photo
                  </Button>
                </div>

                <div className="p-4 bg-primary/5 rounded-2xl flex items-start gap-4">
                  <Info className="text-primary shrink-0" size={16} />
                  <p className="text-[11px] opacity-60 leading-relaxed italic">Expert Tip: For best results, take a clear photo of the top of the leaf in indirect natural sunlight.</p>
                </div>
              </div>

              <div className="relative">
                {isScanning ? (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center bg-white/2 border border-white/5 rounded-3xl space-y-6">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-white">Scanning Biomass Telemetry</p>
                      <p className="text-[10px] opacity-40 uppercase tracking-widest">Identifying visual pathogen markers</p>
                    </div>
                  </div>
                ) : result ? (
                  <ResultCard result={result} saveToRecords={saveToRecords} onExpertClick={() => setActiveTab('expert')} />
                ) : (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 bg-white/2 border border-white/5 rounded-3xl border-dashed">
                    <Camera size={48} className="text-white/10 mb-6" />
                    <h4 className="text-lg font-headline font-bold text-white/60">Awaiting Visual</h4>
                    <p className="text-[11px] opacity-30 uppercase tracking-[0.2em] mt-2">Upload a photo for AI vision analysis</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="expert" className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {experts.map((e, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 hover:translate-y-[-4px] hover:shadow-[0_10px_30px_rgba(76,175,80,0.1)] transition-all cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/40 flex items-center justify-center font-bold text-white shadow-xl group-hover:scale-110 transition-transform">
                        {e.initials}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{e.name}</h4>
                        <p className="text-[10px] opacity-40 font-medium">{e.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-primary">⭐ 4.9 Rating</span>
                      <span className="text-[9px] opacity-40 uppercase">Replies in {e.time}</span>
                    </div>
                    <Button variant="ghost" className="w-full h-8 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10">Connect</Button>
                  </div>
                ))}
              </div>

              <div className="bg-black/40 border border-white/10 rounded-3xl p-8 space-y-6">
                <p className="text-[10px] uppercase font-black tracking-widest opacity-30">Consultation Terminal</p>
                <Textarea 
                  value={expertMessage}
                  onChange={(e) => setExpertMessage(e.target.value)}
                  placeholder="Describe your issue to send to the expert..."
                  className="h-32 bg-white/2 border-white/5 rounded-2xl focus-visible:ring-primary/40"
                />
                <div className="flex justify-between items-center">
                  <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest h-10 px-6 opacity-40 hover:opacity-100">
                    <Upload className="mr-2" size={14} /> Attach Reference
                  </Button>
                  <Button 
                    onClick={handleExpertSend}
                    disabled={!expertMessage.trim()}
                    className="h-10 px-8 rounded-xl bg-primary hover:bg-primary/90 text-[11px] font-black uppercase tracking-widest"
                  >
                    Send to Expert <Send className="ml-2" size={14} />
                  </Button>
                </div>
              </div>

              {expertQueries.length > 0 && (
                <div className="space-y-4">
                  <p className="text-[10px] uppercase font-black tracking-widest opacity-30">Previous Queries</p>
                  <div className="space-y-3">
                    {expertQueries.map((q) => (
                      <div key={q.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-4">
                          <MessageSquare size={16} className="text-primary opacity-40" />
                          <div>
                            <p className="text-xs font-bold text-white truncate max-w-xs">{q.query}</p>
                            <p className="text-[9px] opacity-40 uppercase">{q.expertName} · {q.date}</p>
                          </div>
                        </div>
                        <Badge className={cn("text-[8px] font-black uppercase", q.status === 'Pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary')}>
                          {q.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <style jsx global>{`
        @keyframes scan-line {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan-line {
          animation: scan-line 2s ease-in-out infinite;
          position: absolute;
        }
        @keyframes loading-bar {
          from { width: 0; }
          to { width: 100%; }
        }
        .animate-loading-bar {
          animation: loading-bar 5s linear infinite;
        }
      `}</style>
    </section>
  );
}

function ResultCard({ result, saveToRecords, onExpertClick }: { result: DiagnosisResult, saveToRecords: () => void, onExpertClick: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const text = `KrishiShield AI Diagnosis: ${result.diagnosis} (${result.confidence}% confidence). Severity: ${result.severity}. Treatment: ${result.treatment?.join(', ')}.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col animate-in zoom-in-95 duration-500 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4">
        <Badge className={cn("text-[9px] font-black uppercase px-2.5 py-1", 
          result.severity === 'high' ? 'bg-red-500/20 text-red-500 border-red-500/30' : 
          result.severity === 'medium' ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 
          'bg-primary/20 text-primary border-primary/30'
        )}>
          Severity: {result.severity}
        </Badge>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="text-3xl font-headline font-black text-white">{result.diagnosis}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-black uppercase text-primary tracking-widest">{result.confidence}% Confidence</span>
            <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${result.confidence}%` }} />
            </div>
          </div>
        </div>

        <div className="p-4 bg-white/2 border border-white/5 rounded-2xl">
          <p className="text-[10px] font-black uppercase opacity-20 mb-2">Primary Cause</p>
          <p className="text-[13px] text-white/70 leading-relaxed italic">&quot;{result.cause}&quot;</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase opacity-30">Treatment Steps</p>
            <ul className="space-y-2">
              {result.treatment?.map((t, idx) => (
                <li key={idx} className="flex gap-2 text-[12px] opacity-70">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase opacity-30">Prevention Tips</p>
            <ul className="space-y-2">
              {result.prevention?.map((t, idx) => (
                <li key={idx} className="flex gap-2 text-[12px] opacity-70">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-white/5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase opacity-20">Recovery Timeline</span>
            <span className="text-sm font-bold text-primary">{result.recovery}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={saveToRecords} className="p-2 bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors" title="Save">
              <Save size={18} />
            </button>
            <button onClick={handleShare} className="p-2 bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors" title="Share">
              {copied ? <CheckCircle2 size={18} className="text-primary" /> : <Share2 size={18} />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button onClick={onExpertClick} variant="outline" className="h-10 text-[9px] font-black uppercase tracking-widest border-white/10 bg-white/5 hover:bg-white/10">
            Talk to Expert
          </Button>
          <Button onClick={() => window.dispatchEvent(new CustomEvent('kisanAiOpen', { detail: { prompt: `Tell me more about ${result.diagnosis} for ${result.severity} severity.` } }))} className="h-10 text-[9px] font-black uppercase tracking-widest bg-primary">
            Ask Kisan AI
          </Button>
        </div>
      </div>
    </div>
  );
}
