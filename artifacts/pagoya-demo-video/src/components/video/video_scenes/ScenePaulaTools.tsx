import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useLang } from '@/lib/video/LangContext';

const C = '#00C875';

export function ScenePaulaTools() {
  const lang = useLang();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1400),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const tools = lang === 'en' ? [
    { icon: '💰', name: 'get_wallet_balance', desc: 'Real-time MXN balance from the DB' },
    { icon: '📋', name: 'get_payment_history', desc: 'Last transactions, narrated in Spanish' },
    { icon: '🏪', name: 'get_pending_oxxo', desc: 'OXXO cash-in status check' },
    { icon: '⭐', name: 'get_loyalty_points', desc: 'Points, tier, and next-level progress' },
    { icon: '📲', name: 'get_deposit_instructions', desc: 'OXXO / SPEI / card funding steps' },
    { icon: '⚡', name: 'prepare_bill_payment', desc: 'Stages payment + gift cards with 2FA' },
    { icon: '🤝', name: 'escalate_to_support', desc: 'Hands off to human with full context' },
  ] : [
    { icon: '💰', name: 'get_wallet_balance', desc: 'Saldo MXN en tiempo real de la DB' },
    { icon: '📋', name: 'get_payment_history', desc: 'Últimas transacciones narradas en español' },
    { icon: '🏪', name: 'get_pending_oxxo', desc: 'Estado de depósito OXXO pendiente' },
    { icon: '⭐', name: 'get_loyalty_points', desc: 'Puntos, nivel y progreso siguiente nivel' },
    { icon: '📲', name: 'get_deposit_instructions', desc: 'Pasos para cargar vía OXXO / SPEI / tarjeta' },
    { icon: '⚡', name: 'prepare_bill_payment', desc: 'Prepara pago de facturas y gift cards con 2FA' },
    { icon: '🤝', name: 'escalate_to_support', desc: 'Traspasa a agente humano con contexto completo' },
  ];

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden flex flex-col items-center justify-center px-[6vw]"
      style={{ background: '#071C2E' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(0,200,117,0.08) 0%, transparent 65%)' }}
        animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 7, repeat: Infinity }} />

      <motion.div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
        style={{ background: `${C}18`, border: `1px solid ${C}40` }}
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : -10 }}
        transition={{ duration: 0.4 }}
      >
        <span style={{ color: C, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-body)' }}>
          {lang === 'en' ? 'Paula · 7 Live Tools' : 'Paula · 7 Herramientas en Vivo'}
        </span>
      </motion.div>

      <div className="overflow-hidden mb-6">
        <motion.h2
          style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', textAlign: 'center', lineHeight: 1.0, fontSize: 'clamp(26px, 3.2vw, 48px)' }}
          initial={{ y: '110%' }} animate={{ y: phase >= 1 ? '0%' : '110%' }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          {lang === 'en' ? <>Paula takes <span style={{ color: C }}>real actions.</span><br />Not just answers.</> : <>Paula toma <span style={{ color: C }}>acciones reales.</span><br />No solo responde.</>}
        </motion.h2>
      </div>

      {/* Tools grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', width: '100%', maxWidth: 900 }}>
        {tools.map((tool, i) => (
          <motion.div key={tool.name}
            className="rounded-xl px-3 py-3"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${i === 5 ? C + '55' : 'rgba(255,255,255,0.08)'}`,
              gridColumn: i === 6 ? 'span 2' : 'span 1',
            }}
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: phase >= 2 ? 1 : 0, y: phase >= 2 ? 0 : 16, scale: phase >= 2 ? 1 : 0.92 }}
            transition={{ duration: 0.4, delay: 0.07 * i, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span style={{ fontSize: 16 }}>{tool.icon}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: i === 5 ? C : 'rgba(255,255,255,0.85)', fontSize: 'clamp(9px, 0.75vw, 11px)', fontWeight: 700 }}>{tool.name}</span>
            </div>
            <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.45)', fontSize: 'clamp(9px, 0.7vw, 11px)', lineHeight: 1.4 }}>{tool.desc}</p>
          </motion.div>
        ))}
      </div>

      <motion.p
        style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.3)', fontSize: 'clamp(10px, 0.85vw, 12px)', marginTop: 16, textAlign: 'center' }}
        initial={{ opacity: 0 }} animate={{ opacity: phase >= 3 ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      >
        {lang === 'en'
          ? 'In WhatsApp and in-app · localStorage session memory · post-payment retention hook · 2FA deterministic at session layer'
          : 'En WhatsApp y en la app · memoria de sesión en localStorage · hook de retención post-pago · 2FA determinista en capa de sesión'}
      </motion.p>
    </motion.div>
  );
}
