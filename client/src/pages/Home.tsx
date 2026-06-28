import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGenerateCard } from '../lib/api-hooks';
import type { MagicSquareData } from '../types';
import { generateMagicSquarePDF } from '../lib/pdf-generator';
import { Download, RefreshCw, Users, Sparkles, Clock } from 'lucide-react';
import { Link } from 'wouter';

const FORMULA_ROWS = [
  ['DD', 'MM', 'CC', 'YY'],
  ['YY+1', 'CC-1', 'MM-3', 'DD+3'],
  ['MM-2', 'DD+2', 'YY+2', 'CC-2'],
  ['CC+1', 'YY-1', 'DD+1', 'MM-1'],
];
const ROW_STYLES = ['formula-row-1', 'formula-row-2', 'formula-row-3', 'formula-row-4'];

const PATTERN_CONFIG: Record<string, { label: string; active: string; pill: string }> = {
  row:      { label: '→ Rows',       active: 'filter-btn-row-active',      pill: 'eq-pill-row' },
  column:   { label: '↓ Columns',    active: 'filter-btn-column-active',   pill: 'eq-pill-column' },
  diagonal: { label: '⤢ Diagonals',  active: 'filter-btn-diagonal-active', pill: 'eq-pill-diagonal' },
  corner:   { label: '⊞ Corners',    active: 'filter-btn-corner-active',   pill: 'eq-pill-corner' },
  block2x2: { label: '⊟ 2×2 Blocks', active: 'filter-btn-block2x2-active', pill: 'eq-pill-block2x2' },
};
const PATTERN_ORDER = ['row', 'column', 'diagonal', 'corner', 'block2x2'] as const;

const RECENT_KEY = 'recentCelebrantNames';
function getRecentNames(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}
function pushRecentName(n: string) {
  const prev = getRecentNames().filter(x => x.toLowerCase() !== n.toLowerCase());
  localStorage.setItem(RECENT_KEY, JSON.stringify([n, ...prev].slice(0, 4)));
}

function MatrixDisplay({ matrix, highlightedCells, highlightType }: {
  matrix: number[][];
  highlightedCells?: number[][];
  highlightType?: string;
}) {
  const isHL = (r: number, c: number) => highlightedCells?.some(([hr, hc]) => hr === r && hc === c) ?? false;
  const hlClass = highlightType ? `matrix-cell-highlight-${highlightType}` : '';
  return (
    <div className="grid gap-2 sm:gap-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
      {matrix.map((row, r) => row.map((val, c) => (
        <div key={`${r}-${c}`} className={`matrix-cell ${isHL(r, c) ? hlClass : 'matrix-cell-normal'}`} style={{ minWidth: 0 }}>
          {val}
        </div>
      )))}
    </div>
  );
}

