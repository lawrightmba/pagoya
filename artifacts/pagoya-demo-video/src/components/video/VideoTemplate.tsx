import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { LangProvider } from '@/lib/video/LangContext';
import type { Lang } from '@/lib/video/LangContext';
import { ScenePaula } from './video_scenes/ScenePaula';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';
import { SceneGiftCards } from './video_scenes/SceneGiftCards';
import { Scene7 } from './video_scenes/Scene7';
import { ScenePaulaTools } from './video_scenes/ScenePaulaTools';
import { Scene10 } from './video_scenes/Scene10';
import { Scene11 } from './video_scenes/Scene11';
import { SceneStreetTeam } from './video_scenes/SceneStreetTeam';
import { Scene13 } from './video_scenes/Scene13';
import logoPng from '@assets/pagoya_logo_transparent.png';

export const SCENE_DURATIONS: Record<string, number> = {
  scene1: 16000,
  scene2: 12000,
  scene3: 12000,
  scene4: 14000,
  scene5: 13000,
  scene6: 13000,
  scene7: 16000,
  scene8: 12000,
  scene9: 14000,
  scene10: 13000,
  scene11: 11000,
  scene12: 13000,
  scene13: 15000,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  scene1: ScenePaula,
  scene2: Scene2,
  scene3: Scene3,
  scene4: Scene4,
  scene5: Scene5,
  scene6: Scene6,
  scene7: SceneGiftCards,
  scene8: Scene7,
  scene9: ScenePaulaTools,
  scene10: Scene10,
  scene11: Scene11,
  scene12: SceneStreetTeam,
  scene13: Scene13,
};

const GX = ['0vw','20vw','-20vw','0vw','10vw','-10vw','0vw','20vw','-20vw','0vw','10vw','-10vw','0vw'];
const GY = ['0vh','-20vh','20vh','0vh','10vh','-10vh','0vh','-20vh','20vh','0vh','10vh','-10vh','0vh'];
const GS = [1,1.2,0.8,1,1.1,0.9,1,1.2,0.8,1,1.1,0.9,1];
const OX = ['20vw','-20vw','0vw','20vw','-10vw','10vw','20vw','-20vw','0vw','20vw','-10vw','10vw','20vw'];
const OY = ['20vh','0vh','-20vh','20vh','10vh','-10vh','20vh','0vh','-20vh','20vh','10vh','-10vh','20vh'];
const OS = [0.8,1,1.2,0.9,1.1,1,0.8,1,1.2,0.9,1.1,1,0.8];

interface VideoTemplateProps {
  durations?: Record<string, number>;
  loop?: boolean;
  onSceneChange?: (index: number, key: string) => void;
  lang?: Lang;
}

