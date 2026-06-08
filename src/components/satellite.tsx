"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Satellite, Search, ArrowLeft, Wind, Thermometer, 
  Droplets, Microscope, Sparkles, Map as MapIcon,
  Info, AlertTriangle, RefreshCw, Activity,
  TrendingUp, BarChart3, CloudRain, Target
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getFieldAssessment } from '@/ai/flows/field-assessment-flow';
import { getNdviInsight } from '@/ai/flows/ndvi-insight-flow';
import { getDiseaseInsight } from '@/ai/flows/disease-insight-flow';
import { getYieldInsight } from '@/ai/flows/yield-insight-flow';
import { getRainfallInsight } from '@/ai/flows/rainfall-insight-flow';

import 'leaflet/dist/leaflet.css';

const NDVI_COLORS = {
  healthy: '#4CAF50',
  stressed: '#F57F17',
  drought: '#B71C1C'
};

const GRID_SIZE = 48;

/**
 * Animated Counter Component for smooth number rolls
 */
function AnimatedCounter({ value, suffix = "" }: { value: number, suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const duration = 600;
    const end = value;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setDisplayValue(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);
  return <span>{displayValue}{suffix}</span>;
}

/**
 * A "Tin Box" Frosted Glass Intelligence Card with a Canvas chart and Groq insight.
 */
function IntelligenceCard({ 
  title, 
  icon: Icon, 
  drawChart, 
  insightFlow, 
  insightData,
  index 
}: { 
  title: string; 
  icon: any; 
  drawChart: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  insightFlow: (data: any) => Promise<{ insight: string }>;
  insightData: any;
  index: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);
  const [typewritten, setTypewritten] = useState('');

  const fetchInsight = useCallback(async () => {
    setLoading(true);
    setTypewritten('');
    try {
      // Add variance to input to keep AI responses fresh on manual refresh
      const res = await insightFlow({ ...insightData, _v: Date.now() });
      setInsight(res.insight);
      
      let i = 0;
      const text = res.insight;
      const interval = setInterval(() => {
        setTypewritten(text.slice(0, i));
        i++;
        if (i > text.length) clearInterval(interval);
      }, 15);
    } catch (e) {
      setInsight("Unable to uplink to AI advisor. Retrying...");
    } finally {
      setLoading(false);
    }
  }, [insightFlow, insightData]);

  useEffect(() => {
    fetchInsight();
  }, [fetchInsight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let progress = 0;
    const animate = () => {
      progress += 0.025;
      if (progress > 1) progress = 1;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw Grid Lines (20% opacity)
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for(let i=1; i<4; i++) {
        const y = (canvas.height / 4) * i;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }
      
      ctx.save();
      ctx.globalAlpha = progress;
      drawChart(ctx, canvas.width, canvas.height);
      ctx.restore();
      
      if (progress < 1) requestAnimationFrame(animate);
    };
    animate();
  }, [drawChart]);

  return (
    <div 
      className="tin-box animate-in opacity-0"
      style={{ 
        animation: `slideUpFade 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards`,
        animationDelay: `${index * 150}ms`
      }}
    >
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Icon size={18} className="text-primary" />
          </div>
          <h4 className="text-[12px] font-black uppercase tracking-[0.1em] text-white/80">{title}</h4>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-primary/5 rounded-full border border-primary/10">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
          <span className="text-[9px] font-black uppercase text-primary/60">Live Feed</span>
        </div>
      </div>

      <div className="flex-1 relative mb-6">
        <canvas ref={canvasRef} width={500} height={160} className="w-full h-[160px]" />
      </div>

      <div className="relative mt-auto">
        <div className="ai-strip group">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
              <Sparkles size={10} /> AI Analysis
            </span>
            <button 
              onClick={fetchInsight} 
              className="p-1.5 text-white/20 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="min-h-[44px]">
            {loading ? (
              <div className="space-y-2">
                <div className="skeleton-line w-full h-3" />
                <div className="skeleton-line w-4/5 h-3" />
              </div>
            ) : (
              <p className="text-[13px] font-body text-white/70 leading-relaxed italic">
                {typewritten}
                <span className="inline-block w-1.5 h-3.5 bg-primary ml-1 animate-pulse" />
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SatelliteScreen() {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedField, setSelectedField] = useState<any>(null);
  const [assessmentText, setAssessmentText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const mapRef = useRef<any>(null);
  const heatmapCanvasRef = useRef<HTMLCanvasElement>(null);
  const typeTimeoutRef = useRef<any>(null);
  const zoomTimeoutRef = useRef<any>(null);
  const fieldSelectTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const L = require('leaflet');
    
    if (mapRef.current) return;

    const map = L.map('satellite-map', {
      zoomControl: false,
      attributionControl: false,
      maxBounds: [[-90, -180], [90, 180]]
    }).setView([20, 0], 2);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CartoDB'
    }).addTo(map);

    const outbreaks = [
      { lat: 20.0, lng: 73.8, label: "Nasik - Blight" },
      { lat: 18.5, lng: 73.8, label: "Pune - Pest Surge" },
      { lat: 15.3, lng: 75.7, label: "Hubli - Water Stress" }
    ];

    outbreaks.forEach(o => {
      const icon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="w-4 h-4 bg-red-500 rounded-full border-2 border-white radar-pulse relative"></div>`,
        iconSize: [16, 16]
      });
      L.marker([o.lat, o.lng], { icon }).addTo(map).on('click', () => {
        handleFieldSelect({ name: o.label, lat: o.lat, lng: o.lng });
      });
    });

    mapRef.current = map;
    setMapLoaded(true);

    // Initial Cinematic Sequence
    zoomTimeoutRef.current = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
        mapRef.current.flyTo([19.9975, 73.7898], 14, { duration: 3.5, easeLinearity: 0.25 });
        
        fieldSelectTimeoutRef.current = setTimeout(() => {
          handleFieldSelect({ name: "Ramesh's Field 44B", lat: 19.9975, lng: 73.7898 });
        }, 3800);
      }
    }, 1500);

    return () => {
      if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
      if (fieldSelectTimeoutRef.current) clearTimeout(fieldSelectTimeoutRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const handleFieldSelect = async (field: any) => {
    setSelectedField(field);
    setAssessmentText('');
    setTimeout(() => drawHeatmap(), 100);

    try {
      const res = await getFieldAssessment({
        score: 74,
        crop: "Tomato (Hybrid)",
        humidity: 65,
        location: field.name
      });
      typeAssessment(res.assessment);
    } catch (e) {
      typeAssessment("Uplink established. Field metrics indicate stable vigor with moderate transpiration load. Action: Monitor irrigation pressure.");
    }
  };

  const typeAssessment = (text: string) => {
    setIsTyping(true);
    let i = 0;
    const speed = 25;
    if (typeTimeoutRef.current) clearInterval(typeTimeoutRef.current);
    
    typeTimeoutRef.current = setInterval(() => {
      setAssessmentText(text.slice(0, i));
      i++;
      if (i > text.length) {
        clearInterval(typeTimeoutRef.current);
        setIsTyping(false);
      }
    }, speed);
  };

  const drawHeatmap = () => {
    const canvas = heatmapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cellSize = canvas.width / GRID_SIZE;

    let y = 0;
    const paintRow = () => {
      if (!heatmapCanvasRef.current) return;
      if (y >= GRID_SIZE) {
        drawDashedOverlay();
        return;
      }
      for (let x = 0; x < GRID_SIZE; x++) {
        const val = 0.4 + Math.random() * 0.5;
        ctx.fillStyle = val > 0.8 ? '#1B5E20' : val > 0.6 ? '#4CAF50' : val > 0.4 ? '#F57F17' : '#B71C1C';
        ctx.fillRect(Math.ceil(x * cellSize), Math.ceil(y * cellSize), Math.ceil(cellSize), Math.ceil(cellSize));
      }
      y++;
      setTimeout(paintRow, 2);
    };

    const drawDashedOverlay = () => {
      let offset = 0;
      const animate = () => {
        if (!heatmapCanvasRef.current) return;
        const ctx = heatmapCanvasRef.current.getContext('2d');
        if (!ctx) return;
        ctx.save();
        ctx.strokeStyle = 'rgba(239, 83, 80, 0.8)';
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = -offset;
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width * 0.6, 20, canvas.width * 0.3, canvas.height * 0.3);
        ctx.restore();
        offset += 0.3;
        requestAnimationFrame(animate);
      };
      animate();
    };
    paintRow();
  };

  // Chart Rendering Logics
  const drawNdviChart = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#4CAF50';
    ctx.beginPath();
    ctx.moveTo(0, h*0.4);
    for(let i=0; i<30; i++) ctx.lineTo(w/29*i, h*0.4 + Math.sin(i/3)*15 + Math.random()*8);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Labels
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '9px font-code';
    ctx.fillText('1.0', 5, 15);
    ctx.fillText('0.5', 5, h/2);
    ctx.fillText('0.0', 5, h-5);
  };

  const drawDiseaseChart = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.strokeStyle = '#EF5350';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#EF5350';
    ctx.beginPath();
    ctx.moveTo(0, h*0.85);
    for(let i=0; i<30; i++) ctx.lineTo(w/29*i, h*0.85 - Math.pow(i, 1.3)/3);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('100%', 5, 15);
    ctx.fillText('0%', 5, h-5);
  };

  const drawYieldChart = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // Confidence Band
    ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
    ctx.beginPath();
    ctx.moveTo(0, h*0.5);
    for(let i=0; i<30; i++) ctx.lineTo(w/29*i, h*0.5 - 15 - i*0.4);
    for(let i=29; i>=0; i--) ctx.lineTo(w/29*i, h*0.5 + 15 + i*0.4);
    ctx.fill();
    // Projection Line
    ctx.strokeStyle = '#81C784';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, h*0.5);
    for(let i=0; i<30; i++) ctx.lineTo(w/29*i, h*0.5 - i*0.8);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('5T', 5, 15);
    ctx.fillText('Avg', 5, h*0.5 + 4);
  };

  const drawRainfallChart = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const bars = [12, 45, 32, 10, 8, 22, 60];
    const bw = w / 15;
    ctx.fillStyle = '#1976D2';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#1976D2';
    bars.forEach((v, i) => {
      ctx.fillRect(bw*2*i + bw, h - v, bw, v);
    });
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('80mm', 5, 15);
  };

  return (
    <div className="relative h-[calc(100vh-56px)] w-full overflow-hidden flex flex-col bg-[#0A0F0A]">
      {/* Search Header */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-lg px-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search field coordinates..."
            className="w-full h-14 pl-12 bg-black/60 border-white/10 backdrop-blur-3xl rounded-2xl text-lg focus-visible:ring-primary/40 shadow-2xl"
          />
        </div>
      </div>

      {/* Main Map Container */}
      <div id="satellite-map" className="flex-1 w-full" />

      {/* Side Glass Panel */}
      <div 
        className={cn(
          "fixed top-[56px] right-0 h-[calc(100vh-56px)] w-full md:w-[420px] glass-panel z-[1100] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col shadow-[-40px_0_100px_rgba(0,0,0,0.8)]",
          selectedField ? "translate-x-0" : "translate-x-full"
        )}
      >
        <button 
          onClick={() => setSelectedField(null)}
          className="absolute top-4 left-4 p-2.5 bg-white/5 rounded-full hover:bg-white/10 transition-colors z-10"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-10 pt-20">
          <section>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-3xl font-headline font-black text-white">{selectedField?.name || "Target Field"}</h3>
                <p className="text-[12px] opacity-40 font-code tracking-[0.2em] mt-1 uppercase">LAT: {selectedField?.lat?.toFixed(4) || "19.99"} · LNG: {selectedField?.lng?.toFixed(4) || "73.78"}</p>
              </div>
              <Badge className="bg-red-500/10 text-red-500 border-red-500/30 font-black tracking-widest text-[10px]">CRITICAL</Badge>
            </div>

            <div className="relative aspect-square w-full rounded-[2rem] overflow-hidden border border-white/10 bg-black/60 shadow-2xl">
              <canvas ref={heatmapCanvasRef} width={400} height={400} className="w-full h-full" />
              <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2 bg-black/40 p-3 rounded-2xl backdrop-blur-md">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Uplink Active</span>
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_#EF5350]" />
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex flex-col items-center justify-center space-y-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Field Score</span>
              <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="50%" cy="50%" r="42%" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                  <circle cx="50%" cy="50%" r="42%" fill="none" stroke="#4CAF50" strokeWidth="6" strokeDasharray="131" strokeDashoffset="34" strokeLinecap="round" />
                </svg>
                <span className="text-3xl font-headline font-black"><AnimatedCounter value={74} /></span>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex flex-col justify-center gap-4">
              <div className="flex items-center gap-4 group">
                <Wind size={16} className="text-blue-400 group-hover:rotate-45 transition-transform" />
                <span className="text-sm font-bold tracking-tight">12 km/h NW</span>
              </div>
              <div className="flex items-center gap-4">
                <Thermometer size={16} className="text-red-400" />
                <span className="text-sm font-bold tracking-tight">28.4 °C</span>
              </div>
              <div className="flex items-center gap-4">
                <Droplets size={16} className="text-teal-400" />
                <span className="text-sm font-bold tracking-tight">65% RH</span>
              </div>
            </div>
          </div>

          <section className="bg-primary/10 border border-primary/20 p-8 rounded-[2rem] relative overflow-hidden group">
            <Sparkles className="absolute -right-4 -top-4 w-32 h-32 opacity-5 rotate-12 group-hover:scale-110 transition-transform" />
            <div className="flex items-center gap-4 mb-4">
              <div className="p-2.5 bg-primary/20 rounded-xl text-primary"><Microscope size={20} /></div>
              <h4 className="font-black uppercase text-primary tracking-[0.1em] text-sm">Tactical Brief</h4>
            </div>
            <div className="min-h-[100px]">
              <p className="text-[15px] font-body leading-relaxed text-white/80 italic">
                {assessmentText}
                {isTyping && <span className="inline-block w-1.5 h-4 bg-primary ml-1 animate-pulse" />}
              </p>
            </div>
            <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-30">
              <span>Sentinel-2C Uplink</span>
              <span className="text-primary/60">T-02:44:11</span>
            </div>
          </section>
        </div>
      </div>

      {/* Analysis Terminal - 2x2 Tin Box Grid */}
      <div className="relative z-[900] bg-[#0A1A0A]/98 border-t border-white/10 p-10 overflow-y-auto no-scrollbar max-h-[480px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-[1600px] mx-auto">
          <IntelligenceCard 
            index={0}
            title="NDVI Analysis" 
            icon={TrendingUp} 
            drawChart={drawNdviChart}
            insightFlow={getNdviInsight}
            insightData={{ crop: "Tomato", location: selectedField?.name || "Nasik", current: 0.58, previous: 0.71 }}
          />
          <IntelligenceCard 
            index={1}
            title="Pathogen Risk" 
            icon={Activity} 
            drawChart={drawDiseaseChart}
            insightFlow={getDiseaseInsight}
            insightData={{ value: 42, humidity: 78, temp: 28 }}
          />
          <IntelligenceCard 
            index={2}
            title="Yield Forecast" 
            icon={Target} 
            drawChart={drawYieldChart}
            insightFlow={getYieldInsight}
            insightData={{ projected: 3.2, average: 4.1 }}
          />
          <IntelligenceCard 
            index={3}
            title="Hydrology" 
            icon={CloudRain} 
            drawChart={drawRainfallChart}
            insightFlow={getRainfallInsight}
            insightData={{ rainfall: 12, need: 34 }}
          />
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .radar-pulse::after {
          content: '';
          position: absolute;
          width: 100%; height: 100%;
          border-radius: 50%;
          background: rgba(239, 83, 80, 0.4);
          animation: radar-sweep 2s infinite;
        }
        @keyframes radar-sweep {
          0% { transform: scale(0); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .tin-box {
          background: rgba(10, 20, 10, 0.75);
          backdrop-filter: blur(18px);
          border: 1px solid rgba(76, 175, 80, 0.25);
          border-radius: 16px;
          padding: 28px;
          box-shadow: inset 0 0 40px rgba(76, 175, 80, 0.05), 0 8px 32px rgba(0,0,0,0.4);
          display: flex;
          flex-direction: column;
          min-height: 380px;
          transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .tin-box:hover {
          border-color: rgba(76, 175, 80, 0.6);
          transform: translateY(-8px);
          box-shadow: inset 0 0 60px rgba(76, 175, 80, 0.1), 0 12px 48px rgba(0,0,0,0.6);
        }
        .ai-strip {
          background: rgba(0, 0, 0, 0.5);
          border-left: 3px solid #4CAF50;
          padding: 16px;
          border-radius: 8px;
          transition: background 0.3s ease;
        }
        .ai-strip:hover {
          background: rgba(0, 0, 0, 0.7);
        }
        .skeleton-line {
          background: linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 100%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
