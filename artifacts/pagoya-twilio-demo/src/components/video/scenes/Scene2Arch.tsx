import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const C = '#00C875';
const TR = '#F22F46';

const LAYERS = [
  { icon: '📱', label: "User's WhatsApp", sub: '77M Mexicans — zero install friction', color: '#25D366', live: true },
  { icon: '↕', label: 'Twilio WhatsApp Business API', sub: 'Inbound webhook → PagoYa API server · Outbound receipt delivery', color: TR, live: true, isTwilio: true },
  { icon: '🤖', label: 'Paula — AI Agent (Claude)', sub: 'Intent parsing in plain Spanish · 2FA session state · Payment routing logic', color: '#7C5CFC', live: true },
  { icon: '💳', label: 'Payment Rails', sub: 'SIPREL · Conekta · STP · SPEI — 4 live rails, 30+ billers', color: C, live: true },
  { icon: '📄', label: 'Folio Receipt → Twilio WhatsApp', sub: 'Comprobante with unique folio delivered back to user via Twilio', color: TR, live: true, isTwilio: true },
  { icon: '📊', label: 'Predictive Trust Index (PTI)', sub: 'Behavioral credit score built from every transaction — the data moat', color: 'rgba(255,255,255,0.7)', live: false },
];

export function Scene2Arch() {
  const [p, setP] = useState(0);

  useEffect(() => {
    const timers = LAYERS.map((_, i) => setTimeout(() => setP(i + 1), 600 + i * 1500));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col justify-center items-center"
      style={{ background: '#004F2D' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>

      <motion.h2
        style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', fontSize: 'clamp(20px,2.5vw,34px)', marginBottom: 28, textAlign: 'center' }}
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        How it works — <span style={{ color: TR }}>Twilio</span> at every touchpoint
      </motion.h2>

      <div className="flex flex-col gap-0 w-full" style={{ maxWidth: 720, padding: '0 32px' }}>
        {LAYERS.map((layer, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: p > i ? 1 : 0, x: p > i ? 0 : -20 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
            <div className="flex items-stretch gap-0">
              {/* Left connector */}
              <div className="flex flex-col items-center" style={{ width: 40, flexShrink: 0 }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                  style={{ background: `${layer.color}22`, border: `2px solid ${layer.color}55`, zIndex: 1, position: 'relative' }}>
                  {layer.icon === '↕' ? <span style={{ color: layer.color, fontWeight: 900, fontSize: 13 }}>↕</span> : <span>{layer.icon}</span>}
                </div>
                {i < LAYERS.length - 1 && (
                  <div className="flex-1 w-0.5 my-1" style={{ background: `${LAYERS[i + 1].color}30`, minHeight: 12 }} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 rounded-xl px-4 py-3 mb-1 ml-2"
                style={{
                  background: layer.isTwilio ? `${TR}12` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${layer.isTwilio ? TR + '40' : 'rgba(255,255,255,0.08)'}`,
                }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, color: layer.isTwilio ? TR : layer.color === C ? C : 'white', fontSize: 'clamp(12px,1.1vw,14px)', margin: 0 }}>
                    {layer.label}
                  </p>
                  {layer.isTwilio && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{ background: `${TR}25`, color: TR, fontFamily: 'var(--font-body)', letterSpacing: '0.08em', fontSize: 10 }}>
                      TWILIO
                    </span>
                  )}
                  {layer.live && !layer.isTwilio && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ background: `${C}20`, color: C, fontFamily: 'var(--font-body)', fontSize: 10 }}>
                      live
                    </span>
                  )}
                </div>
                <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.45)', fontSize: 'clamp(10px,0.9vw,12px)', margin: '3px 0 0', lineHeight: 1.4 }}>
                  {layer.sub}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
