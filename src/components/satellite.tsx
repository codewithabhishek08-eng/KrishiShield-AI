
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
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const geocodeAndFly = useCallback(async (map: any, city: string, state: string) => {
    try {
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
          html: `<div class="w-4 h-4 bg-primary rounded-full border-2 border-white radar-pulse"></div>`,
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
      }
    } catch (e) {
      console.error("Geocoding failed", e);
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
        if ((container as any)._leaflet_id) (container as any)._leaflet_id = null;
        const map = L.map('satellite-map', { zoomControl: false, attributionControl: false }).setView([20, 78], 5);
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
        <div className="absolute inset-0 flex items-center justify-center z-[1000] pointer-events-none">
          <div className="bg-black/60 backdrop-blur-xl border border-primary/30 p-10 rounded-3xl flex flex-col items-center gap-6 animate-in zoom-in-95 pointer-events-auto">
            <MapPin size={32} className="text-primary animate-bounce" />
            <p className="text-lg font-bold text-white/80">Analysing region: <span className="text-primary">{profile.city}</span>. Select field to load.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#070D07] text-white">
      <div id="satellite-map" className="h-[35vh] w-full border-b border-primary/10" />
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        <div className="bg-black/40 backdrop-blur-xl border border-primary/20 rounded-2xl p-6 flex flex-col md:flex-row gap-8 overflow-x-auto no-scrollbar">
          {[
            { label: 'Field Health', val: selectedField.metrics.healthScore, unit: '/100', color: 'text-primary' },
            { label: 'NDVI Score', val: selectedField.metrics.ndvi, unit: '', color: 'text-amber-400' },
            { label: 'Days to Harvest', val: selectedField.metrics.daysToHarvest, unit: ' d', color: 'text-primary' },
          ].map((s, i) => (
            <div key={i} className="flex flex-col gap-1 min-w-[140px]">
              <span className="text-[10px] uppercase font-black tracking-widest opacity-40">{s.label}</span>
              <p className={cn("text-2xl font-headline font-black", s.color)}><Counter value={s.val} delay={i * 100} />{s.unit}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          <div className="lg:col-span-6 bg-black/80 border border-primary/20 rounded-xl p-5 h-[320px]">
            <p className="text-xs font-black uppercase text-white/80 mb-4">NDVI Trend — {selectedField.crop} · <span data-location="city">{profile.city}</span></p>
            <ResponsiveContainer width="100%" height="80%">
              <AreaChart data={selectedField.ndviHistory}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10}} />
                <YAxis domain={[0, 1]} axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10}} />
                <Area type="monotone" dataKey="field" stroke="#F4A435" fill="rgba(244,164,53,0.1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-lg font-headline font-black text-white px-2">Regional Intelligence: <span data-location="city" className="text-primary">{profile.city}</span></h3>
            <AdviceBlock title="Biomass Diagnosis" icon={Leaf} templateKey="NDVI" profile={profile} extras={{ ndvi: selectedField.metrics.ndvi, week: "W12" }} refreshKey={refreshKey} />
            <AdviceBlock title="Pathogen Analysis" icon={Bug} templateKey="DISEASE" profile={profile} extras={{ prob: selectedField.metrics.diseaseRisk }} refreshKey={refreshKey} />
          </div>
        </div>
      </div>
    </div>
  );
}
