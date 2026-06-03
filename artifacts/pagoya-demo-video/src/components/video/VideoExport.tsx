import { useState } from 'react';
import VideoTemplate from './VideoTemplate';
import logoPng from '@assets/pagoya_logo_transparent.png';

type Status = 'idle' | 'requesting' | 'recording' | 'converting' | 'done' | 'error';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export default function VideoExport() {
  const [status, setStatus] = useState<Status>('idle');
  const [showVideo, setShowVideo] = useState(false);
  const [error, setError] = useState('');
  const [convertProgress, setConvertProgress] = useState('Processing…');

  const startExport = async () => {
    setStatus('requesting');
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
        preferCurrentTab: true,
      });

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 4_000_000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        setStatus('converting');
        setConvertProgress('Uploading recording…');

        const blob = new Blob(chunks, { type: 'video/webm' });
        const mb = (blob.size / 1024 / 1024).toFixed(1);
        setConvertProgress(`Converting ${mb} MB WebM → MP4…`);

        try {
          const form = new FormData();
          form.append('video', blob, 'recording.webm');

          const res = await fetch(`${API_BASE}/video/convert`, {
            method: 'POST',
            body: form,
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(err.error ?? 'Conversion failed');
          }

          setConvertProgress('Downloading MP4…');
          const mp4Blob = await res.blob();
          const url = URL.createObjectURL(mp4Blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'pagoya-demo-en.mp4';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setStatus('done');
        } catch (err: any) {
          setError(err?.message ?? 'Conversion failed');
          setStatus('error');
        }
      };

      window.startRecording = async () => {
        recorder.start(1000);
        setStatus('recording');
      };

      window.stopRecording = () => {
        if (recorder.state !== 'inactive') recorder.stop();
        window.startRecording = undefined;
        window.stopRecording = undefined;
      };

      setShowVideo(true);
    } catch (err: any) {
      setError(err?.message || 'Permission denied or cancelled.');
      setStatus('error');
    }
  };

  const isWorking = status === 'requesting' || status === 'recording' || status === 'converting';

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#004F2D', position: 'relative', overflow: 'hidden' }}>
      {showVideo && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <VideoTemplate lang="en" />
        </div>
      )}

      {!showVideo && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'white', padding: 32 }}>
          <img src={logoPng} alt="PagoYa" style={{ height: 72, marginBottom: 28, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 900, marginBottom: 12 }}>
            Export English Demo
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 16, lineHeight: 1.6, maxWidth: 480, marginBottom: 36 }}>
            Records the full ~3 min video in English, converts to <strong style={{ color: '#00C875' }}>MP4</strong> automatically, then downloads.<br />
            Chrome will prompt you to share — click <em>"This Tab"</em> when asked.
          </p>
          {status === 'error' && (
            <p style={{ color: '#FF5C1A', marginBottom: 16, fontSize: 14 }}>{error}</p>
          )}
          <button
            onClick={startExport}
            disabled={isWorking}
            style={{
              background: isWorking ? 'rgba(0,200,117,0.4)' : '#00C875',
              color: '#003D1F',
              border: 'none',
              borderRadius: 14,
              padding: '15px 40px',
              fontSize: 16,
              fontWeight: 700,
              cursor: isWorking ? 'default' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {status === 'requesting' ? 'Waiting for permission…' : 'Start Recording'}
          </button>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 16 }}>
            Recording stops automatically when the video ends (~3 min), then converts server-side.
          </p>
        </div>
      )}

      {status === 'recording' && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.75)', color: 'white',
          padding: '8px 20px', borderRadius: 20, fontSize: 13, zIndex: 10000,
          display: 'flex', alignItems: 'center', gap: 8, backdropFilter: 'blur(8px)',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF5C1A', display: 'inline-block' }} />
          Recording… (~3 min — don't switch tabs)
        </div>
      )}

      {status === 'converting' && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
        }}>
          <div style={{ background: '#004F2D', border: '1px solid rgba(0,200,117,0.4)', borderRadius: 20, padding: 40, textAlign: 'center', color: 'white', maxWidth: 400 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚙️</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900, marginBottom: 12 }}>Converting to MP4…</h2>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14 }}>{convertProgress}</p>
            <div style={{ marginTop: 20, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#00C875', borderRadius: 2, width: '100%', animation: 'progress-slide 1.5s ease-in-out infinite' }} />
            </div>
          </div>
        </div>
      )}

      {status === 'done' && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
        }}>
          <div style={{ background: '#004F2D', border: '1px solid #00C875', borderRadius: 20, padding: 40, textAlign: 'center', color: 'white', maxWidth: 400 }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 900, marginBottom: 8 }}>Download started!</h2>
            <p style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 24 }}>
              <strong>pagoya-demo-en.mp4</strong> is in your downloads folder — under 100 MB, ready to attach to your YC application.
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes progress-slide {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
