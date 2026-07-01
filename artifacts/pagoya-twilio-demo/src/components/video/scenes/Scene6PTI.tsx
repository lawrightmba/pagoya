import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const C = '#00C875';
const TR = '#F22F46';

const DIMS = [
  { label: 'Payment streak', value: 12, max: 30, icon: '🔥' },
  { label: 'Biller diversity', value: 4, max: 10, icon: '🏢' },
  { label: 'Wallet balance', value: 68, max: 100, icon: '💰' },
  { label: 'Load-to-spend ratio', value: 82, max: 100, icon: '📊' },
  { label: 'KYC verification', value: 100, max: 100, icon: '✅' },
  { label: 'Missions completed', value: 3, max: 10, icon: '🎯' },
  { label: 'Account age', value: 45, max: 365, icon: '📅' },
];

export function Scene6PTI() {
  const [p, setP] = useState(0);
  const [ptiScore, setPtiScore] = useState(0);
  const [visibleDims, setVisibleDims] = useState(0);

  useEffect(() => {
    const t = [
      setTimeout(() => setP(1), 300),
      setTimeout(() => setP(2), 1200),
    ];
    DIMS.forEach((_, i) => {
      t.push(setTimeout(() => setVisibleDims(i + 1), 2000 + i * 800));
    });
    t.push(setTimeout(() => {
      let score = 0;
      const iv = setInterval(() => {
        score += 2;
        setPtiScore(Math.min(score, 61));
        if (score >= 61) clearInterval(iv);
      }, 40);
    }, 2200));
    return () => t.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex"
      style={{ background: '#004F2D' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>

      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 50% 60% at 25% 50%, rgba(0,200,117,0.08) 0%, transparent 70%)' }} />

      {/* Left */}
      <div className="flex flex-col justify-center pl-[7vw]" style={{ width: '46%' }}>
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: p >= 1 ? 1 : 0, x: p >= 1 ? 0 : -16 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
            style={{ background: `${C}18`, border: `1px solid ${C}40` }}>
            <span style={{ color: C, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-body)' }}>
              The Data Moat
            </span>
          </div>

          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', fontSize: 'clamp(22px,2.8vw,40px)', lineHeight: 1.15, marginBottom: 14 }}>
            Predictive Trust Index<br /><span style={{ color: C }}>Built from every</span><br /><span style={{ color: C }}>Twilio message</span>
          </h2>

          <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.55)', fontSize: 'clamp(12px,1.05vw,14px)', lineHeight: 1.65, maxWidth: '36ch', marginBottom: 20 }}>
            Every WhatsApp interaction through Twilio is a behavioral data point. No competitor is building this because no competitor is having these conversations.
          </p>

          {/* PTI score */}
          <AnimatePresence>
            {p >= 2 && (
              <motion.div className="rounded-xl p-5"
                style={{ background: ptiScore >= 60 ? `${C}18` : 'rgba(255,255,255,0.06)', border: `1px solid ${ptiScore >= 60 ? C + '45' : 'rgba(255,255,255,0.12)'}`, transition: 'background 0.3s, border 0.3s' }}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
                <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px' }}>PTI Score</p>
                <div className="flex items-end gap-3">
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 52, color: ptiScore >= 60 ? C : 'white', lineHeight: 1, margin: 0, transition: 'color 0.3s' }}>
                    {ptiScore}
                  </p>
                  <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 8 }}>/ 100</p>
                </div>
                {ptiScore >= 60 && (
                  <motion.div className="mt-2 flex items-center gap-2"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                    <div className="px-2 py-1 rounded-full" style={{ background: `${C}25`, border: `1px solid ${C}50` }}>
                      <span style={{ fontFamily: 'var(--font-body)', color: C, fontSize: 10, fontWeight: 700 }}>🎉 Micro-credit unlocked</span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Right — 7 dimensions */}
      <div className="flex flex-col justify-center pr-[6vw] gap-2" style={{ width: '54%' }}>
        <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
          7 behavioral dimensions tracked
        </p>
        {DIMS.map((dim, i) => {
          const pct = Math.round((dim.value / dim.max) * 100);
          return (
            <motion.div key={dim.label}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: i < visibleDims ? 1 : 0, x: i < visibleDims ? 0 : 20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
              <div className="flex items-center gap-3">
                <span style={{ fontSize: 14, width: 22, textAlign: 'center', flexShrink: 0 }}>{dim.icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600 }}>{dim.label}</span>
                    <span style={{ fontFamily: 'var(--font-body)', color: C, fontSize: 11, fontWeight: 700 }}>{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${C}90, ${C})` }}
                      initial={{ width: 0 }}
                      animate={{ width: i < visibleDims ? `${pct}%` : 0 }}
                      transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}

        <motion.div className="mt-4 px-4 py-3 rounded-xl"
          style={{ background: `${TR}12`, border: `1px solid ${TR}30` }}
          initial={{ opacity: 0 }} animate={{ opacity: visibleDims >= 7 ? 1 : 0 }} transition={{ duration: 0.5 }}>
          <p style={{ fontFamily: 'var(--font-body)', color: TR, fontSize: 11, fontWeight: 700, margin: 0 }}>
            The credit file no bureau has ever built for this population — assembled entirely from Twilio WhatsApp interactions.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
