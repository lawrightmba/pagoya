import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';
import { Scene7 } from './video_scenes/Scene7';
import { Scene8 } from './video_scenes/Scene8';
import { Scene9 } from './video_scenes/Scene9';
import { Scene10 } from './video_scenes/Scene10';
import { Scene11 } from './video_scenes/Scene11';
import { Scene12 } from './video_scenes/Scene12';
import logoPng from '@assets/pagoya_logo_transparent.png';

export const SCENE_DURATIONS: Record<string, number> = {
  scene1: 15000,
  scene2: 12000,
  scene3: 12000,
  scene4: 15000,
  scene5: 14000,
  scene6: 13000,
  scene7: 12000,
  scene8: 14000,
  scene9: 13000,
  scene10: 12000,
  scene11: 11000,
  scene12: 12000,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  scene1: Scene1,
  scene2: Scene2,
  scene3: Scene3,
  scene4: Scene4,
  scene5: Scene5,
  scene6: Scene6,
  scene7: Scene7,
  scene8: Scene8,
  scene9: Scene9,
  scene10: Scene10,
  scene11: Scene11,
  scene12: Scene12,
};

export default function VideoTemplate() {
  const { currentScene, currentSceneKey } = useVideoPlayer({ durations: SCENE_DURATIONS });
  const SceneComponent = SCENE_COMPONENTS[currentSceneKey];

  // Persistent Phone logic
  const showPhone = currentScene >= 3 && currentScene <= 6; // Scenes 4, 5, 6, 7

  return (
    <div className="w-full h-screen overflow-hidden relative" style={{ backgroundColor: '#0A2540' }}>
      {/* Subtle animated grid background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />
      
      {/* Two ambient glow orbs */}
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full blur-[100px] opacity-20 pointer-events-none mix-blend-screen"
        style={{ background: '#1D9E75' }}
        animate={{
          x: ['0vw', '20vw', '-20vw', '0vw', '10vw', '-10vw', '0vw', '20vw', '-20vw', '0vw', '10vw', '-10vw'][currentScene],
          y: ['0vh', '-20vh', '20vh', '0vh', '10vh', '-10vh', '0vh', '-20vh', '20vh', '0vh', '10vh', '-10vh'][currentScene],
          scale: [1, 1.2, 0.8, 1, 1.1, 0.9, 1, 1.2, 0.8, 1, 1.1, 0.9][currentScene]
        }}
        transition={{ duration: 3, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full blur-[80px] opacity-20 pointer-events-none mix-blend-screen"
        style={{ background: '#D85A30' }}
        animate={{
          x: ['20vw', '-20vw', '0vw', '20vw', '-10vw', '10vw', '20vw', '-20vw', '0vw', '20vw', '-10vw', '10vw'][currentScene],
          y: ['20vh', '0vh', '-20vh', '20vh', '10vh', '-10vh', '20vh', '0vh', '-20vh', '20vh', '10vh', '-10vh'][currentScene],
          scale: [0.8, 1, 1.2, 0.9, 1.1, 1, 0.8, 1, 1.2, 0.9, 1.1, 1][currentScene]
        }}
        transition={{ duration: 4, ease: 'easeInOut' }}
      />

      {/* Persistent Logo Mark */}
      <motion.div
        className="absolute top-6 left-8 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: currentScene === 2 || currentScene === 11 ? 0 : 1 }}
        transition={{ duration: 0.5 }}
      >
        <img src={logoPng} alt="PagoYa" style={{ height: '32px', width: 'auto', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }} />
      </motion.div>

      {/* Main Content inside AnimatePresence */}
      <AnimatePresence mode="popLayout">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>

      {/* Persistent Phone Mockup for Scenes 4-7 */}
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
        <div className="relative w-[360px] h-[720px] bg-[#F8FAFC] rounded-[3rem] phone-frame overflow-hidden pointer-events-auto">
          {/* Status bar mock */}
          <div className="absolute top-0 w-full h-12 z-50 flex justify-between items-center px-8 text-xs font-medium text-[#0A2540] bg-[#F8FAFC]/80 backdrop-blur-md">
            <span>9:41</span>
            <div className="flex gap-1">
              <div className="w-4 h-3 bg-[#0A2540] rounded-sm" />
              <div className="w-4 h-3 bg-[#0A2540] rounded-sm" />
            </div>
          </div>

          <div className="absolute inset-0 pt-16 px-6">
            <AnimatePresence mode="popLayout">
               {/* Phone internal scenes based on currentScene */}
               {currentScene === 3 && (
                 <motion.div key="p-s4" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="h-full flex flex-col">
                    <h3 className="text-[#0A2540] font-bold text-2xl mb-6">Hola, ¿Qué pagamos hoy?</h3>
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                       <div className="w-2 h-6 bg-[#1D9E75] rounded-full animate-pulse" />
                       <span className="text-gray-500 font-medium">pagar mi luz de CFE $350...</span>
                    </div>
                 </motion.div>
               )}
               {currentScene === 4 && (
                 <motion.div key="p-s5" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="h-full flex flex-col">
                    <div className="bg-[#1D9E75]/10 rounded-2xl p-4 mb-6 border border-[#1D9E75]/20 flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-[#1D9E75] flex items-center justify-center text-white">✨</div>
                       <span className="text-[#1D9E75] font-bold text-sm">Autocompletado con IA</span>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
                       <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Servicio</p>
                       <p className="text-[#0A2540] font-bold text-lg">CFE (Luz)</p>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                       <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Monto a pagar</p>
                       <p className="text-[#0A2540] font-black text-3xl">$350.00</p>
                    </div>
                 </motion.div>
               )}
               {currentScene === 5 && (
                 <motion.div key="p-s6" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="h-full flex flex-col">
                    <h3 className="text-[#0A2540] font-bold text-xl mb-6">Método de pago</h3>
                    <div className="bg-white rounded-2xl p-4 shadow-sm border-2 border-[#1D9E75] mb-4 flex justify-between items-center relative overflow-hidden">
                       <div className="absolute right-0 top-0 bottom-0 w-12 bg-[#1D9E75]/10" />
                       <div>
                         <p className="text-[#0A2540] font-bold">Efectivo en OXXO</p>
                         <p className="text-gray-500 text-sm">Código de barras</p>
                       </div>
                       <div className="w-5 h-5 rounded-full border-4 border-[#1D9E75] bg-white z-10" />
                    </div>
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex justify-between items-center opacity-60">
                       <div>
                         <p className="text-[#0A2540] font-bold">Tarjeta Terminación 4092</p>
                         <p className="text-gray-500 text-sm">Visa</p>
                       </div>
                       <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                    </div>
                    <div className="mt-auto pb-10">
                        <div className="w-full py-4 bg-[#1D9E75] text-white text-center font-bold rounded-2xl shadow-lg shadow-[#1D9E75]/30">Generar Código</div>
                    </div>
                 </motion.div>
               )}
               {currentScene === 6 && (
                 <motion.div key="p-s7" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="h-full flex flex-col items-center justify-center text-center pb-20">
                    <motion.div 
                        className="w-24 h-24 bg-[#1D9E75] rounded-full flex items-center justify-center mb-6 shadow-xl shadow-[#1D9E75]/40"
                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12, delay: 0.2 }}
                    >
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                            <motion.polyline points="20 6 9 17 4 12" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.5 }} />
                        </svg>
                    </motion.div>
                    <motion.h3 className="text-[#0A2540] font-bold text-2xl mb-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>¡Pago Exitoso!</motion.h3>
                    <motion.p className="text-gray-500" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>CFE • $350.00</motion.p>
                 </motion.div>
               )}
            </AnimatePresence>
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-2 w-full flex justify-center z-50">
            <div className="w-1/3 h-1 bg-[#0A2540]/20 rounded-full" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
