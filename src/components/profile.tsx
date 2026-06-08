"use client";

import React from 'react';
import { User, Settings, Shield, Bell, HelpCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function ProfileScreen() {
  const menuItems = [
    { label: 'Personal Information', icon: User },
    { label: 'Farm Settings', icon: Settings },
    { label: 'Biosecurity Protocol', icon: Shield },
    { label: 'Notification History', icon: Bell },
    { label: 'Expert Support', icon: HelpCircle },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-12 animate-in">
      <div className="flex flex-col items-center text-center space-y-4">
        <Avatar className="w-32 h-32 ring-4 ring-primary/10">
          <AvatarImage src="https://picsum.photos/seed/farmer/256/256" />
          <AvatarFallback>RK</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-3xl font-headline font-black">Ramesh Kumar</h2>
          <p className="text-sm opacity-40 font-code uppercase">FID: 8821-4409-MH</p>
        </div>
        <div className="flex gap-4">
          <div className="px-4 py-2 bg-primary/5 border border-primary/20 rounded-full">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Elite Farmer</p>
          </div>
          <div className="px-4 py-2 bg-accent/5 border border-accent/20 rounded-full">
            <p className="text-[10px] font-black uppercase tracking-widest text-accent">94 Confidence</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {menuItems.map((item, i) => (
          <button key={i} className="w-full flex items-center justify-between p-5 bg-card border border-white/5 rounded-2xl group hover:border-primary/30 transition-all">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-background border border-white/5 group-hover:scale-110 transition-transform">
                <item.icon size={18} />
              </div>
              <span className="font-medium">{item.label}</span>
            </div>
            <Shield size={16} className="opacity-0 group-hover:opacity-20 transition-opacity" />
          </button>
        ))}
      </div>

      <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 h-14 rounded-2xl">
        <LogOut size={18} className="mr-2" />
        Sign Out Securely
      </Button>
    </div>
  );
}
