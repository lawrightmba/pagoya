import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useLang } from '@/lib/video/LangContext';

const C = '#00C875';
const O = '#FF5C1A';

export function SceneStreetTeam() {
  const lang = useLang();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => setPhase(4), 3800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const nodes = [
    { label: 'Ana', emoji: '👩', x: '50%', y: '38%', isRep: true },
    { label: 'María', emoji: '👩‍🦳', x: '22%', y: '60%', isRep: false },
    { label: 'Jorge', emoji: '👨', x: '38%', y: '70%', isRep: false },
    { label: 'Rosa', emoji: '👩‍🦱', x: '62%', y: '70%', isRep: false },
    { label: 'Luis', emoji: '👨‍🦳', x: '78%', y: '60%', isRep: false },
    { label: '+16 más', emoji: '👥', x: '50%', y: '80%', isRep: false },
  ];

  const lines = [
    { x1: '50%', y1: '42%', x2: '24%', y2: '58%' },
    { x1: '50%', y1: '42%', x2: '39%', y2: '68%' },
    { x1: '50%', y1: '42%', x2: '61%', y2: '68%' },
    { x1: '50%', y1: '42%', x2: '76%', y2: '58%' },
    { x1: '50%', y1: '42%', x2: '50%', y2: '77%' },
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
        style={{ background: 'radial-gradient(ellipse 70% 60% at 70% 50%, rgba(232,99,26,0.10) 0%, transparent 65%)' }}
        animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 6, repeat: Infinity }} />

      {/* LEFT — headline */}
      <div className="flex flex-col justify-start pl-[7vw]" style={{ width: '42%', paddingTop: 100 }}>
        <motion.div
          className="inline-flex self-start items-center gap-2 px-3 py-1.5 rounded-full mb-5"
          style={{ background: `${O}18`, border: `1px solid ${O}40` }}
          initial={{ opacity: 0, x: -14 }} animate={{ opacity: phase >= 1 ? 1 : 0, x: phase >= 1 ? 0 : -14 }}
          transition={{ duration: 0.5 }}
        >
          <span style={{ color: O, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-body)' }}>
            {lang === 'en' ? '🤝 Street Team' : '🤝 Equipo de Campo'}
          </span>
        </motion.div>

        <div className="overflow-hidden mb-4" style={{ paddingTop: 10 }}>
          <motion.h2
            style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', lineHeight: 1.15, fontSize: 'clamp(20px, 2.6vw, 40px)' }}
            initial={{ y: '110%' }} animate={{ y: phase >= 1 ? '0%' : '110%' }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            {lang === 'en'
              ? <>Community<br /><span style={{ color: O }}>with skin</span><br />in the game.</>
              : <>Comunidad<br /><span style={{ color: O }}>con interés</span><br />propio.</>}
          </motion.h2>
        </div>

        {/* Earnings math */}
        {[
          {
            label: lang === 'en' ? '$5 MXN per payment' : '$5 MXN por pago',
            sub: lang === 'en' ? 'Rep earns on every recruit transaction' : 'El rep gana en cada pago de sus referidos',
            color: C,
          },
          {
            label: lang === 'en' ? '20 recruits × 4 bills/mo' : '20 referidos × 4 facturas/mes',
            sub: lang === 'en' ? '= $400 MXN/month passive income' : '= $400 MXN/mes ingreso pasivo',
            color: O,
          },
          {
            label: lang === 'en' ? 'Grows with network activity' : 'Crece con la actividad de la red',
            sub: lang === 'en' ? 'Rep earns more as recruits pay more' : 'El rep gana más a medida que sus referidos pagan más',
            color: '#818CF8',
          },
        ].map((item, i) => (
          <motion.div key={i}
            className="flex flex-col rounded-xl px-4 py-3 mb-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${item.color}30` }}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: phase >= 2 ? 1 : 0, x: phase >= 2 ? 0 : -14 }}
            transition={{ duration: 0.45, delay: 0.1 * i }}
          >
            <p style={{ fontFamily: 'var(--font-body)', color: item.color, fontWeight: 700, fontSize: 'clamp(12px, 1.1vw, 15px)' }}>{item.label}</p>
            <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.45)', fontSize: 'clamp(10px, 0.82vw, 12px)', marginTop: 2 }}>{item.sub}</p>
          </motion.div>
        ))}

        <motion.p
          style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(10px, 0.82vw, 12px)', marginTop: 6, fontStyle: 'italic' }}
          initial={{ opacity: 0 }} animate={{ opacity: phase >= 3 ? 1 : 0 }}
          transition={{ duration: 0.5 }}
        >
          {lang === 'en'
            ? '"Not a sales force. Community members who pay for users only when users pay us."'
            : '"No es una fuerza de ventas. Miembros de la comunidad que ganan solo cuando sus referidos pagan."'}
        </motion.p>
      </div>

      {/* RIGHT — network visualization */}
      <div className="relative flex items-center justify-center" style={{ width: '58%' }}>
        <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
          {lines.map((l, i) => (
            <motion.line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke={`${C}40`} strokeWidth={1.5} strokeDasharray="4 4"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: phase >= 2 ? 1 : 0, opacity: phase >= 2 ? 1 : 0 }}
              transition={{ duration: 0.6, delay: 0.08 * i }}
            />
          ))}
        </svg>
        {nodes.map((node, i) => (
          <motion.div key={node.label}
            className="absolute flex flex-col items-center"
            style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)' }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: phase >= 2 ? 1 : 0, scale: phase >= 2 ? 1 : 0.6 }}
            transition={{ duration: 0.45, delay: 0.12 * i, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="rounded-full flex items-center justify-center text-xl"
              style={{
                width: node.isRep ? 56 : 44,
                height: node.isRep ? 56 : 44,
                background: node.isRep ? `linear-gradient(135deg, #007A4A, ${C})` : 'rgba(255,255,255,0.08)',
                border: node.isRep ? `2px solid ${C}` : '1px solid rgba(255,255,255,0.15)',
                boxShadow: node.isRep ? `0 0 20px ${C}55` : 'none',
              }}>
              {node.emoji}
            </div>
            <span style={{ fontFamily: 'var(--font-body)', color: node.isRep ? C : 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: node.isRep ? 700 : 400, marginTop: 4 }}>
              {node.isRep ? (lang === 'en' ? 'Ana (Rep)' : 'Ana (Rep)') : node.label}
            </span>
            {node.isRep && (
              <motion.div className="absolute -top-7 rounded-full px-2 py-1"
                style={{ background: `${C}22`, border: `1px solid ${C}55` }}
                animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity }}
              >
                <span style={{ fontFamily: 'var(--font-body)', color: C, fontSize: 10, fontWeight: 700 }}>+$5 MXN</span>
              </motion.div>
            )}
          </motion.div>
        ))}
        {/* Floating earnings indicator */}
        <motion.div
          className="absolute bottom-[8%] right-[6%] rounded-2xl px-4 py-3"
          style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C}40` }}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: phase >= 4 ? 1 : 0, y: phase >= 4 ? 0 : 10 }}
          transition={{ duration: 0.5 }}
        >
          <p style={{ fontFamily: 'var(--font-display)', color: C, fontSize: 22, fontWeight: 900, lineHeight: 1 }}>7-day hold</p>
          <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 2 }}>
            {lang === 'en' ? 'Pay for users when they pay you' : 'Pagas por usuarios cuando ellos te pagan'}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
