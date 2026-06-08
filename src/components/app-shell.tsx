
"use client";

import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ShoppingCart, Satellite, Landmark, User, Bell, RefreshCw, LogOut, Settings, Globe } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function AppShell({ children, activeTab, setActiveTab }: AppShellProps) {
  const [time, setTime] = useState(new Date());
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    const loadAvatar = () => {
      if (typeof window !== 'undefined') {
        setAvatarImage(localStorage.getItem('profileImage'));
      }
    };
    loadAvatar();
    window.addEventListener('profileUpdated', loadAvatar);
    return () => {
      clearInterval(interval);
      window.removeEventListener('profileUpdated', loadAvatar);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
    window.location.reload();
  };

  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'market', icon: ShoppingCart, label: 'Market' },
    { id: 'satellite', icon: Satellite, label: 'Satellite' },
    { id: 'finance', icon: Landmark, label: 'Finance' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  const notifications = [
    { id: 1, type: 'DISEASE', title: 'Early Blight Alert', time: '10m ago', color: '#D32F2F' },
    { id: 2, type: 'PRICE', title: 'Price Lock Available', time: '1h ago', color: '#1976D2' },
    { id: 3, type: 'WEATHER', title: 'Humidity Spike Detected', time: '3h ago', color: '#F57C00' },
  ];

  return (
    <div className="min-h-screen bg-[#0D1F0D] text-white flex flex-col lg:flex-row font-body selection:bg-primary/30">
      {/* Desktop Left Rail */}
      <nav className="hidden lg:flex flex-col items-center py-8 w-[72px] fixed left-0 top-0 h-screen z-50 bg-[#0A1A0A]/96 border-r border-white/5">
        <div className="flex flex-col gap-[32px] flex-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "p-3 rounded-lg transition-all duration-150 group relative flex items-center justify-center",
                activeTab === tab.id 
                  ? 'bg-primary/15 text-white border-l-[3px] border-primary' 
                  : 'text-white/40 hover:bg-white/5 hover:text-white hover:scale-110'
              )}
            >
              <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
              <span className="absolute left-full ml-4 px-2 py-1 bg-[#0F230F] text-white text-[10px] font-bold uppercase tracking-widest rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* User Avatar */}
        <div className="relative mt-auto">
          <button 
            onClick={() => setActiveTab('profile')}
            className="w-10 h-10 rounded-full bg-[#1B5E20] border border-white/10 flex items-center justify-center text-[12px] font-medium transition-transform active:scale-90 hover:ring-2 hover:ring-primary/50 overflow-hidden"
          >
            {avatarImage ? (
              <img src={avatarImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              'RK'
            )}
          </button>
        </div>
      </nav>

      <div className="flex-1 lg:pl-[72px] flex flex-col min-h-screen relative">
        {/* Top Context Bar */}
        <header className="sticky top-0 z-40 h-[56px] flex items-center justify-between px-6 bg-[#0D1F0D]/85 backdrop-blur-xl saturate-[1.3] border-b border-white/5">
          <div className="flex items-center gap-3">
            <span className="text-[15px] font-normal text-white/70">KrishiShield AI</span>
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse-scale shadow-[0_0_8px_rgba(76,175,80,0.5)]" />
          </div>
          
          <div className="hidden sm:block">
            <span className="text-[13px] font-light text-white/40 font-code tabular-nums uppercase tracking-tight">
              {time.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · {time.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="flex items-center gap-4 relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-white/60 hover:text-white transition-colors relative"
            >
              <Bell size={20} />
              <div className="absolute top-2 right-2 w-[6px] h-[6px] bg-destructive rounded-full" />
            </button>
            <button 
              onClick={handleRefresh}
              className={`p-2 text-white/60 hover:text-white transition-colors ${refreshing ? 'animate-spin' : ''}`}
            >
              <RefreshCw size={20} />
            </button>

            {showNotifications && (
              <div className="absolute top-[48px] right-0 w-[300px] bg-[#0F230F]/98 border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-3 border-b border-white/5 bg-white/5">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">System Alerts</span>
                </div>
                {notifications.map((n) => (
                  <div key={n.id} className="p-4 flex flex-col gap-1 border-l-4 hover:bg-white/5 transition-colors cursor-pointer" style={{ borderLeftColor: n.color }}>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-white/40">{n.type}</span>
                      <span className="text-[9px] opacity-20">{n.time}</span>
                    </div>
                    <span className="text-sm font-medium">{n.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-[1200px] mx-auto px-6 py-8">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 w-full h-[64px] bg-[#0A1A0A] border-t border-white/5 z-50 flex items-center justify-around">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 flex-1 h-full transition-all",
                activeTab === tab.id ? 'text-primary' : 'text-white/40'
              )}
            >
              <tab.icon size={20} className={activeTab === tab.id ? 'scale-110' : ''} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
              <span className="text-[9px] font-bold uppercase tracking-widest">{tab.label}</span>
              {activeTab === tab.id && <div className="w-1 h-1 bg-primary rounded-full" />}
            </button>
          ))}
        </nav>
      </div>

      <style jsx global>{`
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.7; }
        }
        .animate-pulse-scale {
          animation: pulse-scale 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
