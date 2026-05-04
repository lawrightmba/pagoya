import { motion } from 'framer-motion';
import logoPng from '@assets/pagoya_logo_web_1774491466855.png';

const BILLERS = [
  { icon: "⚡", name: "CFE" },
  { icon: "📱", name: "Telcel" },
  { icon: "🌐", name: "Telmex" },
  { icon: "📺", name: "Izzi" },
  { icon: "📡", name: "Sky" },
  { icon: "🎬", name: "Netflix" },
  { icon: "🎵", name: "Spotify" },
  { icon: "💧", name: "Agua" },
  { icon: "🔥", name: "Gas" },
  { icon: "🏠", name: "Renta" },
  { icon: "🏛️", name: "Predial" },
  { icon: "🚗", name: "Tenencia" },
  { icon: "📡", name: "Totalplay" },
  { icon: "📱", name: "AT&T" },
  { icon: "🎮", name: "Recarga" },
];

const ROW1 = [...BILLERS, ...BILLERS, ...BILLERS];
const ROW2 = [...BILLERS, ...BILLERS, ...BILLERS];

function Pill({ icon, name }: { icon: string; name: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(255,255,255,0.09)',
        border: '1px solid rgba(255,255,255,0.16)',
        borderRadius: '999px',
        padding: '5px 13px 5px 9px',
        whiteSpace: 'nowrap',
        fontSize: '13px',
        fontWeight: 600,
        color: '#FFFFFF',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: '14px' }}>{icon}</span>
      {name}
    </span>
  );
}

export function Scene0() {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#0A2540' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.5 }}
    >
      {/* Teal ambient glow top */}
      <div
        className="absolute rounded-full blur-[70px] opacity-25 pointer-events-none"
        style={{ background: '#1D9E75', width: 260, height: 260, top: -40, left: '50%', transform: 'translateX(-50%)' }}
      />

      {/* Logo */}
      <motion.div
        className="bg-white rounded-2xl px-5 py-2 mb-4 z-10"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
      >
        <img src={logoPng} alt="PagoYa" className="w-28 h-auto" />
      </motion.div>

      {/* Headline */}
      <motion.h2
        className="text-xl font-bold text-white text-center z-10 mb-1"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        Paga cualquier recibo en México
      </motion.h2>

      <motion.p
        className="text-sm text-center mb-7 z-10"
        style={{ color: 'rgba(255,255,255,0.5)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        +500 servicios disponibles
      </motion.p>

      {/* Ticker rows */}
      <motion.div
        className="w-full z-10 space-y-2 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.75 }}
      >
        {/* Fade masks */}
        <div
          className="absolute inset-x-0 pointer-events-none z-20"
          style={{
            background: 'linear-gradient(to right, #0A2540 0%, transparent 60px, transparent calc(100% - 60px), #0A2540 100%)',
            top: 0,
            bottom: 0,
          }}
        />

        {/* Row 1 — scrolls left */}
        <div style={{ overflow: 'hidden' }}>
          <style>{`
            @keyframes s0TickerLeft  { from { transform: translateX(0); }    to { transform: translateX(-33.333%); } }
            @keyframes s0TickerRight { from { transform: translateX(-33.333%); } to { transform: translateX(0); } }
          `}</style>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              width: 'max-content',
              animation: 's0TickerLeft 18s linear infinite',
            }}
          >
            {ROW1.map((b, i) => <Pill key={`r1-${i}`} icon={b.icon} name={b.name} />)}
          </div>
        </div>

        {/* Row 2 — scrolls right */}
        <div style={{ overflow: 'hidden' }}>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              width: 'max-content',
              animation: 's0TickerRight 22s linear infinite',
            }}
          >
            {ROW2.map((b, i) => <Pill key={`r2-${i}`} icon={b.icon} name={b.name} />)}
          </div>
        </div>
      </motion.div>

      {/* CTA pill at bottom */}
      <motion.div
        className="mt-8 px-5 py-2 rounded-full font-semibold text-sm z-10"
        style={{ background: '#1D9E75', color: 'white' }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.0, type: 'spring' }}
      >
        Paga en 2 minutos ✓
      </motion.div>
    </motion.div>
  );
}
