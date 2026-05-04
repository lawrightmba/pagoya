import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene0 } from './video_scenes/Scene0';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

export const SCENE_DURATIONS: Record<string, number> = {
  intro: 7000,
  query: 7000,
  autofill: 8000,
  payment: 8000,
  confirm: 7000,
  receipt: 8000,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  intro: Scene0,
  query: Scene1,
  autofill: Scene2,
  payment: Scene3,
  confirm: Scene4,
  receipt: Scene5,
};

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentScene, currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  return (
    <div className="w-full h-screen overflow-hidden relative bg-primary">
      {/* Ambient background */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute w-[800px] h-[800px] rounded-full opacity-30 blur-[100px] top-[-10%] left-[-10%]"
          style={{ background: 'var(--color-accent)' }}
          animate={{ x: ['0%', '30%', '0%'], y: ['0%', '20%', '0%'], scale: [1, 1.2, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-[80px] bottom-[-20%] right-[-10%]"
          style={{ background: 'var(--color-coral)' }}
          animate={{ x: ['0%', '-20%', '0%'], y: ['0%', '-30%', '0%'], scale: [1, 1.5, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        {/* Phone frame */}
        <motion.div
          className="relative w-[360px] h-[720px] bg-bg-light rounded-[3rem] phone-frame overflow-hidden"
          layout
        >
          {/* Status bar mock */}
          <div className="absolute top-0 w-full h-12 z-50 flex justify-between items-center px-8 text-xs font-medium text-text-primary bg-bg-light/80 backdrop-blur-md">
            <span>9:41</span>
            <div className="flex gap-1">
              <div className="w-4 h-3 bg-text-primary rounded-sm" />
              <div className="w-4 h-3 bg-text-primary rounded-sm" />
            </div>
          </div>

          <AnimatePresence initial={false} mode="wait">
            {SceneComponent && <SceneComponent key={currentSceneKey} />}
          </AnimatePresence>

          {/* Home indicator */}
          <div className="absolute bottom-2 w-full flex justify-center z-50">
            <div className="w-1/3 h-1 bg-text-primary/20 rounded-full" />
          </div>
        </motion.div>
      </div>

      {/* Copy overlay */}
      <div className="absolute bottom-16 left-0 w-full text-center pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.h2
            className="text-4xl font-display font-bold text-text-inverse tracking-tight drop-shadow-lg"
            key={baseSceneKey}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
          >
            {sceneIndex === 0 && "Paga cualquier recibo en México"}
            {sceneIndex === 1 && "¿Qué necesitas pagar hoy?"}
            {sceneIndex === 2 && "Autocompletado con IA"}
            {sceneIndex === 3 && "Múltiples métodos de pago"}
            {sceneIndex === 4 && "Confirmación instantánea"}
            {sceneIndex === 5 && "PagoYa. Paga en 2 minutos."}
          </motion.h2>
        </AnimatePresence>
      </div>
    </div>
  );
}
