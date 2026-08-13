'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/lib/types';
import { Bot, User, Send, Sparkles, HelpCircle, ShieldCheck, Zap } from 'lucide-react';

const SUGGESTED_PROMPTS = [
  'Wie wirken sich PV-Negativpreise zur Mittagszeit auf alpine Pumpspeicher in Österreich aus?',
  'Welche Förderungen nach dem EAG (Erneuerbaren-Ausbau-Gesetz) gibt es für Wasserkraft-Repowering?',
  'Was bedeutet die EU RED III Richtlinie für die UVP-Dauer von Wasserkraftwerken in Österreich?',
  'Welche Strategie empfiehlst du Erzeugern bei steigenden Wasserstoff-Elektrolyse-Trends?'
];

export default function AdvisorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'agent',
      text: 'Grüß Gott! Ich bin dein **Energy Strategy Advisor AI Agent**. Ich analysiere kontinuierlich Daten aus dem österreichischen Energiesektor (E-Control, APG, Verbund, BMK) sowie EU-Trends.\n\nWie kann ich dir bei deiner Unternehmens- oder Investitionsstrategie im Bereich Erneuerbare & Wasserkraft helfen?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (questionToSend?: string) => {
    const query = questionToSend || inputQuestion;
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!questionToSend) setInputQuestion('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          history: messages
        })
      });

      const data = await res.json();
      if (data.success && data.answer) {
        const agentMsg: ChatMessage = {
          id: `agent-${Date.now()}`,
          sender: 'agent',
          text: data.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, agentMsg]);
      }
    } catch (e) {
      console.error('Chat error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
          <Bot className="w-4 h-4" />
          <span>Gemini AI Energy Strategy Agent</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white font-heading">
          AI Strategy Advisor Chatbot
        </h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          Stelle spezifische Fragen zu Marktchancen, Regulierung (EAG, RED III), Wasserkraft-Optimierung und Förderungen in Österreich & EU.
        </p>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SUGGESTED_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            disabled={isLoading}
            className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 text-left text-xs text-slate-300 hover:text-white transition-all flex items-start gap-2 group"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
            <span>{prompt}</span>
          </button>
        ))}
      </div>

      {/* Main Chat Interface */}
      <div className="glass-card p-4 sm:p-6 border-cyan-500/20 flex flex-col h-[520px]">
        
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                    isUser
                      ? 'bg-slate-700 text-white'
                      : 'bg-gradient-to-tr from-[#00f2fe] to-[#3b82f6] text-slate-950 shadow-[0_0_10px_rgba(0,242,254,0.3)]'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[82%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-cyan-500/20 border border-cyan-500/30 text-white rounded-tr-none'
                      : 'bg-slate-900/80 border border-slate-800 text-slate-200 rounded-tl-none whitespace-pre-wrap'
                  }`}
                >
                  <div>{msg.text}</div>
                  <div className="text-[10px] opacity-40 text-right mt-1.5">{msg.timestamp}</div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-3 text-xs text-cyan-400 p-3 rounded-xl bg-slate-900/40 border border-slate-800">
              <Sparkles className="w-4 h-4 animate-spin text-[#00f2fe]" />
              <span>Der Agent analysiert österreichische Marktdaten & formuliert Antwort...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center gap-2">
          <input
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Frage zu Wasserkraft, EAG-Förderungen, APG-Netz oder Preisprognosen eingeben..."
            disabled={isLoading}
            className="flex-1 bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00f2fe] transition-colors"
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !inputQuestion.trim()}
            className="btn-primary py-3 px-4 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
}
