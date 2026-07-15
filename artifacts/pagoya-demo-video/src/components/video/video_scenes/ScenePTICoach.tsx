import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useLang } from '@/lib/video/LangContext';
import paulaAvatarSrc from '@assets/image_1784143033276.png';

const C = '#00C875';

function PaulaAvatarLarge() {
  return (
    <div style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
      {[1.55, 1.25].map((s, i) => (
        <motion.div key={i} style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: `1.5px solid ${C}`,
        }}
          animate={{ scale: [s, s * 1.12, s], opacity: [0.3, 0.05, 0.3] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.7 }}
        />
      ))}
      <div style={{
        width: 88, height: 88, borderRadius: '50%',
        overflow: 'hidden',
        border: `3px solid ${C}`,
        boxShadow: `0 0 28px ${C}55`,
        position: 'relative',
      }}>
        <img src={paulaAvatarSrc} alt="Paula" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center' }} />
      </div>
    </div>
  );
}

function ScoreGauge({ targetScore, phase }: { targetScore: number; phase: number }) {
  const startScore = 634;
  const minScore = 300;
  const maxScore = 850;
  const [displayScore, setDisplayScore] = useState(startScore);

  const toPathLength = (s: number) => (s - minScore) / (maxScore - minScore);
  const startPL = toPathLength(startScore);
  const endPL = toPathLength(targetScore);

  useEffect(() => {
    if (phase < 2) return;
    let cur = startScore;
    const interval = setInterval(() => {
      cur += 1;
      setDisplayScore(cur);
      if (cur >= targetScore) clearInterval(interval);
    }, 38);
    return () => clearInterval(interval);
  }, [phase, targetScore]);

  return (
    <div style={{ position: 'relative', width: 240, height: 140 }}>
      <svg viewBox="0 0 240 130" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        <path d="M 25 118 A 95 95 0 0 1 215 118" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" strokeLinecap="round" />
        <motion.path
          d="M 25 118 A 95 95 0 0 1 215 118"
          fill="none"
          stroke={C}
          strokeWidth="14"
          strokeLinecap="round"
          initial={{ pathLength: startPL }}
          animate={{ pathLength: phase >= 2 ? endPL : startPL }}
          transition={{ duration: 2.2, ease: 'easeOut', delay: 0.2 }}
        />
        <motion.path
          d="M 25 118 A 95 95 0 0 1 215 118"
          fill="none"
          stroke={`${C}30`}
          strokeWidth="24"
          strokeLinecap="round"
          initial={{ pathLength: startPL }}
          animate={{ pathLength: phase >= 2 ? endPL : startPL }}
          transition={{ duration: 2.2, ease: 'easeOut', delay: 0.2 }}
        />
        <text x="120" y="98" textAnchor="middle" fill="white" fontSize="36" fontWeight="900" fontFamily="'Barlow Condensed', sans-serif">
          {displayScore}
        </text>
        <text x="120" y="116" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="11" fontFamily="'DM Sans', sans-serif">PTI Score</text>
        <text x="25" y="134" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="'DM Sans', sans-serif">300</text>
        <text x="215" y="134" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="'DM Sans', sans-serif">850</text>
      </svg>
    </div>
  );
}

