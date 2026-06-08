import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLang } from '@/lib/lang';

// Container: 800×400, center at (400,200), central circle r=64, icon box half-size=40
// Icons at: TL=(160,80)  TR=(640,80)  BL=(160,320)  BR=(640,320)
// Line start = center node edge; line end = icon box edge (so lines don't overlap the icon)

const TL = { cx: 160, cy: 80 };
const TR = { cx: 640, cy: 80 };
const BL = { cx: 160, cy: 320 };
const BR = { cx: 640, cy: 320 };

function linePoints(icon: { cx: number; cy: number }) {
  const dx = icon.cx - 400;
  const dy = icon.cy - 200;
  const mag = Math.hypot(dx, dy);
  const ux = dx / mag;
  const uy = dy / mag;
  const x1 = 400 + ux * 68;  // start just past center circle edge (r=64 + 4px gap)
  const y1 = 200 + uy * 68;
  const x2 = icon.cx - ux * 44;  // end just before icon box edge (half=40 + 4px gap)
  const y2 = icon.cy - uy * 44;
  return { x1, y1, x2, y2 };
}

const LINE_DELAY = [0, 0.15, 0.3, 0.45];
const NODES = [
  { pos: TL, delayIdx: 0 },
  { pos: TR, delayIdx: 1 },
  { pos: BL, delayIdx: 2 },
  { pos: BR, delayIdx: 3 },
];

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
      setTimeout(() => setPhase(5), 11000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-40"
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.2 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.h2
        className="text-[4vw] font-bold text-center mb-16"
        initial={{ opacity: 0, y: -20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
      >
        {t.headline1} <span className="text-[#FF5C1A]">{t.headline2}</span>{t.headline3}
      </motion.h2>

      {/* Network graph: 800×400 relative container */}
      <div className="relative" style={{ width: 800, height: 400 }}>
        {/* SVG for lines — explicit viewBox so coordinates map 1:1 to the container */}
        <svg
          viewBox="0 0 800 400"
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 0 }}
        >
          {NODES.map(({ pos, delayIdx }) => {
            const { x1, y1, x2, y2 } = linePoints(pos);
            return (
              <motion.path
                key={`${pos.cx}-${pos.cy}`}
                d={`M ${x1} ${y1} L ${x2} ${y2}`}
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
                transition={{ duration: 0.8, delay: LINE_DELAY[delayIdx], ease: [0.16, 1, 0.3, 1] }}
              />
            );
          })}
        </svg>

        {/* Central PTI node — absolutely centered */}
        <motion.div
          className="absolute w-32 h-32 bg-[#005432] border-4 border-[#00C875] rounded-full flex items-center justify-center font-bold text-2xl shadow-[0_0_50px_#00C875]"
          style={{ left: '50%', top: '50%', transform: 'translate(-50%,-50%)', zIndex: 10 }}
          initial={{ scale: 0 }}
          animate={phase >= 2 ? { scale: 1 } : { scale: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          PTI
        </motion.div>

        {/* Orbiting icon nodes — positioned to match SVG coordinates exactly */}
        {NODES.map(({ pos, delayIdx }, i) => (
          <IconNode
            key={i}
            phase={phase}
            delay={LINE_DELAY[delayIdx]}
            cx={pos.cx}
            cy={pos.cy}
            label={labels[i]}
          />
        ))}
      </div>

      <motion.p
        className="mt-12 text-[2vw] text-white/60 font-medium"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      >
        {t.tagline}
      </motion.p>
    </motion.div>
  );
}

function IconNode({
  phase,
  delay,
  cx,
  cy,
  label,
}: {
  phase: number;
  delay: number;
  cx: number;
  cy: number;
  label: string;
}) {
  return (
    <motion.div
      className="absolute flex flex-col items-center"
      style={{
        left: cx,
        top: cy,
        transform: 'translate(-50%, -50%)',
        zIndex: 20,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={phase >= 3 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20, delay: delay + 0.1 }}
    >
      <div className="w-20 h-20 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 flex items-center justify-center mb-2">
        <div className="w-8 h-8 rounded-full bg-[#00C875]/50" />
      </div>
      <div className="text-lg font-semibold whitespace-nowrap">{label}</div>
    </motion.div>
  );
}
