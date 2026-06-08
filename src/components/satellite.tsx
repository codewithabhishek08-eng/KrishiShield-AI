
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { ShieldAlert, Droplets, Microscope, AlertTriangle, Users, Clock, Eye, Edit3, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface ProtocolStep {
  step: number;
  action: string;
  detail: string;
  product: string;
  urgency: 'immediate' | 'within_48h' | 'monitor';
  estimated_cost_inr: number;
}

interface CommunityAlert {
  subject: string;
  message: string;
  recommended_action: string;
  severity: 'high' | 'medium';
}

export function SatelliteScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [protocol, setProtocol] = useState<ProtocolStep[]>([]);
  const [loadingProtocol, setLoadingProtocol] = useState(true);
  const [alertPreview, setAlertPreview] = useState<CommunityAlert | null>(null);
  const [loadingAlert, setLoadingAlert] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editableMessage, setEditableMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // NDVI Canvas drawing (Keep existing logic)
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = 40;
    const cellSize = canvas.width / size;
    const vertices = [[10, 5], [30, 8], [35, 20], [32, 35], [15, 38], [5, 30], [8, 15]].map(([x, y]) => [x * cellSize, y * cellSize]);

    const drawField = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
          const dx = x - 12; const dy = y - 32; const dist = Math.sqrt(dx * dx + dy * dy);
          let color = '#2E7D32'; if (dist < 8) color = '#FDD835'; if (dist < 4) color = '#C62828';
          ctx.fillStyle = color; ctx.globalAlpha = 0.8; ctx.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);
        }
      }
      ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(vertices[0][0], vertices[0][1]); vertices.slice(1).forEach(v => ctx.lineTo(v[0], v[1])); ctx.closePath(); ctx.stroke();
      const time = Date.now() * 0.005; ctx.setLineDash([5, 5]); ctx.lineDashOffset = -time; ctx.strokeStyle = '#D32F2F'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(12 * cellSize, 32 * cellSize, 4 * cellSize, 0, Math.PI * 2); ctx.stroke();
    };

    const animate = () => { drawField(); requestAnimationFrame(animate); };
    animate();

    // AI Protocol
    const loadProtocol = async () => {
      try {
        const res = await fetch('/api/groq', {
          method: 'POST',
          body: JSON.stringify({
            system: "You are a plant pathologist and agronomist advising smallholder tomato farmers in Maharashtra, India. Respond ONLY in valid JSON.",
            user: "Disease: Alternaria solani (Early Blight). Stage: early detection, 11% field coverage. Weather: 78% RH, 28°C. Farmer budget constraint: medium. Provide 3 treatment steps ordered by urgency. Include specific fungicide product names available in Maharashtra markets.",
            opts: {
              json: true,
              temperature: 0.2,
              cacheKey: 'protocol-nasik-tomato-blight',
              cacheTTL: 3600 // 60 minutes
            }
          })
        });
        const data = await res.json();
        setProtocol(data.protocol || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingProtocol(false);
      }
    };
    loadProtocol();
  }, []);

  const handleComposeAlert = async () => {
    setLoadingAlert(true);
    try {
      const res = await fetch('/api/groq', {
        method: 'POST',
        body: JSON.stringify({
          system: "You are writing an agricultural community alert in Marathi-influenced Hindi (Hinglish). Keep it short, urgent, and brotherly. Respond in JSON.",
          user: "Disease alert: Alternaria solani detected in tomato field in Pathardi village, Nasik. Field health: 82%. Detected: 2 hours ago. Write a community alert to nearby farmers.",
          opts: {
            json: true,
            temperature: 0.55
          }
        })
      });
      const data = await res.json();
      setAlertPreview(data);
      setEditableMessage(data.message);
      setShowModal(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAlert(false);
    }
  };

  const handleSendAlert = () => {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setShowModal(false);
    }, 2000);
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'immediate': return <Clock size={12} className="text-destructive" />;
      case 'within_48h': return <Clock size={12} className="text-orange-500" />;
      case 'monitor': return <Eye size={12} className="text-primary" />;
      default: return null;
    }
  };

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
            {[{ label: 'Stressed', color: '#C62828' }, { label: 'Low', color: '#FDD835' }, { label: 'Moderate', color: '#FFEB3B' }, { label: 'Good', color: '#4CAF50' }, { label: 'Excellent', color: '#2E7D32' }].map((s, i) => (
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
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 px-1">AI Treatment Protocol</h4>
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 space-y-6 relative">
            {loadingProtocol ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded-xl" />)}
              </div>
            ) : (
              protocol.map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                    {step.step}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-bold uppercase tracking-tight">{step.action}</h5>
                      <span className="text-[10px] opacity-40">₹{step.estimated_cost_inr}</span>
                    </div>
                    <p className="text-xs opacity-60 leading-relaxed mb-2">{step.detail}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] bg-accent/5 border-accent/20 text-accent">
                        {step.product}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {getUrgencyIcon(step.urgency)}
                        <span className={`text-[9px] font-bold uppercase ${step.urgency === 'immediate' ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {step.urgency.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            <Button 
              onClick={handleComposeAlert} 
              disabled={loadingAlert}
              className="w-full mt-4 h-11 bg-destructive hover:bg-destructive/90 text-white border-none shadow-lg"
            >
              {loadingAlert ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Users size={18} className="mr-2" /> Issue Community Alert</>}
            </Button>
            <div className="absolute bottom-2 right-4 text-[10px] opacity-20 font-code">AI-generated · Groq</div>
          </div>
        </section>
      </div>

      {/* Community Alert Preview Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md bg-card border border-white/5 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-destructive" size={20} />
              Alert Preview
            </DialogTitle>
          </DialogHeader>
          
          {alertPreview && (
            <div className="space-y-6">
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-md font-bold text-destructive">{alertPreview.subject}</h4>
                  <Badge variant="destructive" className="text-[9px] uppercase">{alertPreview.severity}</Badge>
                </div>
                <Textarea 
                  value={editableMessage} 
                  onChange={(e) => setEditableMessage(e.target.value)}
                  className="bg-transparent border-none focus-visible:ring-0 p-0 text-sm opacity-80 h-24 resize-none"
                />
              </div>
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                <p className="text-[10px] font-black uppercase opacity-40 mb-1">Recommended Action</p>
                <p className="text-xs font-bold text-primary">{alertPreview.recommended_action}</p>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:justify-between">
            <Button variant="ghost" onClick={() => setShowModal(false)} className="flex-1">Discard</Button>
            <Button onClick={handleSendAlert} disabled={sending} className="flex-1 bg-destructive hover:bg-destructive/90">
              {sending ? 'Broadcasting...' : <><Send size={16} className="mr-2" /> Send to 23 Farmers</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
