import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLang } from '@/lib/lang';

// All coordinates are in SVG viewBox space: 0 0 1000 520
// Center PTI: (500, 260), radius 56
// Icon centers: TL=(120,90)  TR=(880,90)  BL=(120,430)  BR=(880,430)
// Icon box: 100×100, rounded
// Lines stop at circle edge and icon box edge

const CX = 500; // PTI center X
const CY = 260; // PTI center Y
const R = 56;   // PTI circle radius
const ICON_HALF = 50; // half of 100×100 icon box
const GAP = 6;  // gap between line endpoint and element edge

const ICON_POSITIONS = [
  { cx: 120, cy: 90, key: 'tl' },
  { cx: 880, cy: 90, key: 'tr' },
  { cx: 120, cy: 430, key: 'bl' },
  { cx: 880, cy: 430, key: 'br' },
];

function computeLine(icx: number, icy: number) {
  const dx = icx - CX;
  const dy = icy - CY;
  const mag = Math.hypot(dx, dy);
  const ux = dx / mag;
  const uy = dy / mag;
  // Icon box edge: clamp to the nearest face
  const tx = ux >= 0 ? ICON_HALF : -ICON_HALF;
  const ty = uy >= 0 ? ICON_HALF : -ICON_HALF;
  // Parametric intersection with box boundary (whichever face is closer)
  const tParamX = Math.abs(tx / ux);
  const tParamY = Math.abs(ty / uy);
  const tParam = Math.min(tParamX, tParamY);
  const ex = icx - ux * (tParam + GAP);
  const ey = icy - uy * (tParam + GAP);
  const sx = CX + ux * (R + GAP);
  const sy = CY + uy * (R + GAP);
  return { sx, sy, ex, ey };
}

const LINE_DELAY = [0, 0.15, 0.3, 0.45];

export function Scene4() {
  const t = useLang().scene4;
  const labels = [t.node1, t.node2, t.node3, t.node4];
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3500),
      setTimeout(() => setPhase(4), 6000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-40"
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Headline */}
      <motion.h2
        className="text-[4vw] font-bold text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
        transition={{ duration: 0.8 }}
      >
        {t.headline1}{' '}
        <span className="text-[#FF5C1A]">{t.headline2}</span>
        {t.headline3}
      </motion.h2>

      {/* Network graph — everything in ONE SVG */}
      <svg
        viewBox="0 0 1000 520"
        className="w-full max-w-4xl"
        style={{ maxHeight: '55vh' }}
      >
        {/* Lines */}
        {ICON_POSITIONS.map(({ cx, cy, key }, i) => {
          const { sx, sy, ex, ey } = computeLine(cx, cy);
          return (
            <motion.path
              key={key}
              d={`M ${sx.toFixed(1)} ${sy.toFixed(1)} L ${ex.toFixed(1)} ${ey.toFixed(1)}`}
              fill="none"
              stroke="#00C875"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={
                phase >= 3
                  ? { pathLength: 1, opacity: 1 }
                  : { pathLength: 0, opacity: 0 }
              }
              transition={{
                pathLength: { duration: 0.7, delay: LINE_DELAY[i], ease: [0.16, 1, 0.3, 1] },
                opacity: { duration: 0.2, delay: LINE_DELAY[i] },
              }}
            />
          );
        })}

        {/* Icon boxes */}
        {ICON_POSITIONS.map(({ cx, cy, key }, i) => (
          <motion.g
            key={key}
            initial={{ scale: 0, opacity: 0 }}
            animate={phase >= 3 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
            style={{ originX: `${cx}px`, originY: `${cy}px` }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: LINE_DELAY[i] + 0.1 }}
          >
            {/* Box */}
            <rect
              x={cx - ICON_HALF}
              y={cy - ICON_HALF}
              width={100}
              height={100}
              rx={16}
              ry={16}
              fill="rgba(255,255,255,0.08)"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="1.5"
            />
            {/* Inner dot */}
            <circle cx={cx} cy={cy} r={18} fill="#00C875" opacity={0.65} />
            {/* Label */}
            <text
              x={cx}
              y={cy + ICON_HALF + 28}
              textAnchor="middle"
              fill="white"
              fontSize={20}
              fontWeight="600"
              fontFamily="inherit"
            >
              {labels[i]}
            </text>
          </motion.g>
        ))}

        {/* Central PTI node */}
        {/* Glow */}
        <motion.circle
          cx={CX}
          cy={CY}
          r={R + 18}
          fill="none"
          stroke="#00C875"
          strokeWidth="6"
          opacity={0.25}
          initial={{ scale: 0 }}
          animate={phase >= 2 ? { scale: 1 } : { scale: 0 }}
          style={{ originX: `${CX}px`, originY: `${CY}px` }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        />
        <motion.circle
          cx={CX}
          cy={CY}
          r={R}
          fill="#005432"
          stroke="#00C875"
          strokeWidth="4"
          initial={{ scale: 0 }}
          animate={phase >= 2 ? { scale: 1 } : { scale: 0 }}
          style={{ originX: `${CX}px`, originY: `${CY}px` }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        />
        <motion.text
          x={CX}
          y={CY + 8}
          textAnchor="middle"
          fill="white"
          fontSize={26}
          fontWeight="700"
          fontFamily="inherit"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          PTI
        </motion.text>
      </svg>

      {/* Tagline */}
      <motion.p
        className="mt-4 text-[2vw] text-white/60 font-medium"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.8 }}
      >
        {t.tagline}
      </motion.p>
    </motion.div>
  );
}
