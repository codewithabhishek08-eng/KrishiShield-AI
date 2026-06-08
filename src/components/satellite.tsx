"use client";

import React, { useEffect, useRef, useState } from 'react';
import { ShieldAlert, Droplets, Microscope, AlertTriangle, Users, Info } from 'lucide-react';
import { diseaseTreatmentProtocol, type DiseaseTreatmentProtocolOutput } from '@/ai/flows/disease-treatment-protocol-flow';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function SatelliteScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [protocol, setProtocol] = useState<DiseaseTreatmentProtocolOutput>([]);
  const [loadingProtocol, setLoadingProtocol] = useState(true);
  const [alerting, setAlerting] = useState(false);

  useEffect(() => {
    // NDVI Canvas drawing
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 40;
    const cellSize = canvas.width / size;

    // Procedural field shape
    const vertices = [
      [10, 5], [30, 8], [35, 20], [32, 35], [15, 38], [5, 30], [8, 15]
    ].map(([x, y]) => [x * cellSize, y * cellSize]);

    const drawField = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw Grid with NDVI colors
      for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
          const dx = x - 12;
          const dy = y - 32;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          let color = '#2E7D32'; // Healthy
          if (dist < 8) color = '#FDD835'; // Low
          if (dist < 4) color = '#C62828'; // Stressed
          
          // Noise
          if (Math.random() > 0.95) color = '#FFEB3B';

          ctx.fillStyle = color;
          ctx.globalAlpha = 0.8;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);
        }
      }

      // Clip field shape
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(vertices[0][0], vertices[0][1]);
      vertices.slice(1).forEach(v => ctx.lineTo(v[0], v[1]));
      ctx.closePath();
      ctx.stroke();

      // Stress Patch Animation
      const time = Date.now() * 0.005;
      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = -time;
      ctx.strokeStyle = '#D32F2F';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(12 * cellSize, 32 * cellSize, 4 * cellSize, 0, Math.PI * 2);
      ctx.stroke();
    };

    const animate = () => {
      drawField();
      requestAnimationFrame(animate);
    };
    animate();

    // AI Protocol
    const loadProtocol = async () => {
      try {
        const data = await diseaseTreatmentProtocol({ 
          diseaseName: 'Alternaria solani (Early Blight)', 
          cropAndLocation: 'tomatoes in Nasik, MH' 
        });
        setProtocol(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingProtocol(false);
      }
    };
    loadProtocol();
  }, []);

  const diagnosticTimeline = [
    { title: 'Alternaria solani detected', sub: 'High severity spore density found in south-west quadrant', icon: ShieldAlert, color: 'text-destructive', bg: 'bg-destructive/10', conf: '89%' },
    { title: 'Humidity correlation', sub: '78% RH exceeds threshold for active sporulation', icon: Droplets, color: 'text-accent', bg: 'bg-accent/10', conf: '94%' },
    { title: 'Health trajectory', sub: 'Projected 35% decline in yield over 14 days without action', icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10', conf: 'Critical' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Panel: Field Map */}
      <div className="space-y-6 animate-in">
        <div className="bg-card border border-white/5 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-headline font-black text-lg">NDVI Analysis</h3>
            <Badge variant="outline">Live Feed</Badge>
          </div>
          <div className="p-4 bg-[#0F1123]">
            <canvas ref={canvasRef} width={800} height={800} className="w-full aspect-square rounded-xl" />
          </div>
          <div className="p-6 bg-card flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            {[
              { label: 'Stressed', color: '#C62828' },
              { label: 'Low', color: '#FDD835' },
              { label: 'Moderate', color: '#FFEB3B' },
              { label: 'Good', color: '#4CAF50' },
              { label: 'Excellent', color: '#2E7D32' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2 min-w-fit">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
                <span className="text-[10px] uppercase font-bold opacity-40">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel: Diagnostic Report */}
      <div className="space-y-8 animate-in">
        <section className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 px-1">Diagnostic Findings</h4>
          <div className="space-y-4">
            {diagnosticTimeline.map((item, i) => (
              <div key={i} className="flex gap-4 p-4 bg-card border border-white/5 rounded-2xl group hover:border-primary/20 transition-all">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.bg} ${item.color}`}>
                  <item.icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="font-bold text-sm truncate">{item.title}</h5>
                    <span className="text-[10px] font-code opacity-40">{item.conf}</span>
                  </div>
                  <p className="text-xs opacity-60 leading-relaxed">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 px-1">AI Treatment Protocol</h4>
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 space-y-6">
            {loadingProtocol ? (
              <div className="space-y-4">
                <div className="h-4 w-3/4 bg-primary/10 rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-primary/10 rounded animate-pulse" />
              </div>
            ) : (
              protocol.map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
                    {step.step_number}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h5 className="text-xs font-black uppercase tracking-wide">{step.action}</h5>
                      <span className={`text-[9px] font-bold px-1.5 rounded uppercase ${step.urgency === 'immediate' ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent'}`}>
                        {step.urgency}
                      </span>
                    </div>
                    <p className="text-xs opacity-60">{step.detail}</p>
                  </div>
                </div>
              ))
            )}
            
            <Button 
              onClick={() => setAlerting(true)} 
              disabled={alerting}
              className="w-full mt-4 h-11 bg-destructive hover:bg-destructive/90 text-white border-none shadow-lg relative overflow-hidden"
            >
              <div className="flex items-center justify-center gap-2 z-10">
                <Users size={18} />
                {alerting ? 'Alerting Community...' : 'Issue Community Alert'}
              </div>
              {alerting && (
                <div className="absolute inset-0 bg-white/10 flex items-center justify-center">
                  <div className="w-full h-full border-4 border-transparent border-t-white/30 rounded-full animate-spin scale-[4]" />
                </div>
              )}
            </Button>
            
            {alerting && (
              <div className="animate-in pt-4 space-y-3">
                <div className="flex items-center gap-3 text-xs opacity-60">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
                  Alerting 23 nearby tomato farmers...
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="w-6 h-6 rounded-full bg-card border border-white/10 overflow-hidden animate-bounce" style={{ animationDelay: `${i * 120}ms` }}>
                      <img src={`https://picsum.photos/seed/${i + 20}/32/32`} alt="farm" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
