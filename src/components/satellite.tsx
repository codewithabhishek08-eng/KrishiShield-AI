"use client";

import React, { useEffect, useRef, useState } from 'react';
import { 
  Satellite, Search, ArrowLeft, Wind, Thermometer, 
  Droplets, Microscope, Sparkles, Map as MapIcon,
  Info, AlertTriangle, RefreshCw
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getFieldAssessment } from '@/ai/flows/field-assessment-flow';

// Leaflet is client-side only
import 'leaflet/dist/leaflet.css';

const NDVI_COLORS = {
  healthy: '#4CAF50',
  stressed: '#F57F17',
  drought: '#B71C1C'
};

const GRID_SIZE = 48;

export function SatelliteScreen() {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedField, setSelectedField] = useState<any>(null);
  const [activeChartTab, setActiveChartTab] = useState<'NDVI' | 'Disease' | 'Yield' | 'Rainfall'>('NDVI');
  const [assessmentText, setAssessmentText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const mapRef = useRef<any>(null);
  const heatmapCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const typeTimeoutRef = useRef<any>(null);

  // Initialize Map
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const L = require('leaflet');
    
    if (mapRef.current) return;

    // Custom dark theme layer
    const map = L.map('satellite-map', {
      zoomControl: false,
      attributionControl: false,
      maxBounds: [[-90, -180], [90, 180]]
    }).setView([20, 0], 2);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CartoDB'
    }).addTo(map);

    // Mock Regional Overlays (Glow)
    const regionalData = [
      { coords: [[18, 70], [22, 70], [22, 78], [18, 78]], color: NDVI_COLORS.healthy }, // Maharashtra
      { coords: [[28, 74], [32, 74], [32, 77], [28, 77]], color: NDVI_COLORS.stressed }, // Punjab
    ];

    regionalData.forEach(region => {
      L.polygon(region.coords, {
        color: region.color,
        weight: 0,
        fillColor: region.color,
        fillOpacity: 0.15,
        className: 'ndvi-glow'
      }).addTo(map);
    });

    // Outbreak Pins
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

    // Cinematic Zoom Entrance
    setTimeout(() => {
      map.flyTo([19.9975, 73.7898], 14, { duration: 3.5, easeLinearity: 0.25 });
      setTimeout(() => {
        handleFieldSelect({ name: "Ramesh's Field 44B", lat: 19.9975, lng: 73.7898 });
      }, 3800);
    }, 1500);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const handleFieldSelect = async (field: any) => {
    setSelectedField(field);
    setAssessmentText('');
    
    // Draw side panel heatmap
    setTimeout(() => drawHeatmap(), 100);

    // Fetch AI Assessment
    try {
      const res = await getFieldAssessment({
        score: 74,
        crop: "Tomato (Hybrid)",
        humidity: 65,
        location: field.name
      });
      typeAssessment(res.assessment);
    } catch (e) {
      typeAssessment("Uplink established. Field metrics indicate stable vigor with moderate transpiration load. Action: Monitor irrigation pressure at segment C4.");
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
      setTimeout(paintRow, 2); // 2ms stagger as requested
    };

    const drawDashedOverlay = () => {
      let offset = 0;
      const animate = () => {
        if (!heatmapCanvasRef.current) return;
        const ctx = heatmapCanvasRef.current.getContext('2d');
        if (!ctx) return;

        // Re-paint just to handle the dashed overlay animation
        // In a real app we'd layer canvases, but for MVP we redraw the overlay
        ctx.save();
        ctx.strokeStyle = 'rgba(239, 83, 80, 0.8)';
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = -offset;
        ctx.lineWidth = 2;
        // Crawling dashed border around stress patch
        ctx.strokeRect(canvas.width * 0.6, 20, canvas.width * 0.3, canvas.height * 0.3);
        ctx.restore();
        
        offset += 0.3;
        requestAnimationFrame(animate);
      };
      animate();
    };

    paintRow();
  };

  // Canvas-based tabbed charts
  useEffect(() => {
    const canvas = chartCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawChart = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const y = (h / 4) * i;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Trend Curve
      ctx.beginPath();
      ctx.strokeStyle = activeChartTab === 'Rainfall' ? '#1976D2' : NDVI_COLORS.healthy;
      ctx.lineWidth = 2;
      const points = Array.from({ length: 30 }, (_, i) => ({
        x: (w / 29) * i,
        y: h * 0.7 - Math.sin(i / 3) * 40 - Math.random() * 15
      }));

      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();

      // Confidence Band
      ctx.fillStyle = activeChartTab === 'Rainfall' ? 'rgba(25, 118, 210, 0.08)' : 'rgba(76, 175, 80, 0.08)';
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y - 20);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y - (20 + i * 0.4));
      }
      for (let i = points.length - 1; i >= 0; i--) {
        ctx.lineTo(points[i].x, points[i].y + (20 + i * 0.4));
      }
      ctx.fill();
    };

    drawChart();
  }, [activeChartTab, selectedField]);

  return (
    <div className="relative h-[calc(100vh-56px)] w-full overflow-hidden flex flex-col bg-[#0A0F0A]">
      {/* Search Header */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-lg px-4 animate-in fade-in slide-in-from-top-4 duration-1000">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-primary transition-colors" size={18} />
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search country, state, or field coordinates..."
            className="w-full h-14 pl-12 bg-black/60 border-white/10 backdrop-blur-2xl rounded-2xl text-lg font-light focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all shadow-2xl"
          />
        </div>
      </div>

      {/* Main Map Container */}
      <div id="satellite-map" className="flex-1 w-full" />

      {/* Side Glass Panel */}
      <div 
        className={cn(
          "fixed top-[56px] right-0 h-[calc(100vh-56px)] w-full md:w-[420px] glass-panel z-[1100] transition-transform duration-600 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col",
          selectedField ? "translate-x-0" : "translate-x-full"
        )}
      >
        <button 
          onClick={() => setSelectedField(null)}
          className="absolute top-4 left-4 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-10 pt-16">
          <section>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-headline font-black text-white">{selectedField?.name || "Target Field"}</h3>
                <p className="text-[12px] opacity-40 font-code tracking-tight">LAT: {selectedField?.lat?.toFixed(4) || "19.99"} · LNG: {selectedField?.lng?.toFixed(4) || "73.78"}</p>
              </div>
              <Badge className="bg-red-500/10 text-red-400 border-red-500/30">CRITICAL RISK</Badge>
            </div>

            <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-white/5 bg-black/40 shadow-inner">
              <canvas ref={heatmapCanvasRef} width={400} height={400} className="w-full h-full" />
              <div className="absolute bottom-4 right-4 flex flex-col items-end">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1">Live Feed</span>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Field Health</span>
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="50%" cy="50%" r="45%" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                  <circle cx="50%" cy="50%" r="45%" fill="none" stroke="#4CAF50" strokeWidth="4" strokeDasharray="141" strokeDashoffset="36" strokeLinecap="round" />
                </svg>
                <span className="text-xl font-headline font-black">74</span>
              </div>
            </div>
            <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex flex-col justify-center space-y-4">
              <div className="flex items-center gap-3">
                <Wind size={14} className="text-blue-400" />
                <span className="text-sm font-medium">12 km/h NW</span>
              </div>
              <div className="flex items-center gap-3">
                <Thermometer size={14} className="text-red-400" />
                <span className="text-sm font-medium">28.4 °C</span>
              </div>
              <div className="flex items-center gap-3">
                <Droplets size={14} className="text-teal-400" />
                <span className="text-sm font-medium">65% RH</span>
              </div>
            </div>
          </div>

          <section className="bg-primary/5 border border-primary/20 p-6 rounded-3xl relative overflow-hidden group">
            <Sparkles className="absolute -right-4 -top-4 w-32 h-32 opacity-5 rotate-12 group-hover:scale-110 transition-transform" />
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/20 rounded-lg text-primary"><Microscope size={18} /></div>
              <h4 className="font-bold text-primary tracking-tight">AI Tactical Brief</h4>
            </div>
            <div className="min-h-[80px]">
              <p className="text-[14px] font-body leading-relaxed text-white/80 italic">
                {assessmentText}
                {isTyping && <span className="inline-block w-1.5 h-4 bg-primary ml-1 animate-pulse" />}
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-20">Uplink: Sentinel-2C</span>
              <span className="text-[10px] font-bold text-primary/60">T-02:44:11</span>
            </div>
          </section>
        </div>
      </div>

      {/* Bottom Chart Section */}
      <div className="h-[200px] w-full bg-[#0A1A0A]/98 border-t border-white/5 px-8 flex flex-col relative z-[900] backdrop-blur-md">
        <div className="flex gap-8 border-b border-white/5">
          {['NDVI', 'Disease', 'Yield', 'Rainfall'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveChartTab(tab as any)}
              className={cn(
                "h-12 px-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative",
                activeChartTab === tab ? "text-primary" : "text-white/30 hover:text-white"
              )}
            >
              {tab} Trend
              {activeChartTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
            </button>
          ))}
        </div>
        <div className="flex-1 py-4">
          <canvas ref={chartCanvasRef} width={1200} height={140} className="w-full h-full opacity-60" />
        </div>
      </div>

      <style jsx global>{`
        .ndvi-glow {
          filter: blur(40px);
        }
        @keyframes radar-sweep {
          0% { transform: scale(0); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .radar-pulse::after {
          content: '';
          position: absolute;
          width: 100%; height: 100%;
          border-radius: 50%;
          background: rgba(239, 83, 80, 0.4);
          animation: radar-sweep 2s infinite;
        }
      `}</style>
    </div>
  );
}
