
"use client";

import React, { useEffect, useState } from 'react';
import { Droplets, Thermometer, Bug, Sun, Lock, Map, Landmark, Users, ChevronRight, AlertCircle, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { getAiIntelligenceFeed, type AiIntelligenceFeedOutput } from '@/ai/flows/ai-intelligence-feed-flow';

export function Dashboard() {
  const [feed, setFeed] = useState<AiIntelligenceFeedOutput>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [healthScore, setHealthScore] = useState(0);
  const targetScore = 82; // Static for now, but animated on load

  useEffect(() => {
    // 1. Fetch AI Intelligence Feed
    async function loadFeed() {
      try {
        const data = await getAiIntelligenceFeed();
        setFeed(data);
      } catch (err) {
        console.error("Failed to load feed", err);
      } finally {
        setLoadingFeed(false);
      }
    }
    loadFeed();

    // 2. Animate Score
    let current = 0;
    const interval = setInterval(() => {
      if (current < targetScore) {
        current += 1;
        setHealthScore(current);
      } else {
        clearInterval(interval);
      }
    }, 15);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (score: number) => {
    if (score > 75) return '#1B5E20'; // Green
    if (score >= 50) return '#F57C00'; // Amber
    return '#D32F2F'; // Red
  };

  const isCritical = healthScore < 50;

  const nodes = [
    { icon: Droplets, label: '84%', sub: 'Moisture', pos: 'top' },
    { icon: Thermometer, label: '22%', sub: 'Nitrogen', pos: 'right' },
    { icon: Bug, label: 'Low', sub: 'Pest Risk', pos: 'bottom' },
    { icon: Sun, label: '11h', sub: 'Sunlight', pos: 'left' },
  ];

  return (
    <div className="space-y-12 pb-12">
      {/* 1. Crop Health Orb Section */}
      <section className="flex flex-col items-center justify-center py-12 animate-in">
        <div className="relative w-[180px] h-[180px] md:w-[240px] md:h-[240px] flex items-center justify-center">
          {/* Main SVG Orb */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle 
              cx="50%" cy="50%" r="45%" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="12" 
              className="text-muted/10" 
            />
            <circle
              cx="50%" cy="50%" r="45%"
              fill="none"
              stroke={getStatusColor(healthScore)}
              strokeWidth="12"
              strokeDasharray={`${healthScore * 2.83} 283`} // 2*PI*45 approx 283
              className={`transition-all duration-1000 ease-out ${isCritical ? 'animate-pulse' : ''}`}
              style={{ 
                filter: `drop-shadow(0 0 8px ${getStatusColor(healthScore)}44)`,
              }}
            />
          </svg>

          {/* Score Display */}
          <div className="text-center z-10">
            <span className="text-5xl md:text-7xl font-headline font-black block tracking-tighter transition-colors duration-500" style={{ color: getStatusColor(healthScore) }}>
              {healthScore}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-40">Health Index</span>
          </div>

          {/* Satellite Nodes */}
          {nodes.map((node, i) => {
            const positions: Record<string, string> = {
              top: 'top-[-20px] left-1/2 -translate-x-1/2',
              right: 'right-[-20px] top-1/2 -translate-y-1/2',
              bottom: 'bottom-[-20px] left-1/2 -translate-x-1/2',
              left: 'left-[-20px] top-1/2 -translate-y-1/2',
            };
            
            return (
              <div key={i} className={`absolute flex flex-col items-center gap-1 ${positions[node.pos]}`}>
                {/* Connector Line (Decorative) */}
                <div className={`absolute bg-muted/20 ${node.pos === 'top' || node.pos === 'bottom' ? 'w-px h-6' : 'h-px w-6'} ${node.pos === 'top' ? 'bottom-full' : node.pos === 'bottom' ? 'top-full' : node.pos === 'left' ? 'right-full' : 'left-full'}`} />
                
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-card border border-white/10 flex items-center justify-center shadow-xl">
                  <node.icon size={16} className="text-primary" />
                </div>
                <div className="text-center whitespace-nowrap">
                  <span className="text-[10px] font-bold block leading-none">{node.label}</span>
                  <span className="text-[8px] uppercase opacity-40 font-medium">{node.sub}</span>
                </div>
              </div>
            );
          })}
        </div>

        {isCritical && (
          <div className="mt-8 px-6 py-2 bg-destructive/10 border border-destructive/20 rounded-full animate-bounce">
            <p className="text-xs font-bold text-destructive uppercase tracking-widest flex items-center gap-2">
              <AlertCircle size={14} /> Immediate Action Required
            </p>
          </div>
        )}
      </section>

      {/* 2. Quick Action Strip */}
      <section className="animate-in">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Lock Price', icon: Lock, color: '#1976D2' },
            { label: 'Check Satellite', icon: Map, color: '#1B5E20' },
            { label: 'Apply Loan', icon: Landmark, color: '#F57C00' },
            { label: 'Community Alert', icon: Users, color: '#D32F2F' },
          ].map((action, i) => (
            <button 
              key={i} 
              className="flex items-center justify-between p-6 bg-card border border-white/5 border-l-4 rounded-xl group hover:bg-accent/5 transition-all shadow-sm active:scale-95"
              style={{ borderLeftColor: action.color }}
            >
              <div className="flex flex-col gap-3">
                <action.icon size={32} className="opacity-80 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-xs uppercase tracking-wider text-left">{action.label}</span>
              </div>
              <ChevronRight size={16} className="opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
          ))}
        </div>
      </section>

      {/* 3. Today's Intelligence Feed */}
      <section className="animate-in">
        <div className="flex items-center justify-between mb-6 px-1">
          <h3 className="text-xs font-black uppercase tracking-[0.25em] opacity-40">Today's Intelligence Feed</h3>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            <span className="text-[9px] font-bold uppercase opacity-20">Live Sync</span>
          </div>
        </div>
        
        <div className="space-y-4">
          {loadingFeed ? (
            [1, 2, 3].map(i => (
              <div key={i} className="bg-card/50 border border-white/5 rounded-2xl p-6 space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
                <Skeleton className="h-10 w-full" />
              </div>
            ))
          ) : (
            feed.map((item, idx) => (
              <div 
                key={idx} 
                className="relative p-6 bg-card border border-white/5 rounded-2xl rounded-tl-none group hover:border-primary/30 transition-all flex flex-col gap-3 shadow-sm"
              >
                {/* Monospace Timestamp */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-code opacity-40">
                    <Clock size={12} />
                    {item.timestamp} IST
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-[9px] font-black uppercase px-2 py-0 h-5 tracking-tighter border-none ${
                      item.type === 'PRICE' ? 'bg-blue-500/10 text-blue-500' :
                      item.type === 'WEATHER' ? 'bg-orange-500/10 text-orange-500' :
                      item.type === 'DISEASE' ? 'bg-red-500/10 text-red-500' :
                      'bg-primary/10 text-primary'
                    }`}
                  >
                    {item.type}
                  </Badge>
                </div>
                
                {/* Body Content */}
                <p className="text-sm font-body leading-relaxed opacity-80">
                  {item.body}
                </p>
                
                {/* Field Mark */}
                <div className="absolute top-0 left-0 w-2 h-2 bg-muted/20 rounded-br-full" />
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

