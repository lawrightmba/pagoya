import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const C = '#00C875';
const TR = '#F22F46';

const SUMMARY = [
  { label: 'Twilio WhatsApp API', detail: 'Live — all inbound + outbound messaging', color: TR },
  { label: 'Twilio OTP via WhatsApp', detail: 'Live — phone verification during registration', color: TR },
  { label: 'Claude LLM (Anthropic)', detail: 'Live — intent parsing + 2FA session state', color: '#7C5CFC' },
  { label: '4 payment rails', detail: 'SIPREL · Conekta · STP · SPEI — 30+ billers', color: C },
  { label: 'Predictive Trust Index', detail: 'Behavioral credit score from every Twilio message', color: C },
  { label: 'Twilio Segment', detail: 'Roadmap Q3 2026 — behavioral CDP activation', color: '#7C5CFC' },
];

export function Scene8Close() {
  const [p, setP] = useState(0);

  useEffect(() => {
    const t = [
      setTimeout(() => setP(1), 300),
      setTimeout(() => setP(2), 800),
      setTimeout(() => setP(3), 1600),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ background: '#004F2D' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>

      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(0,200,117,0.09) 0%, transparent 70%)' }} />

      {/* Logo + name */}
      <motion.div className="text-center mb-8"
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: p >= 1 ? 1 : 0, y: p >= 1 ? 0 : -16 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(40px,5vw,72px)', color: 'white', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          Pago<span style={{ color: C }}>Ya</span>
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(13px,1.2vw,17px)', margin: '0 0 4px', letterSpacing: '0.06em' }}>
          WhatsApp-native · Twilio-powered · AI-first
        </p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className="w-2 h-2 rounded-full" style={{ background: TR }} />
          <span style={{ fontFamily: 'var(--font-body)', color: TR, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>
            Twilio AI Startup Searchlight
          </span>
        </div>
      </motion.div>

      {/* Summary grid */}
      <motion.div className="grid grid-cols-3 gap-3 w-full mb-8"
        style={{ maxWidth: 780, padding: '0 32px' }}
        initial={{ opacity: 0 }} animate={{ opacity: p >= 2 ? 1 : 0 }}
        transition={{ duration: 0.5 }}>
        {SUMMARY.map((item, i) => (
          <motion.div key={i} className="rounded-xl px-4 py-3"
            style={{ background: `${item.color}10`, border: `1px solid ${item.color}30` }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: p >= 2 ? 1 : 0, y: p >= 2 ? 0 : 12 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}>
            <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, color: item.color, fontSize: 11, margin: '0 0 3px' }}>{item.label}</p>
            <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.45)', fontSize: 10, margin: 0, lineHeight: 1.4 }}>{item.detail}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* URL + CTA */}
      <motion.div className="text-center"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: p >= 3 ? 1 : 0, y: p >= 3 ? 0 : 12 }}
        transition={{ duration: 0.5 }}>
        <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.35)', fontSize: 12, marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Live product
        </p>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(18px,2.2vw,28px)', color: C, margin: '0 0 4px', letterSpacing: '-0.01em' }}>
          pagoyamx.com
        </p>
        <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: 0 }}>
          $25 MXN flat · No app · No bank account required
        </p>
      </motion.div>
    </motion.div>
  );
}
