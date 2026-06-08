
"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  ShieldAlert, Droplets, Microscope, AlertTriangle, Users, 
  Clock, Eye, Edit3, Send, Satellite, RefreshCw, Calendar,
  ChevronDown, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine, Area 
} from 'recharts';
import { diseaseTreatmentProtocol, type DiseaseTreatmentProtocolOutput } from '@/ai/flows/disease-treatment-protocol-flow';

// --- NDVI GRID CONSTANTS ---
const GRID_SIZE = 48;
const BASE_NDVI = new Float32Array(GRID_SIZE * GRID_SIZE);
for (let i = 0; i < BASE_NDVI.length; i++) {
  // Base health is high (0.65 - 0.85)
  BASE_NDVI[i] = 0.65 + Math.random() * 0.2;
}

// Inject Disease Zone (North-East Patch)
for (let y = 5; y < 15; y++) {
  for (let x = 30; x < 45; x++) {
    BASE_NDVI[y * GRID_SIZE + x] = 0.3 + Math.random() * 0.2;
  }
}

// Inject Irrigation Shadow (Bottom Strip)
for (let y = 44; y < 48; y++) {
  for (let x = 0; x < GRID_SIZE; x++) {
    BASE_NDVI[y * GRID_SIZE + x] = 0.1 + Math.random() * 0.15;
  }
}

