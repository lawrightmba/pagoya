import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const C = '#00C875';
const TR = '#F22F46';

const PRODUCTS = [
  {
    name: 'Twilio WhatsApp Business API',
    status: 'LIVE',
    color: TR,
    uses: [
      'All inbound user messages → webhook to PagoYa API server',
      'Outbound: payment quotes, 2FA prompts, folio receipts, alerts',
      'OTP delivery during phone number registration',
    ],
    icon: '💬',
    why: '77M Mexicans already on WhatsApp — zero install friction',
  },
  {
    name: 'Twilio Segment',
    status: 'ROADMAP Q3 2026',
    color: '#7C5CFC',
    uses: [
      'Every WhatsApp interaction → Segment event',
      'PTI score, payment streak, biller count → Segment traits',
      'Cohort activation for micro-credit pre-qualification',
      'Trust Score API licensing to lenders + insurers',
    ],
    icon: '📊',
    why: 'Transforms our behavioral database into a marketable data product',
  },
  {
    name: 'Twilio SendGrid',
    status: 'ROADMAP Q4 2026',
    color: '#00B4D8',
    uses: [
      'Formal receipt emails for INFONAVIT / landlord documentation',
      'Monthly PTI score reports for credit-building users',
    ],
    icon: '📧',
    why: 'For users who need a paper trail alongside the WhatsApp comprobante',
  },
];

export function Scene7TwilioStack() {
  const [p, setP] = useState(0);
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const t = [setTimeout(() => setP(1), 300)];
    PRODUCTS.forEach((_, i) => t.push(setTimeout(() => setVisible(i + 1), 700 + i * 2200)));
    return () => t.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col justify-center items-center"
      style={{ background: '#004F2D' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>

      <motion.div className="text-center mb-8"
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: p >= 1 ? 1 : 0, y: p >= 1 ? 0 : -12 }} transition={{ duration: 0.5 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', fontSize: 'clamp(22px,2.8vw,40px)', margin: '0 0 8px', lineHeight: 1.2 }}>
          How PagoYa uses the <span style={{ color: TR }}>Twilio Platform</span>
        </h2>
        <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.45)', fontSize: 'clamp(12px,1.1vw,15px)', margin: 0 }}>
          Three products · Two live today · One roadmap
        </p>
      </motion.div>

      <div className="flex gap-4 w-full" style={{ maxWidth: 860, padding: '0 32px' }}>
        {PRODUCTS.map((prod, i) => (
          <AnimatePresence key={prod.name}>
            {i < visible && (
              <motion.div className="flex-1 rounded-2xl p-5 flex flex-col"
                style={{ background: `${prod.color}10`, border: `1px solid ${prod.color}35` }}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>

                <div className="flex items-start justify-between mb-3">
                  <span style={{ fontSize: 24 }}>{prod.icon}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0"
                    style={{
                      background: prod.status === 'LIVE' ? `${C}25` : `${prod.color}20`,
                      color: prod.status === 'LIVE' ? C : prod.color,
                      fontFamily: 'var(--font-body)',
                      fontSize: 9,
                      letterSpacing: '0.08em',
                    }}>
                    {prod.status}
                  </span>
                </div>

                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: prod.color, fontSize: 'clamp(12px,1.1vw,14px)', margin: '0 0 12px', lineHeight: 1.3 }}>
                  {prod.name}
                </p>

                <ul className="flex flex-col gap-2 flex-1">
                  {prod.uses.map((use, j) => (
                    <motion.li key={j} className="flex gap-2"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.2 + j * 0.12 }}>
                      <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: prod.color }} />
                      <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.62)', fontSize: 'clamp(9px,0.85vw,11px)', margin: 0, lineHeight: 1.45 }}>{use}</p>
                    </motion.li>
                  ))}
                </ul>

                <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${prod.color}20` }}>
                  <p style={{ fontFamily: 'var(--font-body)', color: `${prod.color}CC`, fontSize: 'clamp(9px,0.85vw,11px)', margin: 0, fontStyle: 'italic', lineHeight: 1.4 }}>
                    "{prod.why}"
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>
    </motion.div>
  );
}
