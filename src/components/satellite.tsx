
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
import { getProfile, buildPrompt, type UserProfile } from '@/lib/user-profile';
import { getTacticalInsight } from '@/ai/flows/tactical-insight-flow';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, 
} from 'recharts';

import 'leaflet/dist/leaflet.css';

interface FieldData {
  id: string;
  name: string;
  crop: string;
  location: string;
  metrics: {
    healthScore: number;
    ndvi: number;
    diseaseRisk: number;
    daysToHarvest: number;
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

function AdviceBlock({ 
  title, 
  icon: Icon, 
  templateKey, 
  profile,
  extras,
  refreshKey 
}: { 
  title: string, 
  icon: any, 
  templateKey: any, 
  profile: UserProfile,
  extras: any,
  refreshKey: number
}) {
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(true);
  const [internalRefresh, setInternalRefresh] = useState(0);

  useEffect(() => {
    async function fetchInsight() {
      setLoading(true);
      try {
        const prompt = buildPrompt(templateKey, profile, extras);
        const res = await getTacticalInsight({ prompt });
        setInsight(res.insight);
      } catch (e) {
        setInsight("Telemetry signal lost. Retrying analysis...");
      } finally {
        setLoading(false);
      }
    }
    fetchInsight();
  }, [profile, extras, refreshKey, internalRefresh]);

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
  const [profile, setProfile] = useState<UserProfile>(getProfile());
  const [selectedField, setSelectedField] = useState<FieldData | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    const handleUpdate = () => setProfile(getProfile());
    window.addEventListener('profileUpdated', handleUpdate);
    return () => window.removeEventListener('profileUpdated', handleUpdate);
  }, []);

