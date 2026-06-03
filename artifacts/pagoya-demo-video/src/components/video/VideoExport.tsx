import { useState } from 'react';
import VideoTemplate from './VideoTemplate';
import logoPng from '@assets/pagoya_logo_transparent.png';

type Status = 'idle' | 'requesting' | 'recording' | 'processing' | 'done' | 'error';

export default function VideoExport() {
  const [status, setStatus] = useState<Status>('idle');
  const [showVideo, setShowVideo] = useState(false);
  const [error, setError] = useState('');

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
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        setStatus('processing');
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pagoya-demo-en.webm';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setStatus('done');
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
            Records the full ~3 min video in English as a <strong style={{ color: '#00C875' }}>WebM</strong> file you can download.<br />
            Chrome will prompt you to share — click <em>"This Tab"</em> when asked.
          </p>
          {status === 'error' && (
            <p style={{ color: '#FF5C1A', marginBottom: 16, fontSize: 14 }}>{error}</p>
          )}
          <button
            onClick={startExport}
            disabled={status === 'requesting'}
            style={{
              background: status === 'requesting' ? 'rgba(0,200,117,0.4)' : '#00C875',
              color: '#003D1F',
              border: 'none',
              borderRadius: 14,
              padding: '15px 40px',
              fontSize: 16,
              fontWeight: 700,
              cursor: status === 'requesting' ? 'default' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {status === 'requesting' ? 'Waiting for permission…' : 'Start Recording'}
          </button>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 16 }}>
            After selecting the tab, recording starts automatically and stops when the video ends.
          </p>
        </div>
      )}

      {showVideo && status === 'recording' && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.75)', color: 'white',
          padding: '8px 20px', borderRadius: 20, fontSize: 13, zIndex: 10000,
          display: 'flex', alignItems: 'center', gap: 8, backdropFilter: 'blur(8px)',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF5C1A', display: 'inline-block', animation: 'pulse 1.2s infinite' }} />
          Recording… (~3 min, please don't switch tabs)
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
              <strong>pagoya-demo-en.webm</strong> is in your downloads folder.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
              Open in VLC, QuickTime, or any video player to verify before submitting.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