export function SatelliteScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewMode, setViewMode] = useState<'NDVI' | 'RGB' | 'Thermal'>('NDVI');
  const [protocol, setProtocol] = useState<DiseaseTreatmentProtocolOutput>([]);
  const [loadingProtocol, setLoadingProtocol] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [hoverData, setHoverData] = useState<{ x: number, y: number, val: number, visible: boolean }>({ x: 0, y: 0, val: 0, visible: false });
  const [layers, setLayers] = useState({ disease: true, irrigation: true, boundary: true });

  const dashOffsetRef = useRef(0);

  // --- LERP COLOR FUNCTION ---
  const lerpColor = (a: number[], b: number[], t: number) => {
    return a.map((val, i) => Math.round(val + (b[i] - val) * t));
  };

  const getNDVIColor = (v: number, mode: 'NDVI' | 'RGB' | 'Thermal') => {
    if (mode === 'RGB') {
      // Mock RGB mapping (warm tones)
      if (v > 0.6) return 'rgb(46, 125, 50)';
      if (v > 0.4) return 'rgb(139, 195, 74)';
      return 'rgb(121, 85, 72)';
    }
    if (mode === 'Thermal') {
      // Thermal map (blue to red)
      const r = Math.round(v * 255);
      const b = Math.round((1 - v) * 255);
      return `rgb(${r}, 50, ${b})`;
    }

    // Standard NDVI Mapping
    if (v < 0.2) return 'rgb(165,0,38)';
    if (v < 0.4) return 'rgb(244,109,67)';
    if (v < 0.6) return 'rgb(254,224,139)';
    if (v < 0.75) return 'rgb(166,217,106)';
    return 'rgb(0,104,55)';
  };

  // --- DRAWING LOGIC ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cellSize = w / GRID_SIZE;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#060E06';
      ctx.fillRect(0, 0, w, h);

      // Define irregular polygon field shape
      const vertices = [
        [w * 0.1, h * 0.1],
        [w * 0.8, h * 0.15],
        [w * 0.95, h * 0.6],
        [w * 0.85, h * 0.9],
        [w * 0.4, h * 0.95],
        [w * 0.05, h * 0.7],
      ];

      ctx.save();
      if (layers.boundary) {
        ctx.beginPath();
        ctx.moveTo(vertices[0][0], vertices[0][1]);
        vertices.slice(1).forEach(v => ctx.lineTo(v[0], v[1]));
        ctx.closePath();
        ctx.clip();
      }

      // Draw Grid
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const val = BASE_NDVI[y * GRID_SIZE + x];
          ctx.fillStyle = getNDVIColor(val, viewMode);
          ctx.fillRect(x * cellSize, y * cellSize, Math.ceil(cellSize), Math.ceil(cellSize));
        }
      }
      ctx.restore();

      // Disease Zone Overlay (Animated Crawling Border)
      if (layers.disease) {
        ctx.strokeStyle = 'rgba(239,83,80,0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = -dashOffsetRef.current;
        ctx.strokeRect(30 * cellSize, 5 * cellSize, 15 * cellSize, 10 * cellSize);
        dashOffsetRef.current += 0.3;
      }

      // Irrigation zone highlight
      if (layers.irrigation) {
        ctx.fillStyle = 'rgba(239,83,80,0.1)';
        ctx.fillRect(0, 44 * cellSize, w, 4 * cellSize);
      }

      // Boundary outline
      if (layers.boundary) {
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(vertices[0][0], vertices[0][1]);
        vertices.slice(1).forEach(v => ctx.lineTo(v[0], v[1]));
        ctx.closePath();
        ctx.stroke();
      }

      // Compass Rose
      ctx.save();
      ctx.translate(w - 40, 40);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.moveTo(0, -15); ctx.lineTo(0, 15);
      ctx.moveTo(-15, 0); ctx.lineTo(15, 0);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px Inter';
      ctx.fillText('N', -4, -18);
      ctx.restore();

      // Scale Bar
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(20, h - 30, 100, 1);
      ctx.font = '10px Inter';
      ctx.fillText('0 — 500m', 20, h - 15);

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationFrameId);
  }, [viewMode, layers]);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await diseaseTreatmentProtocol({ 
          diseaseName: 'Early Blight', 
          cropAndLocation: 'Tomato, Nasik' 
        });
        setProtocol(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingProtocol(false);
      }
    }
    loadData();
  }, []);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 1500);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const gridX = Math.floor((x / rect.width) * GRID_SIZE);
    const gridY = Math.floor((y / rect.height) * GRID_SIZE);
    const val = BASE_NDVI[gridY * GRID_SIZE + gridX];

    setHoverData({ x, y, val, visible: true });
    setTimeout(() => setHoverData(prev => ({ ...prev, visible: false })), 3000);
  };

  const healthData = [
    { day: -30, health: 85 },
    { day: -20, health: 82 },
    { day: -10, health: 78 },
    { day: 0, health: 74, isToday: true },
    { day: 10, with: 76, without: 65 },
    { day: 20, with: 80, without: 55 },
    { day: 30, with: 84, without: 45 },
  ];

  return (
    <div className="space-y-8 animate-in pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-headline font-black text-white flex items-center gap-3">
            Field Intelligence
          </h2>
          <p className="text-[13px] opacity-40 font-body flex items-center gap-2">
            <Satellite size={14} className="opacity-40" />
            Sentinel-2 · Last sync 2h ago
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSync}
            className="bg-white/5 border-white/10 hover:bg-white/10 text-white gap-2 h-9"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
            <Calendar size={14} className="opacity-40" />
            <span className="text-[13px] font-medium">07 Jun 2026</span>
            <ChevronDown size={14} className="opacity-40" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Panel: Heatmap */}
        <div className="lg:col-span-7 bg-white/[0.03] border border-white/7 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/70">NDVI Heatmap</h3>
            <div className="flex p-0.5 bg-white/5 rounded-lg border border-white/10">
              {['NDVI', 'RGB', 'Thermal'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
                    viewMode === mode ? 'bg-primary/20 text-primary border border-primary/30' : 'text-white/40'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex-1 bg-[#060E06] p-4">
            <canvas 
              ref={canvasRef} 
              width={800} height={800} 
              onClick={handleCanvasClick}
              className="w-full aspect-square cursor-crosshair rounded-xl" 
            />
            {hoverData.visible && (
              <div 
                className="absolute z-50 pointer-events-none bg-[#0A1A0A]/95 border border-white/10 p-3 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                style={{ left: hoverData.x, top: hoverData.y }}
              >
                <p className="text-sm font-bold text-white">NDVI: {hoverData.val.toFixed(2)}</p>
                <p className="text-[10px] uppercase font-black tracking-widest text-orange-400 mt-1">Moderate Stress</p>
                <div className="mt-2 pt-2 border-t border-white/5 text-[9px] opacity-30 font-code">
                  FIELD_CELL_X{Math.floor(hoverData.x/10)}_Y{Math.floor(hoverData.y/10)}
                </div>
              </div>
            )}
          </div>

          <div className="p-5 bg-card/20 space-y-6">
            <div className="flex flex-wrap items-center gap-4 opacity-50">
              {['Severe', 'Critical', 'Moderate', 'Good', 'Peak'].map((label, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getNDVIColor(i * 0.2 + 0.1, 'NDVI') }} />
                  <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-8 pt-4 border-t border-white/5">
              {[
                { id: 'disease', label: 'Disease Overlay' },
                { id: 'irrigation', label: 'Irrigation Zones' },
                { id: 'boundary', label: 'Field Boundary' }
              ].map((layer) => (
                <div key={layer.id} className="flex items-center gap-3">
                  <button 
                    onClick={() => setLayers(prev => ({ ...prev, [layer.id]: !prev[layer.id as keyof typeof layers] }))}
                    className={`w-8 h-4.5 rounded-full relative transition-colors ${layers[layer.id as keyof typeof layers] ? 'bg-primary' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all ${layers[layer.id as keyof typeof layers] ? 'left-4' : 'left-0.5'}`} />
                  </button>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-white/40">{layer.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel: Report */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white/[0.03] border border-white/7 rounded-2xl p-6 space-y-8 flex-1">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/70">Disease Report</h3>
              <span className="text-[10px] italic opacity-30">AI-generated · Groq</span>
            </div>

            {/* Severity Meter */}
            <div className="space-y-3">
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest">
                <span className="opacity-40">Field Health</span>
                <span className="text-primary">62% Healthy</span>
              </div>
              <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-primary/20" />
                <div 
                  className="h-full bg-primary relative transition-all duration-1000 ease-out" 
                  style={{ width: '62%' }} 
                />
              </div>
              <div className="flex justify-between px-1 opacity-20">
                {[1, 2, 3].map(i => <div key={i} className="w-px h-1.5 bg-white" />)}
              </div>
            </div>

            {/* Findings Timeline */}
            <div className="space-y-6 relative pl-6">
              <div className="absolute left-[3px] top-2 bottom-2 w-px bg-white/10" />
              {[
                { title: 'Alternaria solani detected', detail: 'Early blight pathogen across 11% of field.', color: 'text-red-400', confidence: '89%', dot: 'bg-red-400' },
                { title: 'Humidity correlation active', detail: '78% RH acceleratng spore spread.', color: 'text-orange-400', confidence: '94%', dot: 'bg-orange-400' },
                { title: 'Inaction risk alert', detail: 'Projected 45% health dip in 18 days.', color: 'text-red-400', confidence: 'Critical', dot: 'bg-red-400 animate-pulse' },
              ].map((f, i) => (
                <div key={i} className="relative animate-in" style={{ animationDelay: `${i * 120}ms` }}>
                  <div className={`absolute -left-[27px] top-1.5 w-2 h-2 rounded-full ${f.dot} ring-4 ring-black`} />
                  <div className="flex justify-between items-start">
                    <h4 className="text-[13px] font-bold">{f.title}</h4>
                    <Badge variant="outline" className={`text-[9px] uppercase border-white/5 ${f.color} bg-white/5`}>{f.confidence}</Badge>
                  </div>
                  <p className="text-[11px] opacity-40 mt-1 leading-relaxed">{f.detail}</p>
                </div>
              ))}
            </div>

            {/* Treatment Protocol */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Protocol Execution</h4>
              {loadingProtocol ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full bg-white/5" />)}
                </div>
              ) : (
                protocol.map((step, i) => (
                  <div key={i} className="flex gap-4 animate-in" style={{ animationDelay: `${i * 80}ms` }}>
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[11px] font-black shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <span className="text-[12px] font-bold">{step.action}</span>
                        <span className="text-[9px] opacity-30 font-mono">~₹{step.cost_inr}</span>
                      </div>
                      <p className="text-[10px] opacity-40 leading-relaxed truncate">{step.detail}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[8px] bg-white/5 border-none text-teal-400">{step.product}</Badge>
                        {step.urgency === 'immediate' && <Clock size={10} className="text-red-400" />}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Health Projection Chart */}
          <div className="bg-white/[0.03] border border-white/7 rounded-2xl p-6 h-[200px] flex flex-col">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 mb-4">Field Health Projections</h4>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={healthData}>
                  <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="day" hide />
                  <YAxis domain={[0, 100]} hide />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#0C1C0C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }}
                    labelStyle={{ display: 'none' }}
                  />
                  <Line type="monotone" dataKey="health" stroke="#4CAF50" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="with" stroke="#4CAF50" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                  <Line type="monotone" dataKey="without" stroke="#EF5350" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                  <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between mt-2 px-1">
              <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest">No Treatment (45%)</span>
              <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Target Recovery (84%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Community Alert Card */}
      <div className="bg-red-500/[0.03] border border-red-500/15 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-10 shadow-inner">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <h3 className="text-lg font-headline font-black uppercase tracking-tight">Regional Outbreak Alert</h3>
          </div>
          <p className="text-sm opacity-50 leading-relaxed max-w-xl">
            Early blight detected in 7 neighboring farms within a 12km radius. 
            Automated community-wide protocol activation is recommended to prevent mass spore dispersal.
          </p>
          <div className="pt-4 flex flex-col items-start gap-4">
            <Button 
              onClick={() => setShowModal(true)}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 h-14 px-10 rounded-xl font-bold uppercase tracking-widest transition-all"
            >
              <Users size={18} className="mr-3" />
              Broadcast Community Alert
            </Button>
            <span className="text-[11px] opacity-30 uppercase font-black tracking-[0.2em]">47 farmers protected this season</span>
          </div>
        </div>

        {/* Mini Map Visual */}
        <div className="w-full md:w-64 h-48 bg-black/40 rounded-2xl border border-white/5 relative overflow-hidden flex items-center justify-center p-4">
          <div className="grid grid-cols-5 gap-4 opacity-40">
            {Array.from({ length: 25 }).map((_, i) => (
              <div 
                key={i} 
                className={`w-1.5 h-1.5 rounded-full ${
                  i === 12 ? 'bg-white scale-150 shadow-[0_0_10px_white]' : 
                  [2, 8, 11, 19, 23].includes(i) ? 'bg-red-500 animate-pulse' : 'bg-primary'
                }`} 
              />
            ))}
          </div>
          {/* Mock Connection Lines */}
          <svg className="absolute inset-0 pointer-events-none opacity-20">
            <line x1="50%" y1="50%" x2="20%" y2="20%" stroke="red" strokeWidth="0.5" />
            <line x1="50%" y1="50%" x2="80%" y2="80%" stroke="red" strokeWidth="0.5" />
            <line x1="50%" y1="50%" x2="10%" y2="70%" stroke="red" strokeWidth="0.5" />
          </svg>
        </div>
      </div>

      {/* Community Alert Preview Modal (Simulated) */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md bg-[#0D1F0D] border border-white/10 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <AlertTriangle className="text-red-500" />
              Confirm Community Alert
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="bg-red-500/10 p-5 rounded-2xl border border-red-500/20">
              <p className="text-sm italic text-red-100/70">
                "Bhaiyo, hamare khet mein Early Blight detected hua hai. Sentinel-2 satellite alerts show risk is spreading. Please check your fields and use the KrishiShield protocol immediately to stop the spread."
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase font-black opacity-30">Broadcasting to:</span>
              <div className="flex -space-x-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0D1F0D] bg-primary/40 flex items-center justify-center text-[10px] font-bold">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
                <div className="w-8 h-8 rounded-full border-2 border-[#0D1F0D] bg-white/5 flex items-center justify-center text-[10px] opacity-40">+18</div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-between pt-4">
            <Button variant="ghost" onClick={() => setShowModal(false)} className="flex-1 rounded-xl">Discard</Button>
            <Button onClick={() => setShowModal(false)} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl">
              <Send size={16} className="mr-2" />
              Send Alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
