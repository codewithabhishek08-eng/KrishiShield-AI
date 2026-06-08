
"use client";

import React, { useEffect, useState } from 'react';
import { Droplets, Thermometer, Bug, Sun, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import { getAiIntelligenceFeed, type AiIntelligenceFeedOutput } from '@/ai/flows/ai-intelligence-feed-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export function Dashboard() {
  const [feed, setFeed] = useState<AiIntelligenceFeedOutput>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [healthScore, setHealthScore] = useState(0);
  const targetScore = 82;

  useEffect(() => {
    async function loadFeed() {
      try {
        const data = await getAiIntelligenceFeed();
        setFeed(data);
      } catch (err) {
        console.error("Feed error:", err);
      } finally {
        setLoadingFeed(false);
      }
    }
    loadFeed();

    let current = 0;
    const interval = setInterval(() => {
      if (current < targetScore) {
        current += 1;
        setHealthScore(current);
      } else {
        clearInterval(interval);
      }
    }, 20);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (score: number) => {
    if (score > 75) return '#4CAF50'; // Green
    if (score >= 50) return '#FF9800'; // Amber
    return '#F44336'; // Red
  };

  const isCritical = healthScore < 50;

  const nodes = [
    { icon: Droplets, label: '84%', sub: 'Moisture', pos: 'top' },
    { icon: Thermometer, label: '22%', sub: 'Nitrogen', pos: 'right' },
    { icon: Bug, label: 'Low', sub: 'Pest Risk', pos: 'bottom' },
    { icon: Sun, label: '11h', sub: 'Sunlight', pos: 'left' },
  ];

  return (
    <div className="space-y-[64px] animate-in">
      {/* Hero Orb Section */}
      <section className="flex flex-col items-center justify-center py-[48px] relative">
        <div className="relative w-[180px] h-[180px] md:w-[240px] md:h-[240px] flex items-center justify-center">
          {/* Custom SVG Orb */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <defs>
              <linearGradient id="orbGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={getStatusColor(healthScore)} />
                <stop offset="100%" stopColor={getStatusColor(healthScore)} stopOpacity="0.3" />
              </linearGradient>
            </defs>
            <circle 
              cx="50%" cy="50%" r="45%" 
              fill="none" 
              stroke="rgba(255,255,255,0.03)" 
              strokeWidth="2" 
            />
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

          {/* Score Text */}
          <div className="text-center z-10 flex flex-col items-center">
            <span className="text-6xl md:text-8xl font-headline font-black tracking-tighter transition-colors duration-500" style={{ color: getStatusColor(healthScore) }}>
              {healthScore}
            </span>
            <span className="text-[10px] uppercase font-black tracking-[0.3em] opacity-40 mt-[-8px]">Index</span>
          </div>

          {/* Satellite Nodes */}
          {nodes.map((node, i) => {
            const positions: Record<string, string> = {
              top: 'top-[-32px] left-1/2 -translate-x-1/2',
              right: 'right-[-32px] top-1/2 -translate-y-1/2',
              bottom: 'bottom-[-32px] left-1/2 -translate-x-1/2',
              left: 'left-[-32px] top-1/2 -translate-y-1/2',
            };
            
            return (
              <div key={i} className={`absolute flex flex-col items-center gap-1.5 ${positions[node.pos]}`}>
                {/* Connector Line */}
                <div className={`absolute bg-white/10 ${node.pos === 'top' || node.pos === 'bottom' ? 'w-px h-8' : 'h-px w-8'} ${node.pos === 'top' ? 'bottom-full' : node.pos === 'bottom' ? 'top-full' : node.pos === 'left' ? 'right-full' : 'left-full'}`} />
                
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

        {isCritical && (
          <div className="mt-16 px-6 py-2 bg-destructive/10 border border-destructive/20 rounded-full animate-bounce">
            <p className="text-[10px] font-black text-destructive uppercase tracking-[0.2em] flex items-center gap-2">
              <AlertCircle size={14} /> Immediate Field Action
            </p>
          </div>
        )}
      </section>

      {/* Quick Action Strip */}
      <section className="animate-in">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Lock Price', icon: '/icons/lock.svg', color: '#1976D2' },
            { label: 'Check Satellite', icon: '/icons/radar.svg', color: '#4CAF50' },
            { label: 'Apply Loan', icon: '/icons/coin.svg', color: '#FF9800' },
            { label: 'Community Alert', icon: '/icons/alert.svg', color: '#F44336' },
          ].map((action, i) => (
            <button 
              key={i} 
              className="flex items-center justify-between p-6 bg-[#0A1A0A] border border-white/5 border-l-[4px] rounded-xl group hover:bg-white/5 transition-all shadow-sm active:scale-95"
              style={{ borderLeftColor: action.color }}
            >
              <div className="flex flex-col gap-4">
                <div className="text-[48px] opacity-80 group-hover:scale-110 transition-transform">
                  {/* Mock for provided 48px icons */}
                  {i === 0 && '🔒'}
                  {i === 1 && '📡'}
                  {i === 2 && '💰'}
                  {i === 3 && '📢'}
                </div>
                <span className="font-bold text-[12px] uppercase tracking-[0.1em] text-left opacity-60 group-hover:opacity-100">{action.label}</span>
              </div>
              <ChevronRight size={18} className="opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
          ))}
        </div>
      </section>

      {/* Today's Intelligence Feed */}
      <section className="animate-in">
        <div className="flex items-center justify-between mb-8 px-2">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Operational Briefing</h3>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            <span className="text-[9px] font-bold uppercase opacity-20">Live Uplink</span>
          </div>
        </div>
        
        <div className="space-y-6">
          {loadingFeed ? (
            [1, 2, 3].map(i => (
              <div key={i} className="bg-white/2 border border-white/5 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-[60px] w-full" />
              </div>
            ))
          ) : (
            feed.map((item, idx) => (
              <div 
                key={idx} 
                className="relative p-8 bg-[#0F230F] border border-white/5 rounded-2xl rounded-tl-none group hover:border-primary/20 transition-all flex flex-col gap-4 shadow-xl"
              >
                {/* Monospace Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] font-code opacity-40 font-medium tracking-tight">
                    <Clock size={12} />
                    {item.timestamp} IST
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-[9px] font-black uppercase px-2.5 py-0.5 h-6 tracking-widest border-none ${
                      item.type === 'PRICE' ? 'bg-blue-500/10 text-blue-400' :
                      item.type === 'WEATHER' ? 'bg-orange-500/10 text-orange-400' :
                      item.type === 'DISEASE' ? 'bg-red-500/10 text-red-400' :
                      'bg-primary/10 text-primary'
                    }`}
                  >
                    {item.type}
                  </Badge>
                </div>
                
                {/* Body Content */}
                <p className="text-[15px] font-body leading-relaxed text-white/80 max-w-[90%]">
                  {item.body}
                </p>
                
                {/* Decorative Field Mark */}
                <div className="absolute top-0 left-0 w-3 h-3 bg-white/5 rounded-br-3xl" />
              </div>
            ))
          )}
        </div>
      </section>

      <style jsx>{`
        @keyframes orb-pulse {
          0%, 100% { filter: drop-shadow(0 0 12px #F4433666); }
          50% { filter: drop-shadow(0 0 24px #F44336AA); }
        }
        .animate-orb-pulse {
          animation: orb-pulse 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
