"use client";

import React, { useEffect, useState } from 'react';
import { Droplets, Thermometer, Bug, Sun, Lock, Map, Landmark, Users, ChevronRight } from 'lucide-react';
import { getAiIntelligenceFeed, type AiIntelligenceFeedOutput } from '@/ai/flows/ai-intelligence-feed-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export function Dashboard() {
  const [feed, setFeed] = useState<AiIntelligenceFeedOutput>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [healthScore, setHealthScore] = useState(0);

  useEffect(() => {
    const loadFeed = async () => {
      try {
        const data = await getAiIntelligenceFeed();
        setFeed(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingFeed(false);
      }
    };
    loadFeed();

    // Animate score
    const target = 82;
    let current = 0;
    const interval = setInterval(() => {
      if (current < target) {
        current += 1;
        setHealthScore(current);
      } else {
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (score: number) => {
    if (score > 75) return '#1B5E20';
    if (score > 50) return '#F57C00';
    return '#D32F2F';
  };

  const nodes = [
    { icon: Droplets, label: '84%', sub: 'Moisture', pos: 'top' },
    { icon: Thermometer, label: '22%', sub: 'Nitrogen', pos: 'right' },
    { icon: Bug, label: 'Low', sub: 'Pest Risk', pos: 'bottom' },
    { icon: Sun, label: '11h', sub: 'Sunlight', pos: 'left' },
  ];

  return (
    <div className="space-y-12">
      {/* Health Orb Section */}
      <section className="flex flex-col items-center justify-center py-8 animate-in">
        <div className="relative w-[280px] h-[280px] md:w-[340px] md:h-[340px] flex items-center justify-center">
          {/* Main Orb */}
          <div className="relative w-48 h-48 md:w-60 md:h-60 rounded-full flex items-center justify-center shadow-2xl overflow-hidden group">
            <svg className="absolute inset-0 w-full h-full rotate-[-90deg]">
              <circle
                cx="50%" cy="50%" r="48%"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/10"
              />
              <circle
                cx="50%" cy="50%" r="48%"
                fill="none"
                stroke={getStatusColor(healthScore)}
                strokeWidth="8"
                strokeDasharray={`${healthScore * 3} 300`}
                className="transition-all duration-1000 ease-out"
                style={{ filter: 'drop-shadow(0 0 8px currentColor)' }}
              />
            </svg>
            <div className="text-center">
              <span className="text-5xl md:text-6xl font-headline font-black block tracking-tighter">
                {healthScore}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest opacity-40">
                Health Index
              </span>
            </div>
          </div>

          {/* Satellite Nodes */}
          {nodes.map((node, i) => {
            const styles: Record<string, string> = {
              top: 'top-0 left-1/2 -translate-x-1/2',
              right: 'right-0 top-1/2 -translate-y-1/2',
              bottom: 'bottom-0 left-1/2 -translate-x-1/2',
              left: 'left-0 top-1/2 -translate-y-1/2',
            };
            return (
              <div key={i} className={`absolute flex flex-col items-center gap-1 ${styles[node.pos]}`}>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-card border border-white/10 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <node.icon size={18} className="text-primary" />
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold block">{node.label}</span>
                  <span className="text-[9px] uppercase opacity-40 font-medium">{node.sub}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick Action Strip */}
      <section className="animate-in">
        <h3 className="text-xs font-bold uppercase tracking-widest opacity-40 mb-4 px-1">Control Panel</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Lock Price', icon: Lock, color: '#1976D2' },
            { label: 'Check Satellite', icon: Map, color: '#1B5E20' },
            { label: 'Apply Loan', icon: Landmark, color: '#F57C00' },
            { label: 'Community Alert', icon: Users, color: '#D32F2F' },
          ].map((action, i) => (
            <button key={i} className="flex items-center justify-between p-4 bg-card border-l-4 border-white/5 rounded-lg group hover:bg-accent/5 transition-all">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-background border border-white/5 group-hover:scale-110 transition-transform">
                  <action.icon size={20} />
                </div>
                <span className="font-medium text-sm text-left">{action.label}</span>
              </div>
              <ChevronRight size={16} className="opacity-20 group-hover:opacity-100 transition-opacity" />
              <style jsx>{`
                button { border-left-color: ${action.color}; }
              `}</style>
            </button>
          ))}
        </div>
      </section>

      {/* Intelligence Feed */}
      <section className="animate-in">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">Intelligence Feed</h3>
          <span className="text-[10px] font-medium opacity-20">Live Sync</span>
        </div>
        <div className="space-y-4">
          {loadingFeed ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl bg-card" />)
          ) : (
            feed.map((item, i) => (
              <div key={i} className="relative pl-6 py-4 bg-card border border-white/5 rounded-2xl group hover:border-primary/30 transition-all">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary/20 rounded-l-2xl group-hover:bg-primary transition-colors" />
                <div className="flex items-center justify-between mb-2 pr-4">
                  <span className="text-[10px] font-code opacity-40">{item.timestamp} IST</span>
                  <Badge variant="secondary" className="text-[9px] px-2 py-0 h-4 uppercase font-bold">
                    {item.type}
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed max-w-2xl opacity-80">
                  {item.body}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
