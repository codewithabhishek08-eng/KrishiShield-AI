
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

export function KisanAI() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Namaste Ramesh ji! Main Kisan AI hoon. Aaj aapki kya madad kar sakta hoon?', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Rate limiting state
  const [callCount, setCallCount] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCallCount(0);
      setIsRateLimited(false);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading || isRateLimited) return;

    if (callCount >= 12) {
      setIsRateLimited(true);
      toast({ title: "AI thinking time", description: "Try again in a moment.", variant: "default" });
      return;
    }

    const newMessage: Message = { 
      role: 'user', 
      content: input, 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setLoading(true);
    setCallCount(prev => prev + 1);

    try {
      const res = await fetch('/api/groq', {
        method: 'POST',
        body: JSON.stringify({
          system: "You are Kisan AI, KrishiShield's field assistant. You help smallholder tomato farmers in Maharashtra, India. Answer in Hinglish (mix of Hindi and English). Keep answers short — max 3 sentences. If you don't know something, say so simply.",
          user: input,
          opts: {
            temperature: 0.6,
            // Pass last 8 messages for context (simple simulation)
            history: messages.slice(-8)
          }
        })
      });
      const text = await res.json();
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: typeof text === 'string' ? text : 'Sorry, I missed that. Can you repeat?', 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      }]);
    } catch (err) {
      toast({ title: "Connection Error", description: "Kisan AI is momentarily resting.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <Button 
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full bg-primary hover:bg-primary/90 shadow-2xl flex items-center justify-center p-0 transition-transform active:scale-95"
      >
        {open ? <X size={24} /> : <MessageSquare size={24} />}
      </Button>

      {open && (
        <div className="absolute bottom-16 right-0 w-[90vw] md:w-[400px] h-[60vh] md:h-[500px] bg-background border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in">
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">K</div>
              <div>
                <h3 className="text-sm font-bold">Kisan AI</h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                  <span className="text-[10px] opacity-40 uppercase font-black">Online Help</span>
                </div>
              </div>
            </div>
            <div className="w-12 h-1.5 bg-white/10 rounded-full md:hidden" />
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4 pb-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] space-y-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-muted rounded-tl-none'}`}>
                      {m.content}
                    </div>
                    <span className="text-[9px] opacity-30 px-1">{m.time}</span>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-2xl rounded-tl-none flex gap-1">
                    <div className="w-1 h-1 bg-foreground/20 rounded-full animate-bounce" />
                    <div className="w-1 h-1 bg-foreground/20 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1 h-1 bg-foreground/20 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-white/5 bg-background sticky bottom-0">
            <div className="flex gap-2">
              <Input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Kisan AI anything..."
                className="rounded-full bg-muted border-none h-11 focus-visible:ring-1 focus-visible:ring-primary/30"
                disabled={loading || isRateLimited}
              />
              <Button 
                onClick={handleSend}
                disabled={!input.trim() || loading || isRateLimited}
                className="rounded-full w-11 h-11 p-0 shrink-0"
              >
                <Send size={18} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