  const geocodeLocation = useCallback(async (city: string, state: string) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${city},${state}&format=json&limit=1`);
      const data = await res.json();
      if (data && data[0]) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    } catch (e) {
      console.error("Geocoding failed", e);
    }
    return [19.9975, 73.7898]; // Fallback to Nasik
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const L = require('leaflet');
    
    const mapContainer = document.getElementById('satellite-map');
    if (!mapContainer) return;

    // Critical fix: Ensure container is clean and no previous instance exists
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    
    // Explicitly clear Leaflet's internal marker on the DOM element to prevent "Map container being reused"
    if ((mapContainer as any)._leaflet_id) {
      (mapContainer as any)._leaflet_id = null;
    }

    const map = L.map('satellite-map', {
      zoomControl: false,
      attributionControl: false,
    }).setView([20, 0], 2);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);

    mapRef.current = map;

    async function initLocation() {
      const coords = await geocodeLocation(profile.city, profile.state);
      if (mapRef.current) {
        mapRef.current.flyTo(coords, 13, { duration: 3 });
        
        const outbreakIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="w-4 h-4 bg-red-500 rounded-full border-2 border-white radar-pulse relative"></div>`,
          iconSize: [16, 16]
        });

        L.marker(coords, { icon: outbreakIcon })
          .addTo(mapRef.current)
          .on('click', () => {
            setSelectedField({
              id: 'field-1',
              name: `${profile.crops[0]} Plot · ${profile.city}`,
              crop: profile.crops[0],
              location: `${profile.city}, ${profile.state}`,
              metrics: {
                healthScore: 78,
                ndvi: 0.64,
                diseaseRisk: 22,
                daysToHarvest: 105,
                humidity: 65,
                temp: 29,
                rainfall: 14,
                waterNeed: 42
              },
              ndviHistory: Array.from({ length: 12 }, (_, i) => ({ week: `W${i + 1}`, baseline: 0.75, field: 0.5 + Math.random() * 0.2 })),
              diseaseHistory: Array.from({ length: 30 }, (_, i) => ({ day: `${i + 1}`, probability: Math.random() * 30 })),
              yieldForecast: [{ month: 'Jul', optimal: 4000, forecast: 3600, untreated: 3000 }, { month: 'Aug', optimal: 4500, forecast: 3900, untreated: 2800 }],
              rainfallHistory: Array.from({ length: 7 }, (_, i) => ({ day: ['M','T','W','T','F','S','S'][i], actual: Math.random() * 50, requirement: 35 }))
            });
          });
      }
    }

    initLocation();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [profile, geocodeLocation]);

  if (!selectedField) {
    return (
      <div className="relative h-[calc(100vh-120px)] w-full flex flex-col bg-[#0A0F0A]">
        <div id="satellite-map" className="flex-1 w-full" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1000]">
          <div className="bg-black/60 backdrop-blur-xl border border-primary/30 p-10 rounded-3xl flex flex-col items-center gap-6 animate-in zoom-in-95 pointer-events-auto">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center animate-pulse">
              <div className="w-6 h-6 bg-primary rounded-full" />
            </div>
            <p className="text-lg font-bold text-white/80">Analysing regional data for {profile.city}... Select your plot to load intelligence.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#070D07] text-white">
      <div id="satellite-map" className="h-[35vh] w-full border-b border-primary/10" />

      <div id="satellite-data-panel" className="max-w-[1400px] mx-auto p-6 space-y-6">
        <div className="bg-black/40 backdrop-blur-xl border border-primary/20 rounded-2xl p-6 flex flex-col md:flex-row gap-8 overflow-x-auto no-scrollbar">
          {[
            { label: 'Crop Health Score', val: selectedField.metrics.healthScore, unit: '/100', color: 'text-primary' },
            { label: 'NDVI Value', val: selectedField.metrics.ndvi, unit: ' index', color: 'text-amber-400' },
            { label: 'Disease Risk', val: selectedField.metrics.diseaseRisk, unit: '%', color: 'text-red-500' },
            { label: 'Days to Harvest', val: selectedField.metrics.daysToHarvest, unit: ' days', color: 'text-primary' },
          ].map((s, i) => (
            <div key={i} className="flex flex-col gap-1 min-w-[140px]">
              <span className="text-[10px] uppercase font-black tracking-widest opacity-40">{s.label}</span>
              <p className={cn("text-2xl font-headline font-black", s.color)}><Counter value={s.val} delay={i * 100} />{s.unit}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          <div className="lg:col-span-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-black/80 border border-primary/20 rounded-xl p-5 h-[320px]">
              <p className="text-xs font-black uppercase text-white/80 mb-4">NDVI Trend — {selectedField.crop} · {profile.city}</p>
              <ResponsiveContainer width="100%" height="70%">
                <AreaChart data={selectedField.ndviHistory}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10}} />
                  <YAxis domain={[0, 1]} axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10}} />
                  <Area type="monotone" dataKey="field" stroke="#F4A435" strokeWidth={2} fill="rgba(244,164,53,0.1)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-lg font-headline font-black text-white">Field Intelligence</h3>
              <span className="text-[11px] opacity-40 uppercase tracking-widest">{profile.city}, {profile.state}</span>
            </div>

            <div className="space-y-4">
              <AdviceBlock 
                title="Biomass Diagnosis" 
                icon={Leaf} 
                templateKey="NDVI" 
                profile={profile} 
                extras={{ ndvi: selectedField.metrics.ndvi, week: "W12", trend_direction: "declining" }} 
                refreshKey={refreshKey}
              />
              <AdviceBlock 
                title="Pathogen Analysis" 
                icon={Bug} 
                templateKey="DISEASE" 
                profile={profile} 
                extras={{ prob: selectedField.metrics.diseaseRisk, h: selectedField.metrics.humidity, t: selectedField.metrics.temp, mm: selectedField.metrics.rainfall }} 
                refreshKey={refreshKey}
              />
              <AdviceBlock 
                title="Economic Projection" 
                icon={Target} 
                templateKey="YIELD" 
                profile={profile} 
                extras={{ yield: 4200, avg: 5000 }} 
                refreshKey={refreshKey}
              />
              <AdviceBlock 
                title="Irrigation Strategy" 
                icon={CloudRain} 
                templateKey="RAINFALL" 
                profile={profile} 
                extras={{ deficit: 28, need: 42 }} 
                refreshKey={refreshKey}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