export default function VideoTemplate({ lang = 'es' }: VideoTemplateProps) {
  const { currentScene, currentSceneKey } = useVideoPlayer({ durations: SCENE_DURATIONS });
  const SceneComponent = SCENE_COMPONENTS[currentSceneKey];

  const showPhone = currentScene >= 3 && currentScene <= 5;

  return (
    <LangProvider lang={lang}>
      <div className="w-full h-screen overflow-hidden relative" style={{ backgroundColor: '#004F2D' }}>
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: '44px 44px',
          }}
        />

        <motion.div
          className="absolute w-[900px] h-[900px] rounded-full blur-[110px] opacity-[0.15] pointer-events-none mix-blend-screen"
          style={{ background: '#00C875' }}
          animate={{ x: GX[currentScene], y: GY[currentScene], scale: GS[currentScene] }}
          transition={{ duration: 3, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[650px] h-[650px] rounded-full blur-[90px] opacity-[0.14] pointer-events-none mix-blend-screen"
          style={{ background: '#FF5C1A' }}
          animate={{ x: OX[currentScene], y: OY[currentScene], scale: OS[currentScene] }}
          transition={{ duration: 4, ease: 'easeInOut' }}
        />

        <motion.div
          className="absolute top-5 left-7 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: currentScene === 0 || currentScene === 12 ? 0 : 1 }}
          transition={{ duration: 0.5 }}
        >
          <img src={logoPng} alt="PagoYa" style={{ height: '28px', width: 'auto', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))' }} />
        </motion.div>

        <AnimatePresence mode="popLayout">
          {SceneComponent && <SceneComponent key={currentSceneKey} />}
        </AnimatePresence>

        <motion.div
          className="absolute top-1/2 left-1/2 flex items-center justify-center pointer-events-none z-40"
          initial={{ y: '100vh', x: '12vw', rotate: 5, scale: 0.8, opacity: 0 }}
          animate={{
            y: showPhone ? '-50%' : '100vh',
            x: showPhone ? '12vw' : '12vw',
            rotate: showPhone ? 0 : 5,
            scale: showPhone ? 1 : 0.8,
            opacity: showPhone ? 1 : 0
          }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        >
          <div className="relative w-[340px] h-[690px] bg-[#F8FAFC] rounded-[3rem] overflow-hidden" style={{ boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)' }}>
            <div className="absolute top-0 w-full h-11 z-50 flex justify-between items-center px-7 text-xs font-medium text-[#0A2540] bg-[#F8FAFC]/90 backdrop-blur-sm">
              <span>9:41</span>
              <div className="flex gap-1">
                <div className="w-4 h-2.5 bg-[#0A2540] rounded-sm" />
                <div className="w-4 h-2.5 bg-[#0A2540] rounded-sm" />
              </div>
            </div>

            <div className="absolute inset-0 pt-14 px-5">
              <AnimatePresence mode="popLayout">
                {currentScene === 3 && (
                  <motion.div key="p-s4" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="h-full flex flex-col">
                    <h3 className="text-[#0A2540] font-bold text-xl mb-5" style={{ fontFamily: 'var(--font-display)' }}>{lang === 'en' ? "Hi! What are we paying?" : "Hola, ¿Qué pagamos hoy?"}</h3>
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                      <div className="w-2 h-5 rounded-full animate-pulse" style={{ background: '#00C875' }} />
                      <span className="text-gray-400 font-medium text-sm">{lang === 'en' ? 'pay my CFE electricity $350...' : 'pagar mi luz de CFE $350...'}</span>
                    </div>
                    <div className="mt-4 px-3 py-2 rounded-xl flex items-center gap-2" style={{ background: 'rgba(0,200,117,0.08)', border: '1px solid rgba(0,200,117,0.2)' }}>
                      <span style={{ color: '#00C875', fontSize: 12 }}>⚡ {lang === 'en' ? 'AI identifying service...' : 'IA identificando servicio...'}</span>
                    </div>
                  </motion.div>
                )}
                {currentScene === 4 && (
                  <motion.div key="p-s5" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="h-full flex flex-col">
                    <div className="rounded-xl p-3 mb-4 flex items-center gap-2" style={{ background: 'rgba(0,200,117,0.08)', border: '1px solid rgba(0,200,117,0.2)' }}>
                      <span style={{ color: '#00C875', fontSize: 13 }}>✨</span>
                      <span className="font-bold text-sm" style={{ color: '#007A4A' }}>{lang === 'en' ? 'AI Autocomplete' : 'Autocompletado con IA'}</span>
                    </div>
                    {[
                      { label: lang === 'en' ? 'Service' : 'Servicio', val: 'CFE — Electricidad' },
                      { label: lang === 'en' ? 'Amount' : 'Monto', val: '$350.00' },
                      { label: lang === 'en' ? 'Account No.' : 'No. Cuenta', val: '123 456 789 012' },
                    ].map((f, i) => (
                      <div key={i} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 mb-2">
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-0.5">{f.label}</p>
                        <p className="text-[#0A2540] font-bold" style={{ fontSize: i === 1 ? 20 : 15 }}>{f.val}</p>
                      </div>
                    ))}
                  </motion.div>
                )}
                {currentScene === 5 && (
                  <motion.div key="p-s6" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="h-full flex flex-col">
                    <h3 className="text-[#0A2540] font-bold text-lg mb-4" style={{ fontFamily: 'var(--font-display)' }}>{lang === 'en' ? 'Payment Method' : 'Método de pago'}</h3>
                    <div className="bg-white rounded-2xl p-3 shadow-sm mb-3 flex justify-between items-center" style={{ border: '2px solid #00C875' }}>
                      <div>
                        <p className="text-[#0A2540] font-bold text-sm">{lang === 'en' ? 'Cash at OXXO' : 'Efectivo en OXXO'}</p>
                        <p className="text-gray-400 text-xs">{lang === 'en' ? 'Barcode · +19,000 stores' : 'Código de barras · +19,000 tiendas'}</p>
                      </div>
                      <div className="w-4 h-4 rounded-full border-4" style={{ borderColor: '#00C875' }} />
                    </div>
                    <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex justify-between items-center opacity-50 mb-3">
                      <div>
                        <p className="text-[#0A2540] font-bold text-sm">{lang === 'en' ? 'Debit Card ···4092' : 'Tarjeta Terminación 4092'}</p>
                        <p className="text-gray-400 text-xs">Visa · Stripe Live ✅</p>
                      </div>
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                    </div>
                    <div className="mt-auto pb-8">
                      <div className="w-full py-3 text-white text-center font-bold rounded-2xl text-sm" style={{ background: '#00C875' }}>
                        {lang === 'en' ? 'Confirm Payment' : 'Confirmar Pago'}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="absolute bottom-2 w-full flex justify-center z-50">
              <div className="w-1/3 h-1 bg-[#0A2540]/15 rounded-full" />
            </div>
          </div>
        </motion.div>
      </div>
    </LangProvider>
  );
}
