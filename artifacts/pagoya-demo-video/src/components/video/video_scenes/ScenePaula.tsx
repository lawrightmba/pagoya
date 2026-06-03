import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useLang } from '@/lib/video/LangContext';

const C = '#00C875';
const CD = '#007A4A';

export function ScenePaula() {
  const lang = useLang();
  const [phase, setPhase] = useState(0);
  const [typed, setTyped] = useState('');
  const [showTyping, setShowTyping] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [showCard, setShowCard] = useState(false);

  const userMsg = lang === 'en' ? 'I need to pay my CFE electricity bill' : 'necesito pagar mi CFE';
  const paulaReply = lang === 'en'
    ? '👋 Hi María! Found your CFE bill.\n$350 MXN + $25 fee = $375 total.\nReply YES to pay, CANCEL to stop.'
    : '👋 ¡Hola María! Encontré tu factura CFE.\n$350 MXN + $25 comisión = $375 total.\nResponde SÍ para pagar o CANCELAR.';

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (phase < 2) return;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTyped(userMsg.slice(0, i));
      if (i >= userMsg.length) { clearInterval(iv); }
    }, 55);
    return () => clearInterval(iv);
  }, [phase, userMsg]);

  useEffect(() => {
    if (typed.length < userMsg.length) return;
    const t1 = setTimeout(() => setShowTyping(true), 600);
    const t2 = setTimeout(() => { setShowTyping(false); setShowReply(true); }, 2400);
    const t3 = setTimeout(() => setShowCard(true), 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [typed, userMsg]);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden flex"
      style={{ background: '#004F2D' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.5 }}
    >
      {/* Ambient glow */}
      <motion.div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 30% 50%, rgba(0,200,117,0.12) 0%, transparent 70%)' }}
        animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 5, repeat: Infinity }} />

      {/* LEFT — headline */}
      <div className="flex flex-col justify-center pl-[7vw]" style={{ width: '44%' }}>
        <motion.div
          className="inline-flex self-start items-center gap-2 px-3 py-1.5 rounded-full mb-5"
          style={{ background: `${C}18`, border: `1px solid ${C}40` }}
          initial={{ opacity: 0, x: -16 }} animate={{ opacity: phase >= 1 ? 1 : 0, x: phase >= 1 ? 0 : -16 }}
          transition={{ duration: 0.5 }}
        >
          <span style={{ color: C, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-body)' }}>
            {lang === 'en' ? 'Meet Paula' : 'Conoce a Paula'}
          </span>
        </motion.div>

        <div className="overflow-hidden mb-3">
          <motion.h1
            style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', lineHeight: 1.0, fontSize: 'clamp(36px, 4.5vw, 68px)' }}
            initial={{ y: '110%' }} animate={{ y: phase >= 1 ? '0%' : '110%' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {lang === 'en' ? <>Your AI<br /><span style={{ color: C }}>financial</span><br />agent</> : <>Tu agente<br /><span style={{ color: C }}>financiero</span><br />con IA</>}
          </motion.h1>
        </div>

        <motion.p
          style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.55)', fontSize: 'clamp(13px, 1.25vw, 18px)', lineHeight: 1.6, maxWidth: '30ch' }}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 10 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {lang === 'en'
            ? 'Paula lives in WhatsApp. No app. No bank account. Real payments in 2 minutes.'
            : 'Paula vive en WhatsApp. Sin app. Sin cuenta bancaria. Pagos reales en 2 minutos.'}
        </motion.p>

        <motion.div className="flex items-center gap-2 mt-6"
          initial={{ opacity: 0 }} animate={{ opacity: phase >= 1 ? 1 : 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="w-2 h-2 rounded-full" style={{ background: C }} />
          <span style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', letterSpacing: '0.08em' }}>
            Powered by Claude claude-sonnet-4-5 · Anthropic
          </span>
        </motion.div>
      </div>

      {/* RIGHT — WhatsApp phone mockup */}
      <div className="flex items-center justify-center" style={{ width: '56%' }}>
        <motion.div
          style={{ width: 'clamp(260px, 28vw, 360px)', background: '#111B21', borderRadius: 28, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)' }}
          initial={{ opacity: 0, y: 30, scale: 0.92 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 30, scale: phase >= 1 ? 1 : 0.92 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* WhatsApp header */}
          <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#1F2C34', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold" style={{ background: `linear-gradient(135deg, ${CD}, ${C})` }}>P</div>
            <div>
              <p style={{ fontFamily: 'var(--font-body)', color: 'white', fontWeight: 700, fontSize: 14 }}>Paula · PagoYa</p>
              <p style={{ fontFamily: 'var(--font-body)', color: C, fontSize: 11 }}>● online</p>
            </div>
          </div>

          {/* Chat messages */}
          <div className="flex flex-col gap-3 px-4 py-4" style={{ minHeight: 220 }}>
            {/* User message */}
            <AnimatePresence>
              {phase >= 2 && (
                <motion.div className="self-end max-w-[78%]"
                  initial={{ opacity: 0, x: 16, scale: 0.92 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="px-3 py-2 rounded-2xl rounded-tr-sm" style={{ background: '#005C4B' }}>
                    <p style={{ fontFamily: 'var(--font-body)', color: 'white', fontSize: 13, lineHeight: 1.4 }}>{typed}<span className={typed.length < userMsg.length ? 'animate-pulse' : ''} style={{ opacity: typed.length < userMsg.length ? 1 : 0 }}>|</span></p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Typing indicator */}
            <AnimatePresence>
              {showTyping && (
                <motion.div className="self-start"
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1" style={{ background: '#1F2C34' }}>
                    {[0, 0.15, 0.3].map((d, i) => (
                      <motion.div key={i} className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.5)' }}
                        animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: d }} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Paula reply */}
            <AnimatePresence>
              {showReply && (
                <motion.div className="self-start max-w-[85%]"
                  initial={{ opacity: 0, x: -16, scale: 0.92 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="px-3 py-2 rounded-2xl rounded-tl-sm" style={{ background: '#1F2C34' }}>
                    {paulaReply.split('\n').map((line, i) => (
                      <p key={i} style={{ fontFamily: 'var(--font-body)', color: i === 0 ? 'white' : i === 1 ? C : 'rgba(255,255,255,0.7)', fontSize: 12.5, lineHeight: 1.5, fontWeight: i === 1 ? 700 : 400 }}>{line}</p>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* SÍ / CANCELAR card */}
            <AnimatePresence>
              {showCard && (
                <motion.div className="self-start w-full"
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center justify-center py-2 rounded-xl font-bold text-sm" style={{ background: `${C}22`, border: `1px solid ${C}55`, color: C, fontFamily: 'var(--font-body)' }}>
                      {lang === 'en' ? '✓ YES' : '✓ SÍ'}
                    </div>
                    <div className="flex-1 flex items-center justify-center py-2 rounded-xl font-bold text-sm" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-body)' }}>
                      {lang === 'en' ? '✕ CANCEL' : '✕ CANCELAR'}
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
