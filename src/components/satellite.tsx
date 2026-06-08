
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Satellite, Search, Wind, Thermometer, 
  Droplets, Microscope, Sparkles, Map as MapIcon,
  Info, AlertTriangle, RefreshCw, Activity,
  Target, Bug, Sprout, Leaf, CloudRain
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getNdviInsight } from '@/ai/flows/ndvi-insight-flow';
import { getDiseaseInsight } from '@/ai/flows/disease-insight-flow';
import { getYieldInsight } from '@/ai/flows/yield-insight-flow';
import { getRainfallInsight } from '@/ai/flows/rainfall-insight-flow';
import { 
  AreaChart, Area, LineChart, Line, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine, 
  ComposedChart, Cell 
} from 'recharts';

import 'leaflet/dist/leaflet.css';

/**
 * Tactical Field Intelligence Data Structure
 */
interface FieldData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  crop: string;
  metrics: {
    healthScore: number;
    ndvi: number;
    diseaseRisk: number;
    daysToHarvest: number;
    lastPass: string;
    humidity: number;
    temp: number;
    rainfall: number;
    waterNeed: number;
  };
  ndviHistory: { week: string; baseline: number; field: number }[];
  diseaseHistory: { day: string; probability: number }[];
  yieldForecast: { month: string; optimal: number; forecast: number; untreated: number }[];
  rainfallHistory: { day: string; actual: number; requirement: number }[];
}

const DEFAULT_FIELD_DATA: FieldData = {
  id: 'nasik-44b',
  name: "Ramesh's Field 44B",
  lat: 19.9975,
  lng: 73.7898,
  crop: "Tomato (Hybrid)",
  metrics: {
    healthScore: 74,
    ndvi: 0.58,
    diseaseRisk: 42,
    daysToHarvest: 107,
    lastPass: "2h ago",
    humidity: 78,
    temp: 28,
    rainfall: 12,
    waterNeed: 34
  },
  ndviHistory: Array.from({ length: 12 }, (_, i) => ({
    week: `W${i + 1}`,
    baseline: 0.75 + Math.random() * 0.1,
    field: i > 8 ? 0.45 + Math.random() * 0.1 : 0.65 + Math.random() * 0.15
  })),
  diseaseHistory: Array.from({ length: 30 }, (_, i) => ({
    day: `${i + 1}`,
    probability: Math.min(100, Math.pow(i, 1.2) * 1.5)
  })),
  yieldForecast: [
    { month: 'Jul', optimal: 4200, forecast: 3800, untreated: 3600 },
    { month: 'Aug', optimal: 4500, forecast: 3900, untreated: 3400 },
    { month: 'Sep', optimal: 5000, forecast: 4100, untreated: 3200 }
  ],
  rainfallHistory: Array.from({ length: 7 }, (_, i) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    actual: [12, 45, 32, 10, 8, 22, 60][i],
    requirement: 40
  }))
};

/**
 * Animated Counter Component
 */
