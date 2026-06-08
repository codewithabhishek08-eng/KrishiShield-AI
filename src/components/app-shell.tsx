"use client";

import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ShoppingCart, Satellite, Landmark, User, Bell, Cloud, Clock } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AppShellProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function AppShell({ children, activeTab, setActiveTab }: AppShellProps) {
  const { toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll);
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(interval);
    };
  }, []);

  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'market', icon: ShoppingCart, label: 'Market' },
    { id: 'satellite', icon: Satellite, label: 'Satellite' },
    { id: 'finance', icon: Landmark, label: 'Finance' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  const handleAvatarLongPress = (e: React.MouseEvent | React.TouchEvent) => {
    // Basic long press simulation
    const timer = setTimeout(() => {
      toggleTheme();
    }, 800);
    const clearTimer = () => clearTimeout(timer);
    e.currentTarget.addEventListener('mouseup', clearTimer, { once: true });
    e.currentTarget.addEventListener('touchend', clearTimer, { once: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Desktop Navigation Rail */}
      <nav className={`hidden lg:flex flex-col items-center py-8 w-16 fixed left-0 top-0 h-screen z-50 transition-all duration-300 ${scrolled ? 'backdrop-blur-xl bg-background/30 border-r border-white/10 shadow-lg' : ''}`}>
        <div className="flex flex-col gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-3 rounded-xl transition-all duration-200 group relative ${activeTab === tab.id ? 'bg-primary text-primary-foreground scale-110 shadow-lg' : 'text-muted-foreground hover:bg-accent/10 hover:text-accent'}`}
            >
              <tab.icon size={22} />
              <span className="absolute left-full ml-4 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </nav>

      <div className="flex-1 lg:pl-16 flex flex-col min-h-screen pb-20 md:pb-0">
        {/* Context Bar */}
        <header className="sticky top-0 z-40 h-12 flex items-center justify-between px-6 backdrop-blur-md bg-background/60 border-b border-white/5">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-headline tracking-tight uppercase opacity-60">
              {activeTab}
            </h2>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-3 text-xs opacity-60">
              <div className="flex items-center gap-1.5 font-code">
                <Clock size={12} />
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="w-px h-3 bg-white/10" />
              <div className="flex items-center gap-1.5">
                <Cloud size={12} />
                28°C
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="p-1.5 rounded-full hover:bg-accent/10 transition-colors relative">
                <Bell size={18} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full border-2 border-background" />
              </button>
              <div onMouseDown={handleAvatarLongPress} onTouchStart={handleAvatarLongPress}>
                <Avatar className="w-8 h-8 ring-1 ring-white/10 cursor-pointer transition-transform active:scale-90">
                  <AvatarImage src="https://picsum.photos/seed/farmer/64/64" />
                  <AvatarFallback>RK</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 w-full h-16 bg-background/80 backdrop-blur-xl border-t border-white/5 z-50 px-4 flex items-center justify-between">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all ${activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <tab.icon size={20} className={activeTab === tab.id ? 'scale-110' : ''} />
              <span className="text-[10px] font-medium uppercase tracking-wider">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
