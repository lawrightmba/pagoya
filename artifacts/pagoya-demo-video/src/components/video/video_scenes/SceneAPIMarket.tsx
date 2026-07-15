import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useLang } from '@/lib/video/LangContext';

const C = '#00C875';

function TypedLine({ text, delay, color = 'rgba(255,255,255,0.85)', fontSize = 12 }: { text: string; delay: number; color?: string; fontSize?: number }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <motion.p
      style={{ fontFamily: 'var(--font-mono)', color, fontSize, lineHeight: 1.7, margin: 0 }}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: shown ? 1 : 0, x: shown ? 0 : -8 }}
      transition={{ duration: 0.3 }}
    >
      {text}
    </motion.p>
  );
}

export function SceneAPIMarket() {
  const lang = useLang();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 2600),
      setTimeout(() => setPhase(4), 4000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const buyers = lang === 'en' ? [
    { icon: '🏦', label: 'SOFOMs & Microfinance', desc: 'Underwrite thin-file borrowers' },
    { icon: '🛡️', label: 'Insurers', desc: 'Price micro-insurance risk' },
    { icon: '💳', label: 'Neobancos', desc: 'Credit lines from day one' },
    { icon: '🏘️', label: 'Proptech', desc: 'Tenant screening without payslips' },
  ] : [
    { icon: '🏦', label: 'SOFOMs & Microfinanzas', desc: 'Crédito para clientes sin historial' },
    { icon: '🛡️', label: 'Aseguradoras', desc: 'Pricing de riesgo en segmentos informales' },
    { icon: '💳', label: 'Neobancos', desc: 'Líneas de crédito desde el día uno' },
    { icon: '🏘️', label: 'Proptech', desc: 'Verificación de arrendatarios sin nómina' },
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
        style={{ background: 'radial-gradient(ellipse 70% 60% at 35% 50%, rgba(0,200,117,0.10) 0%, transparent 65%)' }}
        animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 6, repeat: Infinity }} />

      {/* LEFT — API terminal */}
      <div className="flex flex-col justify-center pl-[6vw]" style={{ width: '52%' }}>
        <motion.div className="inline-flex self-start items-center gap-2 px-3 py-1.5 rounded-full mb-4"
          style={{ background: `${C}18`, border: `1px solid ${C}40` }}
          initial={{ opacity: 0, x: -14 }} animate={{ opacity: phase >= 1 ? 1 : 0, x: phase >= 1 ? 0 : -14 }}
          transition={{ duration: 0.45 }}
        >
          <span style={{ color: C, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-body)' }}>
            {lang === 'en' ? 'PTI · B2B Data API' : 'PTI · API de Datos B2B'}
          </span>
        </motion.div>

        <div className="overflow-hidden mb-5">
          <motion.h2
            style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', lineHeight: 1.1, fontSize: 'clamp(28px, 3.5vw, 52px)' }}
            initial={{ y: '110%' }} animate={{ y: phase >= 1 ? '0%' : '110%' }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            {lang === 'en'
              ? <>One query.<br /><span style={{ color: C }}>One borrower</span><br />unlocked.</>
              : <>Una consulta.<br /><span style={{ color: C }}>Un prestatario</span><br />desbloqueado.</>}
          </motion.h2>
        </div>

        {/* Terminal block */}
        <motion.div
          style={{
            background: '#0D1117',
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.10)',
            maxWidth: 460,
          }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: phase >= 2 ? 1 : 0, y: phase >= 2 ? 0 : 16 }}
          transition={{ duration: 0.5 }}
        >
          {/* Terminal header */}
          <div style={{ padding: '8px 14px', background: '#161B22', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {['#FF5F57', '#FEBC2E', '#28C840'].map((c, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.8 }} />
            ))}
            <span style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.3)', fontSize: 11, marginLeft: 6 }}>pti-api · v5.0</span>
          </div>

          {/* Request */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <TypedLine text="# Request" delay={1100} color="rgba(255,255,255,0.3)" fontSize={11} />
            <TypedLine text={`GET /api/pti/score/{phone_hash}`} delay={1300} color={C} fontSize={12} />
            <TypedLine text="Authorization: Bearer {api_key}" delay={1500} color="rgba(255,255,255,0.45)" fontSize={11} />
          </div>

          {/* Response */}
          <div style={{ padding: '14px 18px' }}>
            <TypedLine text="# Response (200 OK)" delay={2000} color="rgba(255,255,255,0.3)" fontSize={11} />
            <TypedLine text="{" delay={2100} color="rgba(255,255,255,0.6)" fontSize={12} />
            <TypedLine text={`  "score": 694,`} delay={2250} color="rgba(255,255,255,0.85)" fontSize={12} />
            <TypedLine text={`  "tier": "Good",`} delay={2380} color="rgba(255,255,255,0.85)" fontSize={12} />
            <TypedLine text={`  "bureau_record": false,`} delay={2500} color="#FF5C1A" fontSize={12} />
            <TypedLine text={`  "dimensions": {`} delay={2620} color="rgba(255,255,255,0.85)" fontSize={12} />
            <TypedLine text={`    "PR": 78, "BC": 65, "ED": 71, "CF": 69`} delay={2750} color={C} fontSize={11} />
            <TypedLine text={`  }, "model": "v5.0", "signals": 90`} delay={2880} color="rgba(255,255,255,0.85)" fontSize={12} />
            <TypedLine text="}" delay={2980} color="rgba(255,255,255,0.6)" fontSize={12} />
          </div>
        </motion.div>

        <motion.div style={{ display: 'flex', gap: 10, marginTop: 14 }}
          initial={{ opacity: 0 }} animate={{ opacity: phase >= 2 ? 1 : 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {['OAuth 2.0', 'JSON', lang === 'en' ? 'Real-time' : 'Tiempo real', 'HTTPS'].map((tag, i) => (
            <div key={i} style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <span style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 500 }}>{tag}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* RIGHT — market + buyers */}
      <div className="flex flex-col justify-center pr-[6vw]" style={{ width: '48%', gap: 16 }}>
        {/* Big market stat */}
        <motion.div
          style={{ borderRadius: 16, padding: '20px 24px', background: `${C}0D`, border: `2px solid ${C}35`, position: 'relative', overflow: 'hidden' }}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, scale: phase >= 1 ? 1 : 0.9, y: phase >= 1 ? 0 : 20 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C }} />
          <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.45)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
            {lang === 'en' ? 'Addressable credit market blocked by data poverty' : 'Mercado crediticio bloqueado por falta de datos'}
          </p>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: C, fontSize: 'clamp(44px, 6vw, 76px)', lineHeight: 0.9 }}>$28B</p>
          <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 6 }}>
            {lang === 'en' ? 'USD · Mexico · thin-file borrowers' : 'USD · México · prestatarios sin historial'}
          </p>
        </motion.div>

        {/* Buyer grid */}
        <motion.p
          style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.35)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}
          initial={{ opacity: 0 }} animate={{ opacity: phase >= 3 ? 1 : 0 }}
          transition={{ duration: 0.4 }}
        >
          {lang === 'en' ? 'Who buys PTI data' : 'Quién compra datos PTI'}
        </motion.p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {buyers.map((b, i) => (
            <motion.div key={i}
              style={{ borderRadius: 10, padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              initial={{ opacity: 0, y: 14, scale: 0.93 }}
              animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 14, scale: phase >= 3 ? 1 : 0.93 }}
              transition={{ duration: 0.4, delay: 0.09 * i, ease: [0.22, 1, 0.36, 1] }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <span style={{ fontSize: 16 }}>{b.icon}</span>
                <span style={{ fontFamily: 'var(--font-body)', color: 'white', fontWeight: 600, fontSize: 'clamp(10px, 0.88vw, 13px)' }}>{b.label}</span>
              </div>
              <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(9px, 0.72vw, 11px)', lineHeight: 1.4 }}>{b.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          style={{ borderRadius: 10, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          initial={{ opacity: 0 }} animate={{ opacity: phase >= 4 ? 1 : 0 }}
          transition={{ duration: 0.5 }}
        >
          <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.38)', fontSize: 'clamp(10px, 0.82vw, 12px)', lineHeight: 1.6, fontStyle: 'italic', textAlign: 'center' }}>
            {lang === 'en'
              ? '"The borrower has been paying every month for years. PTI is the first system that can prove it."'
              : '"El prestatario ha pagado cada mes durante años. PTI es el primer sistema que puede demostrarlo."'}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
