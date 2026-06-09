"use client";

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/app-shell';
import { Dashboard } from '@/components/dashboard';
import { MarketScreen } from '@/components/market';
import { SatelliteScreen } from '@/components/satellite';
import { FinanceScreen } from '@/components/finance';
import { ProfileScreen } from '@/components/profile';
import { ProfileBanner } from '@/components/profile-banner';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const handleSetTab = (e: any) => {
      if (e.detail) setActiveTab(e.detail);
    };
    window.addEventListener('setActiveTab', handleSetTab);
    return () => window.removeEventListener('setActiveTab', handleSetTab);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      }, { threshold: 0.1 });

      document.querySelectorAll('.animate-in').forEach((el, index) => {
        (el as HTMLElement).style.transitionDelay = `${index * 80}ms`;
        observer.observe(el);
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'market': return <MarketScreen />;
      case 'satellite': return <SatelliteScreen />;
      case 'finance': return <FinanceScreen />;
      case 'profile': return <ProfileScreen />;
      default: return <Dashboard />;
    }
  };

  return (
    <AppShell activeTab={activeTab} setActiveTab={setActiveTab}>
      <ProfileBanner />
      {renderContent()}
    </AppShell>
  );
}
