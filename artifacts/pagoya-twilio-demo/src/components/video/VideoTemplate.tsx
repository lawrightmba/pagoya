import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1Hook } from './scenes/Scene1Hook';
import { Scene2Arch } from './scenes/Scene2Arch';
import { Scene3Register } from './scenes/Scene3Register';
import { Scene4Payment } from './scenes/Scene4Payment';
import { Scene5Confirm } from './scenes/Scene5Confirm';
import { Scene6PTI } from './scenes/Scene6PTI';
import { Scene7TwilioStack } from './scenes/Scene7TwilioStack';
import { Scene8Close } from './scenes/Scene8Close';

export const SCENE_DURATIONS: Record<string, number> = {
  scene1: 15000,
  scene2: 16000,
  scene3: 16000,
  scene4: 15000,
  scene5: 15000,
  scene6: 14000,
  scene7: 14000,
  scene8: 10000,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  scene1: Scene1Hook,
  scene2: Scene2Arch,
  scene3: Scene3Register,
  scene4: Scene4Payment,
  scene5: Scene5Confirm,
  scene6: Scene6PTI,
  scene7: Scene7TwilioStack,
  scene8: Scene8Close,
};

const SCENE_START_SEC: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  let cumulativeMs = 0;
  for (const [key, ms] of Object.entries(SCENE_DURATIONS)) {
    out[key] = cumulativeMs / 1000;
    cumulativeMs += ms;
  }
  return out;
})();

const AUDIO_SEEK_EPSILON_SEC = 0.18;

interface Props {
  durations?: Record<string, number>;
  loop?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
}

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  muted = false,
  onSceneChange,
}: Props = {}) {
  const { currentScene, currentSceneKey } = useVideoPlayer({ durations, loop });

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '');
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  return (
    <div className="w-full h-screen overflow-hidden relative" style={{ background: '#004F2D' }}>
      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.035]" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }} />

      {/* Scene */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSceneKey}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55 }}
        >
          {SceneComponent && <SceneComponent />}
        </motion.div>
      </AnimatePresence>

      {/* Scene counter badge */}
      <div className="absolute top-5 right-6 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.12)' }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.1em' }}>
          {sceneIndex + 1} / {Object.keys(SCENE_DURATIONS).length}
        </span>
      </div>

      {/* Twilio badge */}
      <div className="absolute top-5 left-6 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{ background: 'rgba(242,47,70,0.15)', border: '1px solid rgba(242,47,70,0.35)' }}>
        <div className="w-2 h-2 rounded-full" style={{ background: '#F22F46' }} />
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#F22F46', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Powered by Twilio + AI
        </span>
      </div>

      {/* Audio */}
      <audio
        src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`}
        preload="auto"
        autoPlay
        muted={muted}
        style={{ display: 'none' }}
      />
    </div>
  );
}
