import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const C = '#00C875';
const TR = '#F22F46';

export function Scene4Payment() {
  const [p, setP] = useState(0);
  const [typed, setTyped] = useState('');
  const [showTyping, setShowTyping] = useState(false);
  const [showParse, setShowParse] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [show2FA, setShow2FA] = useState(false);

  const userMsg = 'I want to pay my CFE electricity bill';

  useEffect(() => {
    const t = [
      setTimeout(() => setP(1), 300),
      setTimeout(() => setP(2), 1200),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (p < 2) return;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTyped(userMsg.slice(0, i));
      if (i >= userMsg.length) clearInterval(iv);
    }, 55);
    return () => clearInterval(iv);
  }, [p]);

  useEffect(() => {
    if (typed.length < userMsg.length) return;
    const t1 = setTimeout(() => setShowTyping(true), 500);
    const t2 = setTimeout(() => { setShowTyping(false); setShowParse(true); }, 2500);
    const t3 = setTimeout(() => setShowQuote(true), 4000);
    const t4 = setTimeout(() => setShow2FA(true), 6000);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [typed]);

  const parseSteps = [
    { label: 'Intent detected', value: 'Bill payment', color: C },
    { label: 'Service identified', value: 'CFE (Electricity)', color: C },
    { label: 'Account lookup', value: 'Found on file ✓', color: C },
    { label: 'Rail selected', value: 'SIPREL', color: C },
  ];

  return (
    <motion.div className="absolute inset-0 flex"
      style={{ background: '#004F2D' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>

      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 55% 65% at 78% 55%, rgba(124,92,252,0.07) 0%, transparent 70%)' }} />

      {/* Left */}
      <div className="flex flex-col justify-center pl-[7vw]" style={{ width: '48%' }}>
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: p >= 1 ? 1 : 0, x: p >= 1 ? 0 : -16 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
            style={{ background: 'rgba(124,92,252,0.15)', border: '1px solid rgba(124,92,252,0.35)' }}>
            <span style={{ color: '#7C5CFC', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-body)' }}>
              Step 2 — AI Payment Intent
            </span>
          </div>

          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', fontSize: 'clamp(24px,3vw,42px)', lineHeight: 1.15, marginBottom: 14 }}>
            Paula parses intent<br />in plain <span style={{ color: C }}>English or Spanish</span>
          </h2>

          <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.55)', fontSize: 'clamp(12px,1.1vw,15px)', lineHeight: 1.65, maxWidth: '36ch', marginBottom: 20 }}>
            Claude reads natural language — slang, abbreviations, voice-to-text. No form. No dropdown. The LLM handles linguistic ambiguity; session state enforces financial control.
          </p>

          {/* AI parse visualization */}
          <AnimatePresence>
            {showParse && (
              <motion.div className="rounded-xl p-4" style={{ background: 'rgba(124,92,252,0.12)', border: '1px solid rgba(124,92,252,0.25)' }}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
                <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                  🤖 Claude — intent extraction
                </p>
                <div className="flex flex-col gap-2">
                  {parseSteps.map((s, i) => (
                    <motion.div key={i} className="flex justify-between items-center"
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.25 }}>
                      <span style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{s.label}</span>
                      <span style={{ fontFamily: 'var(--font-body)', color: s.color, fontSize: 11, fontWeight: 700 }}>{s.value}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Right — phone */}
      <div className="flex items-center justify-center" style={{ width: '52%' }}>
        <motion.div
          style={{ width: 'clamp(240px,26vw,320px)', background: '#111B21', borderRadius: 28, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.07)' }}
          initial={{ opacity: 0, y: 30, scale: 0.92 }}
          animate={{ opacity: p >= 1 ? 1 : 0, y: p >= 1 ? 0 : 30, scale: p >= 1 ? 1 : 0.92 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}>

          <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#1F2C34', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-base font-bold" style={{ background: `linear-gradient(135deg, #007A4A, ${C})` }}>P</div>
            <div>
              <p style={{ fontFamily: 'var(--font-body)', color: 'white', fontWeight: 700, fontSize: 13, margin: 0 }}>Paula · PagoYa</p>
              <p style={{ fontFamily: 'var(--font-body)', color: C, fontSize: 10, margin: 0 }}>● online · AI powered by Claude</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 px-4 py-4" style={{ minHeight: 300 }}>
            {/* User message */}
            <AnimatePresence>
              {p >= 2 && (
                <motion.div className="self-end max-w-[82%]"
                  initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
                  <div className="px-3 py-2 rounded-2xl rounded-tr-sm" style={{ background: '#005C4B' }}>
                    <p style={{ fontFamily: 'var(--font-body)', color: 'white', fontSize: 11.5, lineHeight: 1.4, margin: 0 }}>
                      {typed}<span style={{ opacity: typed.length < userMsg.length ? 1 : 0 }} className="animate-pulse">|</span>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Typing indicator */}
            <AnimatePresence>
              {showTyping && (
                <motion.div className="self-start"
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                  <div className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5" style={{ background: '#1F2C34' }}>
                    <span style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>Paula (AI) is analyzing</span>
                    {[0, 0.15, 0.3].map((d, i) => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: C }}
                        animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: d }} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quote */}
            <AnimatePresence>
              {showQuote && (
                <motion.div className="self-start max-w-[90%]"
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }}>
                  <div className="px-3 py-2.5 rounded-2xl rounded-tl-sm" style={{ background: '#1F2C34' }}>
                    <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.8)', fontSize: 11.5, lineHeight: 1.55, margin: 0 }}>
                      ⚡ Found your CFE account.<br /><br />
                      <span style={{ color: 'rgba(255,255,255,0.55)' }}>Amount due:</span>{' '}
                      <span style={{ color: 'white', fontWeight: 700 }}>$420 MXN</span><br />
                      <span style={{ color: 'rgba(255,255,255,0.55)' }}>PagoYa fee:</span>{' '}
                      <span style={{ color: 'white', fontWeight: 700 }}>$25 MXN</span><br />
                      <span style={{ color: 'rgba(255,255,255,0.55)' }}>Total:</span>{' '}
                      <span style={{ color: C, fontWeight: 800, fontSize: 14 }}>$445 MXN</span>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 2FA */}
            <AnimatePresence>
              {show2FA && (
                <motion.div className="self-start w-full"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                  <div className="px-3 py-2 rounded-2xl rounded-tl-sm mb-2" style={{ background: `${TR}15`, border: `1px solid ${TR}35` }}>
                    <p style={{ fontFamily: 'var(--font-body)', color: TR, fontSize: 11, fontWeight: 700, margin: 0 }}>
                      🔐 Reply YES to authorize payment
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center justify-center py-2 rounded-xl font-bold text-sm cursor-pointer"
                      style={{ background: `${C}22`, border: `1px solid ${C}55`, color: C, fontFamily: 'var(--font-body)', fontSize: 12 }}>
                      ✓ YES
                    </div>
                    <div className="flex-1 flex items-center justify-center py-2 rounded-xl font-bold text-sm"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-body)', fontSize: 12 }}>
                      ✕ CANCEL
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