export default function Home() {
  const [name, setName]   = useState('');
  const [day, setDay]     = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear]   = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentNames, setRecentNames] = useState<string[]>([]);
  const [cardData, setCardData] = useState<MagicSquareData | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [activeIdx, setActiveIdx]   = useState(0);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef  = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setRecentNames(getRecentNames()); }, []);

  const { mutate: generate, isPending } = useGenerateCard({
    mutation: {
      onSuccess: (data) => {
        setCardData(data);
        setActiveType(null);
        setActiveIdx(0);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
      },
    },
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !day || !month || !year || year.length < 4) return;
    pushRecentName(name.trim());
    setRecentNames(getRecentNames());
    generate({ data: { name: name.trim(), dateOfBirth: `${day.padStart(2,'0')}/${month.padStart(2,'0')}/${year}` } });
  };

  const resetForm = () => {
    setCardData(null); setActiveType(null); setActiveIdx(0);
    setName(''); setDay(''); setMonth(''); setYear('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentPatterns = cardData?.patterns.filter(p => p.type === activeType) ?? [];
  const activePattern   = currentPatterns[activeIdx];
  const availableTypes  = Array.from(new Set(cardData?.patterns.map(p => p.type) ?? []));
  const suggestions     = recentNames.filter(n => !name || n.toLowerCase().includes(name.toLowerCase()));

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 gap-8">
      <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} className="flex flex-col items-center">
        <img src="/logo.png" alt="SWS Financial Solutions"
          className="h-20 sm:h-24 w-auto object-contain drop-shadow-lg"
          onError={e => (e.currentTarget.style.display='none')} />
      </motion.div>

      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }} className="text-center">
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-purple-heading leading-tight">The Math of</h1>
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gold leading-tight">Celebration</h1>
        <p className="mt-3 text-base sm:text-lg text-purple-heading/70 font-sans font-normal">
          Enter a birth date to generate a unique Ramanujan Magic Square.<br className="hidden sm:block" />
          A mathematical wonder where every row, column, and diagonal sums to your birth year.
        </p>
      </motion.div>

      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }} className="white-card p-6 sm:p-8 w-full max-w-lg">
        <h2 className="text-center font-serif text-xl font-bold text-purple-heading mb-1">Ramanujan's Birthday Magic Square</h2>
        <p className="text-center text-sm text-purple-heading/60 font-sans mb-6">First row = your birth date &nbsp;|&nbsp; DD · MM · CC · YY</p>
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {FORMULA_ROWS.map((row, ri) => row.map((cell, ci) => (
            <div key={`${ri}-${ci}`} className={`${ROW_STYLES[ri]} text-center text-sm sm:text-base font-semibold py-3 rounded-xl font-sans`}>
              {cell}
            </div>
          )))}
        </div>
        <p className="text-center text-sm font-sans text-purple-heading/60 mt-4">Magic Sum = DD + MM + CC + YY = <strong>Birth Year</strong></p>
      </motion.div>

      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }} className="purple-card p-6 sm:p-8 w-full max-w-lg">
        <h2 className="text-center text-white font-serif text-2xl font-bold mb-1">Create Magic</h2>
        <p className="text-center text-purple-200/70 text-sm font-sans mb-6">Enter a birth date to generate a personalized Ramanujan square.</p>
        <form onSubmit={handleGenerate} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-purple-200 text-sm font-medium font-sans flex items-center gap-2">
              <span className="text-purple-300">👤</span> Celebrant's Name
            </label>
            <div className="relative">
              <input ref={nameInputRef} type="text" placeholder="e.g. Srinivasa" value={name}
                onChange={e => setName(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 font-sans focus:outline-none focus:border-yellow-400 focus:bg-white/15 transition" />
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-4 }}
                    className="absolute left-0 right-0 top-full mt-1.5 z-20 bg-white rounded-xl shadow-xl border border-purple-100 overflow-hidden">
                    <div className="flex items-center gap-1.5 px-3 pt-2 pb-1">
                      <Clock className="w-3 h-3 text-purple-400" />
                      <span className="text-xs font-sans text-purple-400 font-medium">Recent names</span>
                    </div>
                    {suggestions.map(s => (
                      <button key={s} type="button" onMouseDown={e => { e.preventDefault(); setName(s); setShowSuggestions(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm font-sans text-purple-heading hover:bg-purple-50 transition-colors flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-gold inline-block flex-shrink-0" />{s}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-purple-200 text-sm font-medium font-sans flex items-center gap-2">
              <span className="text-purple-300">📅</span> Date of Birth
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { placeholder:'DD', maxLen:2, value:day, onChange:(v:string) => { const d=v.replace(/\D/g,'').slice(0,2); setDay(d); if(d.length===2) monthRef.current?.focus(); }},
                { placeholder:'MM', maxLen:2, value:month, ref:monthRef, onChange:(v:string) => { const m=v.replace(/\D/g,'').slice(0,2); setMonth(m); if(m.length===2) yearRef.current?.focus(); }},
                { placeholder:'YYYY', maxLen:4, value:year, ref:yearRef, onChange:(v:string) => setYear(v.replace(/\D/g,'').slice(0,4))},
              ].map((f, i) => (
                <input key={i} ref={(f as any).ref} type="text" inputMode="numeric" placeholder={f.placeholder}
                  maxLength={f.maxLen} value={f.value} onChange={e => f.onChange(e.target.value)} required
                  className="w-full px-3 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 font-sans text-center text-lg font-semibold focus:outline-none focus:border-yellow-400 focus:bg-white/15 transition" />
              ))}
            </div>
          </div>

          <button type="submit" disabled={isPending} className="btn-gold w-full py-3.5 text-base mt-2 flex items-center justify-center gap-2">
            {isPending ? <><Sparkles className="w-5 h-5 animate-spin flex-shrink-0" /><span>Generating…</span></>
              : <><Sparkles className="w-5 h-5 flex-shrink-0" /><span>Generate Magic Square</span></>}
          </button>
        </form>
      </motion.div>

      <AnimatePresence>
        {cardData && (
          <motion.div ref={resultRef} key="result" initial={{ opacity:0, y:40, scale:0.97 }} animate={{ opacity:1, y:0, scale:1 }}
            exit={{ opacity:0 }} transition={{ duration:0.5, ease:'easeOut' }}
            className="white-card p-6 sm:p-10 w-full max-w-lg text-center">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-purple-heading leading-tight">Happy Birthday,</h2>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-gold leading-tight mb-1">{cardData.name}!</h2>
            <p className="text-purple-heading/60 font-sans text-sm mb-3">Born on {cardData.dateOfBirth}</p>
            <div className="mb-5">
              <p className="text-xs font-sans uppercase tracking-widest text-purple-heading/50 mb-1">Magic Sum (Birth Year)</p>
              <p className="text-6xl font-serif font-bold text-purple-heading">{cardData.magicConstant}</p>
            </div>
            <div className="mx-auto max-w-xs sm:max-w-sm mb-4">
              <MatrixDisplay matrix={cardData.matrix} highlightedCells={activePattern?.cells} highlightType={activePattern?.type} />
            </div>
            <div className="grid grid-cols-4 max-w-xs sm:max-w-sm mx-auto mb-6 text-xs font-sans text-purple-heading/50 font-semibold">
              <span>DD</span><span>MM</span><span>CC</span><span>YY</span>
            </div>
            <div className="border-t border-gray-100 pt-5">
              <p className="text-xs font-sans uppercase tracking-widest text-purple-heading/50 mb-3">Filter by Pattern</p>
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {PATTERN_ORDER.filter(t => availableTypes.includes(t)).map(type => {
                  const cfg = PATTERN_CONFIG[type];
                  const count = cardData.patterns.filter(p => p.type === type).length;
                  const isActive = activeType === type;
                  return (
                    <button key={type} onClick={() => { setActiveType(isActive ? null : type); setActiveIdx(0); }}
                      className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-sans font-medium border transition-all duration-200 ${isActive ? cfg.active : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                      {cfg.label} ({count})
                    </button>
                  );
                })}
              </div>
              {activeType && currentPatterns.length > 0 && (
                <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} className="flex flex-wrap justify-center gap-2 mb-4">
                  {currentPatterns.map((p, idx) => (
                    <motion.button key={idx} initial={{ opacity:0, scale:0.85 }} animate={{ opacity:1, scale:1 }} transition={{ delay: idx*0.04 }}
                      onClick={() => setActiveIdx(idx)}
                      className={`px-3 py-1.5 rounded-full text-xs font-sans font-semibold border transition-all whitespace-nowrap ${PATTERN_CONFIG[activeType].pill} ${idx === activeIdx ? 'ring-2 ring-offset-1 ring-current' : ''}`}>
                      {p.equation}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button onClick={() => generateMagicSquarePDF(cardData)} className="btn-gold flex-1 py-3 flex items-center justify-center gap-2 text-sm font-semibold whitespace-nowrap">
                <Download className="w-4 h-4 flex-shrink-0" /><span>Download PDF</span>
              </button>
              <button onClick={resetForm} className="btn-purple flex-1 py-3 flex items-center justify-center gap-2 text-sm font-semibold whitespace-nowrap">
                <RefreshCw className="w-4 h-4 flex-shrink-0" /><span>Create Another</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.5 }} className="pb-4">
        <Link href="/organizer">
          <button className="btn-purple px-8 py-3 flex items-center gap-2 text-sm font-semibold">
            <Users className="w-4 h-4 flex-shrink-0" /><span>Open Organizer Panel</span>
          </button>
        </Link>
      </motion.div>
    </div>
  );
}
