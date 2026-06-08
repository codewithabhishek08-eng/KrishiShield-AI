"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Satellite, Search, Microscope, Sparkles, Map as MapIcon,
  Info, AlertTriangle, RefreshCw, Activity,
  Target, Bug, Sprout, Leaf, CloudRain, MapPin
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getProfile, buildPrompt, type UserProfile } from '@/lib/user-profile';
import { getTacticalInsight } from '@/ai/flows/tactical-insight-flow';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

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
    if (!text) return;
    const timer = setInterval(() => {
      setDisplayed(text.slice(0, i));
      i++;
      if (i > text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  return <>{displayed}<span className="inline-block w-1 h-3.5 bg-primary ml-1 animate-pulse" /></>;
}

function AdviceBlock({ title, icon: Icon, templateKey, profile, extras, refreshKey }: { title: string, icon: any, templateKey: any, profile: UserProfile, extras: any, refreshKey: number }) {
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
            <div className="h-3 bg-primary/10 rounded w-5/6" />
          </div>
        ) : (
          <p className="text-[13px] font-body text-white/70 leading-relaxed italic">
            <Typewriter text={insight} />
          </p>
        )}
      </div>
      <button onClick={() => setInternalRefresh(k => k + 1)} className="absolute bottom-2 right-2 p-1.5 text-white/20 hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
        <RefreshCw size={12} />
      </button>
    </div>
  );
}

