import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const C = '#00C875';
const TR = '#F22F46';

export function Scene3Register() {
  const [p, setP] = useState(0);
  const [typed, setTyped] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [otpTyped, setOtpTyped] = useState('');
  const [showVerified, setShowVerified] = useState(false);
  const [showBonus, setShowBonus] = useState(false);

  const msg = 'Hola, me quiero registrar';

  useEffect(() => {
    const t1 = setTimeout(() => setP(1), 400);
    const t2 = setTimeout(() => setP(2), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (p < 2) return;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTyped(msg.slice(0, i));
      if (i >= msg.length) clearInterval(iv);
    }, 60);
    return () => clearInterval(iv);
  }, [p]);

  useEffect(() => {
    if (typed.length < msg.length) return;
    const t1 = setTimeout(() => setShowOtp(true), 2000);
    return () => clearTimeout(t1);
  }, [typed]);

  useEffect(() => {
    if (!showOtp) return;
    const otp = '482716';
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setOtpTyped(otp.slice(0, i));
      if (i >= otp.length) clearInterval(iv);
    }, 200);
    const t1 = setTimeout(() => setShowVerified(true), 4500);
    const t2 = setTimeout(() => setShowBonus(true), 6500);
    return () => { clearInterval(iv); clearTimeout(t1); clearTimeout(t2); };
  }, [showOtp]);

  const msgs = [
    { from: 'paula', text: '👋 Welcome to PagoYa! I\'m Paula, your AI financial agent.\n\nI\'ll send a verification code to your WhatsApp to get you set up. Ready?' },
    { from: 'user', text: msg, typing: true },
  ];

  return (
    <motion.div className="absolute inset-0 flex"
      style={{ background: '#004F2D' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>

      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 50% 70% at 75% 50%, rgba(37,211,102,0.07) 0%, transparent 70%)' }} />

      {/* Left */}
      <div className="flex flex-col justify-center pl-[7vw]" style={{ width: '46%' }}>
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: p >= 1 ? 1 : 0, x: p >= 1 ? 0 : -16 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
            style={{ background: `${TR}18`, border: `1px solid ${TR}40` }}>
            <span style={{ color: TR, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-body)' }}>
              Step 1 — Registration
            </span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', fontSize: 'clamp(26px,3.2vw,46px)', lineHeight: 1.15, marginBottom: 16 }}>
            Verified via<br /><span style={{ color: TR }}>Twilio</span> WhatsApp OTP
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.55)', fontSize: 'clamp(13px,1.15vw,16px)', lineHeight: 1.65, maxWidth: '34ch', marginBottom: 24 }}>
            No email. No app store visit. Twilio delivers a 6-digit OTP directly inside WhatsApp — the only channel the user needs.
          </p>

          <div className="flex flex-col gap-3">
            {[
              { icon: '✅', text: 'Phone verified via Twilio WhatsApp OTP' },
              { icon: '🤖', text: 'Paula (Claude) guides the entire flow in Spanish' },
              { icon: '⚡', text: 'Account live in under 90 seconds' },
            ].map((item, i) => (
              <motion.div key={i} className="flex items-start gap-3"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: p >= 1 ? 1 : 0, x: p >= 1 ? 0 : -12 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.15 }}>
                <span style={{ fontSize: 16, marginTop: 2 }}>{item.icon}</span>
                <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.7)', fontSize: 'clamp(12px,1.05vw,14px)', margin: 0, lineHeight: 1.5 }}>{item.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right — Phone */}
      <div className="flex items-center justify-center" style={{ width: '54%' }}>
        <motion.div
          style={{ width: 'clamp(240px,26vw,320px)', background: '#111B21', borderRadius: 28, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.07)' }}
          initial={{ opacity: 0, y: 30, scale: 0.92 }}
          animate={{ opacity: p >= 1 ? 1 : 0, y: p >= 1 ? 0 : 30, scale: p >= 1 ? 1 : 0.92 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}>

          {/* WA header */}
          <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#1F2C34', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-base font-bold" style={{ background: `linear-gradient(135deg, #007A4A, ${C})` }}>P</div>
            <div>
              <p style={{ fontFamily: 'var(--font-body)', color: 'white', fontWeight: 700, fontSize: 13, margin: 0 }}>Paula · PagoYa</p>
              <p style={{ fontFamily: 'var(--font-body)', color: C, fontSize: 10, margin: 0 }}>● online</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 px-4 py-4" style={{ minHeight: 280 }}>
            {/* Paula greeting */}
            <AnimatePresence>
              {p >= 1 && (
                <motion.div className="self-start max-w-[88%]"
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4 }}>
                  <div className="px-3 py-2 rounded-2xl rounded-tl-sm" style={{ background: '#1F2C34' }}>
                    <p style={{ fontFamily: 'var(--font-body)', color: 'white', fontSize: 11.5, lineHeight: 1.5, margin: 0 }}>
                      👋 Welcome to PagoYa! I'm Paula.<br /><br />
                      <span style={{ color: 'rgba(255,255,255,0.65)' }}>I'll verify your number via WhatsApp. It only takes 90 seconds.</span>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* User message */}
            <AnimatePresence>
              {p >= 2 && (
                <motion.div className="self-end max-w-[80%]"
                  initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4 }}>
                  <div className="px-3 py-2 rounded-2xl rounded-tr-sm" style={{ background: '#005C4B' }}>
                    <p style={{ fontFamily: 'var(--font-body)', color: 'white', fontSize: 11.5, lineHeight: 1.4, margin: 0 }}>{typed}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* OTP message */}
            <AnimatePresence>
              {showOtp && (
                <motion.div className="self-start max-w-[90%]"
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4 }}>
                  <div className="px-3 py-2 rounded-2xl rounded-tl-sm" style={{ background: '#1F2C34' }}>
                    <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.65)', fontSize: 11, margin: '0 0 6px', lineHeight: 1.4 }}>
                      🔐 Your verification code (via Twilio):
                    </p>
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: C, fontSize: 22, letterSpacing: '0.25em', margin: 0 }}>
                      {otpTyped}
                      {otpTyped.length < 6 && <span className="animate-pulse" style={{ opacity: 0.5 }}>_</span>}
                    </p>
                    <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.35)', fontSize: 10, margin: '6px 0 0' }}>Expires in 5 minutes</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Verified */}
            <AnimatePresence>
              {showVerified && (
                <motion.div className="self-start max-w-[90%]"
                  initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45 }}>
                  <div className="px-3 py-2 rounded-2xl rounded-tl-sm" style={{ background: `${C}18`, border: `1px solid ${C}40` }}>
                    <p style={{ fontFamily: 'var(--font-body)', color: C, fontSize: 11.5, fontWeight: 700, margin: 0 }}>
                      ✅ Verified! Account ready.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bonus */}
            <AnimatePresence>
              {showBonus && (
                <motion.div className="self-start w-full"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}>
                  <div className="px-3 py-3 rounded-2xl rounded-tl-sm" style={{ background: 'linear-gradient(135deg, #005432, #007A4A)', border: `1px solid ${C}55` }}>
                    <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.7)', fontSize: 10, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Welcome bonus</p>
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: C, fontSize: 24, margin: 0 }}>$150 MXN 🎉</p>
                    <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.6)', fontSize: 10, margin: '4px 0 0' }}>Credited to your wallet. Ready to pay your first bill.</p>
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
