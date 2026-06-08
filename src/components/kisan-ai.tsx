
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, Send, X, RefreshCw, Sparkles, MapPin, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { getProfile, type UserProfile } from '@/lib/user-profile';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  time: string;
}

export function KisanAI() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<UserProfile>(getProfile());
  const [suggestedPills, setSuggestedPills] = useState<string[]>([]);

  // Detect script (Hindi Unicode range)
  const isHindi = (text: string) => /[\u0900-\u097F]/.test(text);

  // Intent keyword detection & context injection
  const getEnrichedContext = useCallback((userInput: string, p: UserProfile) => {
    const inputLower = userInput.toLowerCase();
    const city = p.city;
    const state = p.state;
    const crops = p.crops.join(', ');
    const primaryCrop = p.crops[0] || 'crop';
    const soil = p.soilType;
    const irrigation = p.irrigationType;
    const size = p.fieldSize;
    const month = new Date().toLocaleString('en-IN', { month: 'long' });

    let context = "";
    
    if (/(grow|plant|sow|harvest|yield|seed|crop|variety)/.test(inputLower)) {
      context = `Farmer grows ${crops} in ${state}. Soil: ${soil}. Season: ${month}. Focus on yield maximization.`;
    } else if (/(price|mandi|rate|sell|profit|market|bhav)/.test(inputLower)) {
      context = `Current ${city} mandi context. Farmer wants to know if now is good time to sell or wait for ${primaryCrop}.`;
    } else if (/(rain|weather|monsoon|temperature|drought|frost|heat)/.test(inputLower)) {
      context = `Location: ${city}, ${state}. Current month: ${month}. Relate weather to ${primaryCrop} irrigation needs.`;
    } else if (/(disease|pest|insect|spray|fungus|rot|wilt|yellow|spots)/.test(inputLower)) {
      context = `Crop: ${primaryCrop}. Location: ${state}. Possible outbreaks in ${city} region. Recommend specific remedies.`;
    } else if (/(water|irrigation|drip|flood|moisture|dry)/.test(inputLower)) {
      context = `Soil type: ${soil}. Irrigation method: ${irrigation}. Recent rainfall: ${p.state} load is relevant.`;
    } else if (/(loan|interest|credit|money|bank|kcc|scheme|subsidy)/.test(inputLower)) {
      context = `Farmer profile: ${city}, ${state}. Land: ${size}. Eligible schemes: PM-Kisan, PM-FASAL, KCC.`;
    } else if (/(scheme|government|yojana|subsidy|registration|pm)/.test(inputLower)) {
      context = `List schemes available for ${state} farmers growing ${crops}. Give eligibility and how to apply.`;
    }

    return context;
  }, []);

  const generateSuggestions = useCallback((p: UserProfile) => {
    const crop = p.crops[0] || 'crops';
    const city = p.city;
    setSuggestedPills([
      `What price should I sell ${crop} this week?`,
      `Is it the right time to irrigate in ${city}?`,
      `Any disease risk in ${city} right now?`
    ]);
  }, []);

  const handleSend = useCallback(async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    setError(false);
    const newMessage: Message = { 
      role: 'user', 
      content: textToSend, 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setLoading(true);

    const contextInjection = getEnrichedContext(textToSend, profile);
    const systemPrompt = `You are Kisan AI, an expert agricultural intelligence assistant built into KrishiShield AI. 
    You have deep expertise in all farm operations. The farmer is ${profile.name}, farming ${profile.crops.join(', ')} in ${profile.city}, ${profile.state}. 
    Answer in simple conversational language. Mix Hindi words naturally (Hinglish). 
    Be specific — never give vague advice. If asked about price, give a number range. 
    If asked about disease, name it. Keep responses under 120 words.
    CONTEXT INJECTION: ${contextInjection}`;

    try {
      const res = await fetch('/api/groq', {
        method: 'POST',
        body: JSON.stringify({
          system: systemPrompt,
          user: textToSend,
          opts: {
            temperature: 0.55,
            stream: true,
            history: messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
          }
        })
      });

      if (!res.ok) throw new Error('API Error');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

      let assistantMessage = "";
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "", 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      }]);

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') break;
            try {
              const data = JSON.parse(dataStr);
              const content = data.choices[0]?.delta?.content || '';
              assistantMessage += content;
              
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].content = assistantMessage;
                return newMessages;
              });
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      console.error('[KISAN_AI] Stream Error:', err);
      setError(true);
      toast({ title: "Network issue", description: "Tap the retry icon to try again.", variant: "default" });
    } finally {
      setLoading(false);
      generateSuggestions(profile);
    }
  }, [input, loading, messages, profile, getEnrichedContext, generateSuggestions, toast]);

  useEffect(() => {
    const handleExternalOpen = (e: any) => {
      const { prompt } = e.detail;
      setOpen(true);
      if (prompt) {
        handleSend(prompt);
      }
    };
    window.addEventListener('kisanAiOpen', handleExternalOpen);
    return () => window.removeEventListener('kisanAiOpen', handleExternalOpen);
  }, [handleSend]);

  useEffect(() => {
    const handleUpdate = () => {
      const p = getProfile();
      setProfile(p);
      generateSuggestions(p);
    };
    window.addEventListener('profileUpdated', handleUpdate);
    
    // Initial load
    const p = getProfile();
    if (messages.length === 0) {
      setMessages([
        { 
          role: 'assistant', 
          content: `Namaste ${p.name} ji! Main Kisan AI hoon. Aapke ${p.crops[0] || 'khet'} (in ${p.city}) ke liye aaj main kya help kar sakta hoon?`, 
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        }
      ]);
    }
    generateSuggestions(p);

    return () => window.removeEventListener('profileUpdated', handleUpdate);
  }, [generateSuggestions, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const highlightContent = (text: string) => {
    let parts = text.split(/(\d+(?:\.\d+)?|[\u0900-\u097F]+|[a-zA-Z]+)/g);
    
    return parts.map((part, i) => {
      const isNum = /^\d+(?:\.\d+)?$/.test(part);
      const isCrop = profile.crops.some(c => part.toLowerCase().includes(c.toLowerCase()));
      
      if (isNum) {
        return <span key={i} className="text-[#4CAF50] font-bold">{part}</span>;
      }
      if (isCrop) {
        return <span key={i} className="text-amber-500 font-bold">{part}</span>;
      }
      return part;
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <Button 
        onClick={() => setOpen(!open)}
        className={cn(
          "w-14 h-14 rounded-full shadow-2xl flex items-center justify-center p-0 transition-all active:scale-90",
          open ? "bg-background border border-white/10 text-white" : "bg-primary text-primary-foreground"
        )}
      >
        {open ? <X size={24} /> : <MessageSquare size={24} />}
      </Button>

      {open && (
        <div className="absolute bottom-16 right-0 w-[90vw] md:w-[420px] h-[70vh] md:h-[550px] bg-[#0A0F0A] border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-primary/5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-black shadow-lg">K</div>
              <div>
                <h3 className="text-base font-headline font-bold">Kisan AI</h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(76,175,80,1)]" />
                  <span className="text-[10px] opacity-40 uppercase font-black tracking-widest">Active Intelligence Link</span>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            <div className="space-y-6 pb-6">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[85%] space-y-2 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={cn(
                      "p-4 rounded-[1.5rem] text-[14px] leading-relaxed",
                      m.role === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-tr-none shadow-xl' 
                        : 'bg-white/5 border border-white/10 text-white/90 rounded-tl-none backdrop-blur-md'
                    )}>
                      {m.role === 'assistant' ? highlightContent(m.content) : m.content}
                    </div>
                    <span className="text-[10px] font-code opacity-20 px-2">{m.time}</span>
                  </div>
                </div>
              ))}
              {loading && messages[messages.length-1].content === "" && (
                <div className="flex justify-start animate-pulse">
                   <div className="bg-white/5 p-4 rounded-2xl rounded-tl-none">
                      <div className="flex gap-1.5">
                        <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                   </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input & Suggestions */}
          <div className="p-6 border-t border-white/5 bg-background/50 backdrop-blur-xl space-y-4">
            {!loading && suggestedPills.length > 0 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {suggestedPills.map((pill, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(pill)}
                    className="whitespace-nowrap px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[11px] font-bold text-white/60 hover:bg-white/10 hover:text-white transition-all"
                  >
                    {pill}
                  </button>
                ))}
              </div>
            )}
            
            <div className="flex gap-3 items-center">
              <div className="relative flex-1">
                <Input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask anything..."
                  className="rounded-full bg-white/5 border-none h-12 pl-5 pr-12 focus-visible:ring-1 focus-visible:ring-primary/40 placeholder:opacity-20"
                  disabled={loading}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary opacity-30">
                  <Sparkles size={16} />
                </div>
              </div>
              <Button 
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="rounded-full w-12 h-12 p-0 shrink-0 bg-primary hover:bg-primary/90 shadow-xl"
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
