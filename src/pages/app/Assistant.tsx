import { Fragment, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ArrowUp, Bot, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/common/Avatar';
import { useFinanceData } from '@/hooks/useFinanceData';
import { TourButton, usePageTour } from '@/components/tour/Tour';
import { useMoney } from '@/hooks/useMoney';
import { useAuth } from '@/store/auth';
import { answer, SUGGESTIONS, type AssistantAnswer } from '@/lib/assistant';
import { uid } from '@/lib/id';
import { cn } from '@/lib/cn';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  answer?: AssistantAnswer;
}

/** Renderiza **negrito** de forma segura (sem HTML injetado). */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <strong key={i} className="font-semibold text-fg">{p.slice(2, -2)}</strong> : <Fragment key={i}>{p}</Fragment>))}
    </>
  );
}

let chatCache: Message[] = [];

export default function Assistant() {
  const data = useFinanceData();
  const money = useMoney();
  const user = useAuth((s) => s.user);
  const [messages, setMessages] = useState<Message[]>(chatCache);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  usePageTour('assistant');

  useEffect(() => {
    chatCache = messages;
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, thinking]);

  const ask = (q: string) => {
    const text = q.trim().slice(0, 300);
    if (!text || thinking) return;
    setMessages((m) => [...m, { id: uid('m'), role: 'user', text }]);
    setInput('');
    setThinking(true);
    // Pequeno atraso para feedback visual; a resposta é calculada localmente.
    setTimeout(() => {
      const a = answer(text, data, (v) => money(v, { ignoreHidden: true }));
      setMessages((m) => [...m, { id: uid('m'), role: 'assistant', text: a.text, answer: a }]);
      setThinking(false);
      inputRef.current?.focus();
    }, 450);
  };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-10rem)] max-w-3xl flex-col">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-[#7b6dff] to-[#22d3ee] text-white shadow-[0_8px_24px_-8px_#7b6dff]">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">Nexora AI</h1>
            <p className="flex items-center gap-1 text-xs text-fg-subtle"><ShieldCheck className="size-3" aria-hidden /> Respostas calculadas com seus dados, no seu dispositivo</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <TourButton id="assistant" />
          {messages.length > 0 && <Button variant="ghost" size="sm" leftIcon={<Trash2 className="size-3.5" />} onClick={() => setMessages([])}>Limpar</Button>}
        </div>
      </div>

      <div className="flex-1 space-y-4" aria-live="polite" aria-busy={thinking}>
        {messages.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card holo p-6 text-center sm:p-10">
            <Bot className="mx-auto size-10 text-primary" aria-hidden />
            <h2 className="mt-3 font-display text-lg font-semibold">Olá, {user?.name.split(' ')[0]}! Como posso ajudar?</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-fg-subtle">Pergunte sobre seus gastos, saldo, metas, orçamentos e faturas. Eu nunca invento números — se não houver dados, eu aviso.</p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => ask(s)} className="group flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm transition-colors hover:border-primary/50 hover:bg-surface-2">
                  {s}
                  <ArrowRight className="size-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
                </button>
              ))}
            </div>
          </motion.div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('flex gap-3', m.role === 'user' && 'flex-row-reverse')}>
              {m.role === 'user' ? (
                <Avatar name={user?.name ?? ''} className="size-8" />
              ) : (
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Sparkles className="size-4" aria-hidden /></span>
              )}
              <div className={cn('max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed', m.role === 'user' ? 'rounded-tr-md bg-primary text-primary-fg' : 'card rounded-tl-md text-fg-muted')}>
                {m.role === 'user' ? m.text : <Rich text={m.text} />}
                {m.answer?.facts && m.answer.facts.length > 0 && (
                  <dl className="mt-3 divide-y divide-border rounded-xl border border-border bg-surface-2/50">
                    {m.answer.facts.map((f) => (
                      <div key={f.label} className="flex justify-between gap-4 px-3 py-2 text-xs">
                        <dt className="text-fg-subtle">{f.label}</dt>
                        <dd className="tabular text-right font-medium text-fg">{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {(m.answer?.links?.length || m.answer?.followUps?.length) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {m.answer?.links?.map((l) => (
                      <Link key={l.href} to={l.href} className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary hover:underline">
                        {l.label} <ArrowRight className="size-3" aria-hidden />
                      </Link>
                    ))}
                    {m.answer?.followUps?.map((f) => (
                      <button key={f} onClick={() => ask(f)} className="rounded-full border border-border px-2.5 py-1 text-xs hover:bg-surface-2">{f}</button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {thinking && (
          <div className="flex gap-3" role="status" aria-label="Nexora AI está pensando">
            <span className="grid size-8 place-items-center rounded-full bg-primary-soft text-primary"><Sparkles className="size-4" aria-hidden /></span>
            <div className="card flex items-center gap-1 rounded-2xl rounded-tl-md px-4 py-3">
              {[0, 1, 2].map((i) => <motion.span key={i} className="size-1.5 rounded-full bg-fg-subtle" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} />)}
            </div>
          </div>
        )}
        <div ref={bottom} />
      </div>

      <form
        data-tour="ai-input"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="glass sticky bottom-[calc(76px+env(safe-area-inset-bottom))] mt-6 flex items-end gap-2 rounded-2xl p-2 shadow-lg lg:bottom-4"
      >
        <label htmlFor="ai-input" className="sr-only">Pergunte à Nexora AI</label>
        <textarea
          id="ai-input"
          ref={inputRef}
          rows={1}
          value={input}
          maxLength={300}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              ask(input);
            }
          }}
          placeholder="Ex.: Quanto gastei com alimentação este mês?"
          className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-fg-subtle"
        />
        <Button type="submit" size="icon" aria-label="Enviar pergunta" disabled={!input.trim() || thinking}>
          <ArrowUp className="size-4" />
        </Button>
      </form>
    </div>
  );
}
