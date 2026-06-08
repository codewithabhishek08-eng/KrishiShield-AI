"use client";

import { useState, useEffect } from 'react';
import { IntroPreloader } from '@/components/intro-preloader';
import { AppShell } from '@/components/app-shell';
import { Dashboard } from '@/components/dashboard';
import { MarketScreen } from '@/components/market';
import { SatelliteScreen } from '@/components/satellite';
import { FinanceScreen } from '@/components/finance';
import { ProfileScreen } from '@/components/profile';
import { ProfileBanner } from '@/components/profile-banner';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

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
  }, [activeTab, loading]);

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
    <>
      {loading && <IntroPreloader onComplete={() => setLoading(false)} />}
      {!loading && (
        <AppShell activeTab={activeTab} setActiveTab={setActiveTab}>
          <ProfileBanner />
          {renderContent()}
        </AppShell>
      )}
    </>
  );
}
