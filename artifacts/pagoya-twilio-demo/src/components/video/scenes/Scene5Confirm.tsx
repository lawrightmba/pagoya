import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const C = '#00C875';
const TR = '#F22F46';

export function Scene5Confirm() {
  const [p, setP] = useState(0);
  const [showProcessing, setShowProcessing] = useState(false);
  const [showFolio, setShowFolio] = useState(false);
  const [showTwilioLabel, setShowTwilioLabel] = useState(false);
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const t = [
      setTimeout(() => setP(1), 300),
      setTimeout(() => setP(2), 1200),
      setTimeout(() => setShowProcessing(true), 2500),
      setTimeout(() => setShowFolio(true), 5500),
      setTimeout(() => setShowTwilioLabel(true), 7500),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (!showProcessing || showFolio) return;
    const iv = setInterval(() => setDots(d => (d + 1) % 4), 400);
    return () => clearInterval(iv);
  }, [showProcessing, showFolio]);

  const folio = 'PY-2026-447821';

  return (
    <motion.div className="absolute inset-0 flex"
      style={{ background: '#004F2D' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>

      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 55% 60% at 75% 50%, rgba(0,200,117,0.09) 0%, transparent 70%)' }} />

      {/* Left */}
      <div className="flex flex-col justify-center pl-[7vw]" style={{ width: '48%' }}>
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: p >= 1 ? 1 : 0, x: p >= 1 ? 0 : -16 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
            style={{ background: `${C}18`, border: `1px solid ${C}40` }}>
            <span style={{ color: C, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-body)' }}>
              Step 3 — Execution + Receipt
            </span>
          </div>

          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', fontSize: 'clamp(24px,3vw,42px)', lineHeight: 1.15, marginBottom: 14 }}>
            Folio delivered<br />via <span style={{ color: TR }}>Twilio</span> in seconds
          </h2>

          <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.55)', fontSize: 'clamp(12px,1.1vw,15px)', lineHeight: 1.65, maxWidth: '36ch', marginBottom: 24 }}>
            User confirms with "YES." Paula routes through SIPREL. CFE acknowledges. Twilio delivers the folio number back via WhatsApp — the same comprobante they'd get at OXXO.
          </p>

          <div className="flex flex-col gap-3">
            {[
              { t: 'Session state guards authorization', s: '\'YES\' / \'YEP\' / \'OK\' all accepted — Claude handles variants' },
              { t: 'Payment executed via SIPREL rail', s: 'Confirmation from CFE within seconds' },
              { t: 'Folio sent via Twilio WhatsApp API', s: 'Official receipt — verifiable against CFE records' },
            ].map((item, i) => (
              <motion.div key={i} className="flex gap-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: showFolio ? 1 : 0, x: showFolio ? 0 : -10 }}
                transition={{ duration: 0.4, delay: i * 0.18 }}>
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: C }} />
                <div>
                  <p style={{ fontFamily: 'var(--font-body)', color: 'white', fontSize: 'clamp(12px,1.05vw,14px)', fontWeight: 700, margin: 0 }}>{item.t}</p>
                  <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.45)', fontSize: 'clamp(10px,0.9vw,12px)', margin: '2px 0 0', lineHeight: 1.4 }}>{item.s}</p>
                </div>
              </motion.div>
            ))}
          </div>
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
              <p style={{ fontFamily: 'var(--font-body)', color: C, fontSize: 10, margin: 0 }}>● online</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 px-4 py-4" style={{ minHeight: 300 }}>
            {/* User YES */}
            <AnimatePresence>
              {p >= 2 && (
                <motion.div className="self-end"
                  initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
                  <div className="px-4 py-2 rounded-2xl rounded-tr-sm" style={{ background: '#005C4B' }}>
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: C, fontSize: 18, margin: 0 }}>YES ✓</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Processing */}
            <AnimatePresence>
              {showProcessing && !showFolio && (
                <motion.div className="self-start"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2" style={{ background: '#1F2C34' }}>
                    <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${C}80`, borderTopColor: 'transparent' }} />
                    <span style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                      Routing via SIPREL{''.padEnd(dots, '.')}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Folio receipt */}
            <AnimatePresence>
              {showFolio && (
                <motion.div className="self-start w-full"
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
                  <div className="rounded-2xl rounded-tl-sm overflow-hidden" style={{ background: '#1F2C34' }}>
                    <div className="px-3 py-2" style={{ background: `${C}20`, borderBottom: `1px solid ${C}30` }}>
                      <p style={{ fontFamily: 'var(--font-body)', color: C, fontSize: 11, fontWeight: 700, margin: 0 }}>
                        ✅ Payment confirmed by CFE
                      </p>
                    </div>
                    <div className="px-3 py-3">
                      <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.5)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 3px' }}>Folio de comprobante</p>
                      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', fontSize: 15, letterSpacing: '0.05em', margin: '0 0 8px' }}>{folio}</p>
                      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0 0 8px' }} />
                      <div className="flex justify-between">
                        <span style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>Amount paid</span>
                        <span style={{ fontFamily: 'var(--font-body)', color: 'white', fontSize: 10, fontWeight: 700 }}>$445 MXN</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>Delivered via</span>
                        <span style={{ fontFamily: 'var(--font-body)', color: TR, fontSize: 10, fontWeight: 700 }}>Twilio WhatsApp</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Twilio label */}
            <AnimatePresence>
              {showTwilioLabel && (
                <motion.div className="self-center mt-1"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                    style={{ background: `${TR}15`, border: `1px solid ${TR}30` }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: TR }} />
                    <span style={{ fontFamily: 'var(--font-body)', color: TR, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Sent via Twilio API
                    </span>
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