export function ScenePTICoach() {
  const lang = useLang();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 2800),
      setTimeout(() => setPhase(4), 4400),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const messages = lang === 'en' ? [
    { from: 'paula', text: '🎉 María, your PTI went up 12 points this month!' },
    { from: 'paula', text: 'You paid on time 3x. Consistency: excellent ✓' },
    { from: 'paula', text: 'Next: Emergency Savings module → est. +8 pts' },
  ] : [
    { from: 'paula', text: '🎉 ¡María, tu PTI subió 12 puntos este mes!' },
    { from: 'paula', text: 'Pagaste a tiempo 3 veces. Consistencia: excelente ✓' },
    { from: 'paula', text: 'Próximo: Módulo de Ahorro de Emergencia → +8 pts estimados' },
  ];

  const dims = lang === 'en' ? [
    { code: 'PR', label: 'Payment Reliability', pct: 30, val: 78, color: C },
    { code: 'BC', label: 'Behavioral Consistency', pct: 20, val: 65, color: '#A78BFA' },
    { code: 'ED', label: 'Engagement Depth', pct: 25, val: 71, color: '#60A5FA' },
    { code: 'CF', label: 'Cashflow Stability', pct: 25, val: 69, color: '#FF5C1A' },
  ] : [
    { code: 'PR', label: 'Confiabilidad de Pago', pct: 30, val: 78, color: C },
    { code: 'BC', label: 'Consistencia Conductual', pct: 20, val: 65, color: '#A78BFA' },
    { code: 'ED', label: 'Profundidad de Compromiso', pct: 25, val: 71, color: '#60A5FA' },
    { code: 'CF', label: 'Estabilidad de Flujo', pct: 25, val: 69, color: '#FF5C1A' },
  ];

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden flex"
      style={{ background: '#004F2D' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(0,200,117,0.10) 0%, transparent 65%)' }}
        animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 6, repeat: Infinity }} />

      {/* LEFT — Paula + chat */}
      <div className="flex flex-col justify-center pl-[6vw]" style={{ width: '48%' }}>
        <motion.div className="inline-flex self-start items-center gap-2 px-3 py-1.5 rounded-full mb-5"
          style={{ background: `${C}18`, border: `1px solid ${C}40` }}
          initial={{ opacity: 0, x: -14 }} animate={{ opacity: phase >= 1 ? 1 : 0, x: phase >= 1 ? 0 : -14 }}
          transition={{ duration: 0.45 }}
        >
          <span style={{ color: C, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-body)' }}>
            {lang === 'en' ? 'Paula · PTI Credit Coach' : 'Paula · Coach de Crédito PTI'}
          </span>
        </motion.div>

        <div className="overflow-hidden mb-5">
          <motion.h2
            style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', lineHeight: 1.1, fontSize: 'clamp(28px, 3.5vw, 52px)' }}
            initial={{ y: '110%' }} animate={{ y: phase >= 1 ? '0%' : '110%' }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            {lang === 'en'
              ? <>Every payment<br /><span style={{ color: C }}>builds your</span><br />credit score.</>
              : <>Cada pago<br /><span style={{ color: C }}>construye tu</span><br />puntaje.</>}
          </motion.h2>
        </div>

        {/* Chat bubbles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.map((msg, i) => (
            <motion.div key={i}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: phase >= i + 2 ? 1 : 0, x: phase >= i + 2 ? 0 : -16 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              {i === 0 && <PaulaAvatarLarge />}
              {i > 0 && <div style={{ width: 88, flexShrink: 0 }} />}
              <div style={{
                background: '#1F2C34',
                borderRadius: 14,
                borderTopLeftRadius: i === 0 ? 4 : 14,
                padding: '10px 14px',
                maxWidth: '80%',
                border: i === 2 ? `1px solid ${C}40` : '1px solid rgba(255,255,255,0.06)',
              }}>
                <p style={{ fontFamily: 'var(--font-body)', color: i === 2 ? C : 'rgba(255,255,255,0.85)', fontSize: 'clamp(11px, 1vw, 14px)', lineHeight: 1.5 }}>
                  {msg.text}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* RIGHT — gauge + dimensions */}
      <div className="flex flex-col items-center justify-center" style={{ width: '52%', gap: 20, paddingRight: '5vw' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, scale: phase >= 1 ? 1 : 0.85 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ textAlign: 'center' }}
        >
          <ScoreGauge targetScore={694} phase={phase} />
          <motion.div
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4, padding: '4px 12px', borderRadius: 20, background: `${C}18`, border: `1px solid ${C}40` }}
            initial={{ opacity: 0 }} animate={{ opacity: phase >= 2 ? 1 : 0 }}
            transition={{ duration: 0.5, delay: 1.8 }}
          >
            <span style={{ color: C, fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-body)' }}>
              {lang === 'en' ? '▲ +12 pts this month' : '▲ +12 pts este mes'}
            </span>
          </motion.div>
        </motion.div>

        {/* 4 dimension bars */}
        <motion.div
          style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 8 }}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 16 }}
          transition={{ duration: 0.5 }}
        >
          {dims.map((d, i) => (
            <motion.div key={d.code}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: phase >= 3 ? 1 : 0, x: phase >= 3 ? 0 : 16 }}
              transition={{ duration: 0.4, delay: 0.08 * i }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: d.color, fontSize: 'clamp(11px, 1vw, 14px)' }}>{d.code}</span>
                  <span style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.45)', fontSize: 'clamp(9px, 0.75vw, 11px)' }}>{d.label}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.6)', fontSize: 'clamp(10px, 0.82vw, 12px)', fontWeight: 600 }}>{d.val}/100</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                <motion.div
                  style={{ height: '100%', borderRadius: 3, background: d.color }}
                  initial={{ width: '0%' }}
                  animate={{ width: phase >= 3 ? `${d.val}%` : '0%' }}
                  transition={{ duration: 0.8, delay: 0.1 * i, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.3)', fontSize: 'clamp(9px, 0.8vw, 11px)', textAlign: 'center' }}
          initial={{ opacity: 0 }} animate={{ opacity: phase >= 4 ? 1 : 0 }}
          transition={{ duration: 0.5 }}
        >
          {lang === 'en' ? 'PTI v5.0 · 90+ signals · Fair-lending certified July 2026' : 'PTI v5.0 · 90+ señales · Certificado fair-lending julio 2026'}
        </motion.p>
      </div>
    </motion.div>
  );
}