function Counter({ value, suffix = "", delay = 0 }: { value: number, suffix?: string, delay?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      let start = 0;
      const duration = 600;
      const step = (timestamp: number) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        setCount(Math.floor(progress * value));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return <span>{count}{suffix}</span>;
}

/**
 * Typewriter Text Component
 */
function Typewriter({ text, speed = 28 }: { text: string, speed?: number }) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    let i = 0;
    setDisplayed('');
    const timer = setInterval(() => {
      setDisplayed(text.slice(0, i));
      i++;
      if (i > text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  return <>{displayed}<span className="inline-block w-1 h-3.5 bg-primary ml-1 animate-pulse" /></>;
}

/**
 * AI Advice Block Component
 */
function AdviceBlock({ 
  title, 
  icon: Icon, 
  flow, 
  data, 
  refreshKey 
}: { 
  title: string, 
  icon: any, 
  flow: (data: any) => Promise<{ insight: string }>, 
  data: any,
  refreshKey: number
}) {
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [internalRefresh, setInternalRefresh] = useState(0);

  const fetchInsight = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await flow(data);
      setInsight(res.insight);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [flow, data]);

  useEffect(() => {
    fetchInsight();
  }, [fetchInsight, refreshKey, internalRefresh]);

  return (
    <div className="border-l-3 border-primary bg-black/35 rounded-xl p-4 relative group transition-all hover:bg-black/50">
      <div className="flex items-center gap-3 mb-2">
        <Icon size={16} className="text-primary" />
        <span className="text-sm font-bold text-white uppercase tracking-tight">{title}</span>
      </div>
      <div className="min-h-[60px]">
        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-primary/10 rounded w-full" />
            <div className="h-3 bg-primary/10 rounded w-4/5" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-amber-400 text-xs">
            <RefreshCw size={12} className="animate-spin" /> Retrying analysis...
          </div>
        ) : (
          <p className="text-[13px] font-body text-white/70 leading-relaxed italic">
            <Typewriter text={insight} />
          </p>
        )}
      </div>
      <button 
        onClick={() => setInternalRefresh(k => k + 1)}
        className="absolute bottom-2 right-2 p-1.5 text-white/20 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
      >
        <RefreshCw size={12} />
      </button>
    </div>
  );
}