export function SatelliteScreen() {
  const [profile, setProfile] = useState<UserProfile>(getProfile());
  const [selectedField, setSelectedField] = useState<FieldData | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [geocodingError, setGeocodingError] = useState(false);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const geocodeAndFly = useCallback(async (map: any, city: string, state: string) => {
    try {
      setGeocodingError(false);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${city},${state},India&format=json&limit=1`);
      const data = await res.json();
      if (data && data[0]) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        map.flyTo([lat, lon], 12, { duration: 2.5 });
        
        const L = require('leaflet');
        if (markerRef.current) markerRef.current.remove();
        
        const icon = L.divIcon({
          className: 'custom-icon',
          html: `<div class="w-4 h-4 bg-primary rounded-full border-2 border-white radar-pulse shadow-[0_0_15px_rgba(76,175,80,0.8)]"></div>`,
          iconSize: [16, 16]
        });

        markerRef.current = L.marker([lat, lon], { icon }).addTo(map).on('click', () => {
          setSelectedField({
            id: 'f-1',
            name: `${profile.crops[0]} Plot · ${city}`,
            crop: profile.crops[0],
            location: `${city}, ${state}`,
            metrics: { healthScore: 78, ndvi: 0.64, diseaseRisk: 22, daysToHarvest: 105, humidity: 65, temp: 29, rainfall: 14, waterNeed: 42 },
            ndviHistory: Array.from({ length: 12 }, (_, i) => ({ week: `W${i + 1}`, baseline: 0.75, field: 0.5 + Math.random() * 0.2 }))
          });
        });
      } else {
        setGeocodingError(true);
      }
    } catch (e) {
      console.error("Geocoding failed", e);
      setGeocodingError(true);
    }
  }, [profile.crops]);

  useEffect(() => {
    const handleUpdate = () => {
      const p = getProfile();
      setProfile(p);
      if (mapRef.current) geocodeAndFly(mapRef.current, p.city, p.state);
    };
    window.addEventListener('profileUpdated', handleUpdate);

    if (typeof window !== 'undefined') {
      const L = require('leaflet');
      const container = document.getElementById('satellite-map');
      if (container && !mapRef.current) {
        if ((container as any)._leaflet_id) {
          (container as any)._leaflet_id = null;
        }
        const map = L.map('satellite-map', { 
          zoomControl: false, 
          attributionControl: false,
          fadeAnimation: true,
          markerZoomAnimation: true
        }).setView([20, 78], 5);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
        mapRef.current = map;
        geocodeAndFly(map, profile.city, profile.state);
      }
    }

    return () => window.removeEventListener('profileUpdated', handleUpdate);
  }, [geocodeAndFly, profile.city, profile.state]);

  if (!selectedField) {
    return (
      <div className="relative h-[calc(100vh-120px)] w-full flex flex-col bg-[#0A0F0A]">
        <div id="satellite-map" className="flex-1 w-full" />
        <div className="absolute inset-0 flex items-center justify-center z-[1000] pointer-events-none px-6">
          <div className="bg-black/80 backdrop-blur-2xl border border-primary/30 p-10 rounded-3xl flex flex-col items-center gap-6 animate-in zoom-in-95 pointer-events-auto max-w-md text-center">
            <MapPin size={32} className="text-primary animate-bounce" />
            {geocodingError ? (
              <div className="space-y-4">
                <p className="text-lg font-bold text-red-400">Location not found.</p>
                <p className="text-sm opacity-60">Update your Profile city/state to sync satellite telemetry.</p>
              </div>
            ) : (
              <p className="text-lg font-bold text-white/80">Analysing region: <span className="text-primary" data-location="city">{profile.city}</span>. <br/>Select field marker to load intelligence.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#070D07] text-white animate-in fade-in duration-500 pb-20">
      <div id="satellite-map" className="h-[35vh] w-full border-b border-primary/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]" />
      
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
           <div className="flex flex-col">
              <h2 className="text-2xl font-headline font-black text-white">{selectedField.name}</h2>
              <div className="flex items-center gap-2 text-white/40 mt-1">
                <MapPin size={12} className="text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest">{profile.city}, {profile.state}</span>
              </div>
           </div>
           <Badge variant="outline" className="border-primary/20 text-primary uppercase text-[9px] font-black tracking-widest px-3">Live Telemetry</Badge>
        </div>

        <div className="bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: 'Field Vigor', val: selectedField.metrics.healthScore, unit: '/100', color: 'text-primary' },
            { label: 'NDVI Index', val: selectedField.metrics.ndvi, unit: '', color: 'text-amber-400' },
            { label: 'Harvest ETA', val: selectedField.metrics.daysToHarvest, unit: ' days', color: 'text-primary' },
            { label: 'Water Status', val: selectedField.metrics.rainfall, unit: 'mm', color: 'text-blue-400' },
          ].map((s, i) => (
            <div key={i} className="flex flex-col gap-1">
              <span className="text-[9px] uppercase font-black tracking-widest opacity-30">{s.label}</span>
              <p className={cn("text-2xl font-headline font-black", s.color)}><Counter value={s.val} delay={i * 100} />{s.unit}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          <div className="lg:col-span-6 bg-black/40 border border-white/5 rounded-xl p-6 h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs font-black uppercase text-white/80 tracking-widest">NDVI Trend — <span className="text-primary">{selectedField.crop}</span> in <span data-location="city">{profile.city}</span></p>
              <div className="flex gap-4">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary" /><span className="text-[9px] opacity-40 font-bold uppercase">Field</span></div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full border border-white/20" /><span className="text-[9px] opacity-40 font-bold uppercase">Baseline</span></div>
              </div>
            </div>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={selectedField.ndviHistory}>
                  <defs>
                    <linearGradient id="colorField" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4CAF50" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10}} />
                  <YAxis domain={[0, 1]} axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10}} />
                  <Area type="monotone" dataKey="field" stroke="#4CAF50" strokeWidth={2} fillOpacity={1} fill="url(#colorField)" />
                  <Area type="monotone" dataKey="baseline" stroke="rgba(255,255,255,0.1)" fill="transparent" strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Tactical Brief</h3>
              <span className="text-[9px] opacity-20 font-mono">ID: {selectedField.id}</span>
            </div>
            <AdviceBlock title="Biomass Assessment" icon={Leaf} templateKey="NDVI" profile={profile} extras={{ ndvi: selectedField.metrics.ndvi, week: "W12" }} refreshKey={refreshKey} />
            <AdviceBlock title="Disease Telemetry" icon={Bug} templateKey="DISEASE" profile={profile} extras={{ prob: selectedField.metrics.diseaseRisk }} refreshKey={refreshKey} />
            <AdviceBlock title="Yield Projection" icon={Target} templateKey="YIELD" profile={profile} extras={{ yield: 2400, avg: 1800 }} refreshKey={refreshKey} />
          </div>
        </div>
      </div>
    </div>
  );
}