export function SatelliteScreen() {
  const [selectedField, setSelectedField] = useState<FieldData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const mapRef = useRef<any>(null);
  const flyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Map
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const L = require('leaflet');
    
    // We target the map element - ensuring it exists
    const container = document.getElementById('satellite-map');
    if (!container) return;

    if (mapRef.current) {
      mapRef.current.remove();
    }

    const map = L.map('satellite-map', {
      zoomControl: false,
      attributionControl: false,
    }).setView([20, 0], 2);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);

    const outbreakIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div class="w-4 h-4 bg-red-500 rounded-full border-2 border-white radar-pulse relative"></div>`,
      iconSize: [16, 16]
    });

    L.marker([19.9975, 73.7898], { icon: outbreakIcon })
      .addTo(map)
      .on('click', () => setSelectedField(DEFAULT_FIELD_DATA));

    mapRef.current = map;

    // Trigger cinematic entrance zoom
    flyTimeoutRef.current = setTimeout(() => {
      if (mapRef.current && container.isConnected) {
        mapRef.current.invalidateSize();
        mapRef.current.flyTo([19.9975, 73.7898], 14, { duration: 3.5 });
      }
    }, 800);

    return () => {
      if (flyTimeoutRef.current) clearTimeout(flyTimeoutRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [selectedField === null]); // Re-init map when transitioning between modes as container is replaced

  const handleRefreshAll = () => {
    setRefreshKey(k => k + 1);
    setLastUpdated(new Date());
  };

  const chartStyles = "bg-black/80 backdrop-blur-3xl border border-primary/20 rounded-[14px] p-5 relative group overflow-hidden h-[320px] transition-all hover:border-primary/40";

  if (!selectedField) {
    return (
      <div className="relative h-[calc(100vh-56px)] w-full flex flex-col bg-[#0A0F0A]">
        <div id="satellite-map" className="flex-1 w-full" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1000]">
          <div className="bg-black/60 backdrop-blur-xl border border-primary/30 p-10 rounded-3xl flex flex-col items-center gap-6 animate-in zoom-in-95 pointer-events-auto">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center animate-pulse">
              <div className="w-6 h-6 bg-primary rounded-full" />
            </div>
            <p className="text-lg font-bold text-white/80">Select a field on the map to load intelligence</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#070D07] text-white">
      {/* Map Header Overlay */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-lg px-4 pointer-events-none">
        <div className="relative group pointer-events-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search field coordinates..."
            className="w-full h-14 pl-12 bg-black/60 border-white/10 backdrop-blur-3xl rounded-2xl text-lg focus-visible:ring-primary/40 shadow-2xl"
          />
        </div>
      </div>

      <div id="satellite-map" className="h-[40vh] w-full border-b border-primary/10" />

      <div id="satellite-data-panel" className="max-w-[1400px] mx-auto p-6 space-y-6">
        
        {/* Summary Bar */}
        <div className="bg-black/40 backdrop-blur-xl border border-primary/20 rounded-2xl p-6 flex flex-col md:flex-row gap-8 overflow-x-auto no-scrollbar">
          {[
            { label: 'Crop Health Score', val: selectedField.metrics.healthScore, unit: '/100', color: 'text-primary' },
            { label: 'NDVI Value', val: selectedField.metrics.ndvi, unit: ' index', color: 'text-amber-400' },
            { label: 'Disease Risk', val: selectedField.metrics.diseaseRisk, unit: '%', color: 'text-red-500' },
            { label: 'Days to Harvest', val: selectedField.metrics.daysToHarvest, unit: ' days', color: 'text-primary' },
            { label: 'Last Pass', val: 2, unit: 'h ago', color: 'text-white/60', isRaw: true }
          ].map((s, i) => (
            <div key={i} className="flex flex-col gap-1 min-w-[140px]">
              <span className="text-[10px] uppercase font-black tracking-widest opacity-40">{s.label}</span>
              <p className={cn("text-2xl font-headline font-black", s.color)}>
                {s.isRaw ? s.val : <Counter value={s.val} delay={i * 100} />}{s.unit}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          
          {/* Charts Column (60%) */}
          <div className="lg:col-span-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card 1: NDVI Trend */}
            <div className={chartStyles}>
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-black uppercase text-white/80">NDVI Trend</span>
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_#4CAF50]" />
              </div>
              <ResponsiveContainer width="100%" height="70%">
                <AreaChart data={selectedField.ndviHistory}>
                  <defs>
                    <linearGradient id="colorField" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F4A435" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#F4A435" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10}} />
                  <YAxis domain={[0, 1]} ticks={[0, 0.2, 0.4, 0.6, 0.8, 1.0]} axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10}} />
                  <Tooltip contentStyle={{ background: '#0C1C0C', border: 'none', borderRadius: '10px' }} />
                  <Area type="monotone" dataKey="field" stroke="#F4A435" strokeWidth={2} fill="url(#colorField)" />
                  <Line type="monotone" dataKey="baseline" stroke="#4CAF50" strokeDasharray="5 5" dot={false} />
                  {selectedField.metrics.ndvi < 0.5 && (
                    <ReferenceLine y={0.5} stroke="rgba(183,28,28,0.4)" label={{ position: 'top', value: 'Stress Zone', fill: '#EF5350', fontSize: 10 }} />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Card 2: Pathogen Risk */}
            <div className={chartStyles}>
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-black uppercase text-white/80">Pathogen Risk</span>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </div>
              <ResponsiveContainer width="100%" height="70%">
                <LineChart data={selectedField.diseaseHistory}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10}} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10}} unit="%" />
                  <Tooltip contentStyle={{ background: '#0C1C0C', border: 'none', borderRadius: '10px' }} />
                  <ReferenceLine y={60} stroke="#FFF" strokeDasharray="3 3" label={{ position: 'right', value: 'Threshold', fill: '#FFF', fontSize: 9 }} />
                  <Line type="monotone" dataKey="probability" stroke="#EF5350" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Card 3: Forecast */}
            <div className={chartStyles}>
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-black uppercase text-white/80">Yield Forecast</span>
                <Target size={14} className="text-primary opacity-40" />
              </div>
              <ResponsiveContainer width="100%" height="65%">
                <LineChart data={selectedField.yieldForecast}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10}} unit=" kg" />
                  <Tooltip contentStyle={{ background: '#0C1C0C', border: 'none', borderRadius: '10px' }} />
                  <Line type="monotone" dataKey="optimal" stroke="#4CAF50" strokeWidth={2} />
                  <Line type="monotone" dataKey="forecast" stroke="#1976D2" strokeWidth={2} />
                  <Line type="monotone" dataKey="untreated" stroke="#B71C1C" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-4">
                {['Optimal', 'Forecast', 'Untreated'].map((l, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: i === 0 ? '#4CAF50' : i === 1 ? '#1976D2' : '#B71C1C' }} />
                    <span className="text-[9px] font-black uppercase opacity-40">{l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 4: Rainfall */}
            <div className={chartStyles}>
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-black uppercase text-white/80">Hydrology Balance</span>
                <CloudRain size={14} className="text-blue-400 opacity-40" />
              </div>
              <ResponsiveContainer width="100%" height="70%">
                <ComposedChart data={selectedField.rainfallHistory}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10}} unit="mm" />
                  <Tooltip contentStyle={{ background: '#0C1C0C', border: 'none', borderRadius: '10px' }} />
                  <Bar dataKey="actual" fill="#1976D2" radius={[4, 4, 0, 0]}>
                    {selectedField.rainfallHistory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.actual < entry.requirement ? 'rgba(183,28,28,0.4)' : '#1976D2'} />
                    ))}
                  </Bar>
                  <Line type="monotone" dataKey="requirement" stroke="#F4A435" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

          </div>

          {/* AI Advice Column (40%) */}
          <div className="lg:col-span-4 space-y-4 sticky top-[76px] h-fit">
            <div className="flex justify-between items-center px-2">
              <div className="flex flex-col">
                <h3 className="text-lg font-headline font-black text-white">Field Intelligence</h3>
                <span className="text-[11px] opacity-40 uppercase tracking-widest">{selectedField.name}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-black uppercase opacity-20 block">Last Updated</span>
                <span className="text-[11px] font-code opacity-40 tabular-nums">{lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} IST</span>
              </div>
            </div>

            <div className="space-y-4">
              <AdviceBlock 
                title="Biomass Diagnosis" 
                icon={Leaf} 
                flow={getNdviInsight} 
                data={{ 
                  ndvi: selectedField.metrics.ndvi, 
                  crop: selectedField.crop, 
                  location: selectedField.name, 
                  week: "W12", 
                  trend_direction: "declining" 
                }} 
                refreshKey={refreshKey}
              />
              <AdviceBlock 
                title="Pathogen Analysis" 
                icon={Bug} 
                flow={getDiseaseInsight} 
                data={{ 
                  prob: selectedField.metrics.diseaseRisk, 
                  crop: selectedField.crop, 
                  h: selectedField.metrics.humidity, 
                  t: selectedField.metrics.temp, 
                  mm: selectedField.metrics.rainfall 
                }} 
                refreshKey={refreshKey}
              />
              <AdviceBlock 
                title="Economic Projection" 
                icon={Target} 
                flow={getYieldInsight} 
                data={{ 
                  yield: 4100, 
                  avg: 5000, 
                  crop: selectedField.crop, 
                  location: selectedField.name 
                }} 
                refreshKey={refreshKey}
              />
              <AdviceBlock 
                title="Irrigation Strategy" 
                icon={CloudRain} 
                flow={getRainfallInsight} 
                data={{ 
                  deficit: selectedField.metrics.waterNeed - selectedField.metrics.rainfall, 
                  crop: selectedField.crop, 
                  need: selectedField.metrics.waterNeed 
                }} 
                refreshKey={refreshKey}
              />
            </div>

            <button 
              onClick={handleRefreshAll}
              className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-3 group hover:bg-white/10 transition-all"
            >
              <RefreshCw size={14} className="opacity-40 group-hover:rotate-180 transition-transform duration-500" />
              <span className="text-xs font-black uppercase tracking-widest opacity-40 group-hover:opacity-100">Force Insight Refresh</span>
            </button>
          </div>

        </div>
      </div>

      <style jsx global>{`
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
        #satellite-map { 
          z-index: 10; 
          background: #000;
        }
      `}</style>
    </div>
  );
}
