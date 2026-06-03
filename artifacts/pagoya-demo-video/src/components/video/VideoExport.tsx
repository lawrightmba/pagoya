import { useState } from 'react';
import VideoTemplate from './VideoTemplate';
import logoPng from '@assets/pagoya_logo_transparent.png';

type Status = 'idle' | 'requesting' | 'recording' | 'done' | 'error';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export default function VideoExport() {
  const [status, setStatus] = useState<Status>('idle');
  const [showVideo, setShowVideo] = useState(false);
  const [error, setError] = useState('');
  const [fileSizeMb, setFileSizeMb] = useState('');

  const startExport = async () => {
    setStatus('requesting');
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
        preferCurrentTab: true,
      });

      // Prefer MP4 natively if the browser supports it (Chrome 122+), else WebM
      const mp4Supported = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1');
      const mimeType = mp4Supported
        ? 'video/mp4;codecs=avc1'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
      const chunks: Blob[] = [];

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 3_000_000, // 3 Mbps → ~65 MB for 3 min
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        const blob = new Blob(chunks, { type: mimeType });
        const mb = (blob.size / 1024 / 1024).toFixed(1);
        setFileSizeMb(mb);
        downloadBlob(blob, `pagoya-demo-en.${ext}`);
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

      {/* Pre-recording screen */}
      {!showVideo && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'white', padding: 32 }}>
          <img src={logoPng} alt="PagoYa" style={{ height: 72, marginBottom: 28, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 900, marginBottom: 12 }}>
            Download English Demo
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 16, lineHeight: 1.6, maxWidth: 480, marginBottom: 36 }}>
            Records the full ~3 min video in English and downloads it automatically when it ends.<br />
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
            }}
          >
            {status === 'requesting' ? 'Waiting for permission…' : 'Start Recording'}
          </button>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 16 }}>
            The file downloads automatically to your <strong style={{ color: 'rgba(255,255,255,0.45)' }}>Downloads folder</strong> when the video ends.
          </p>
        </div>
      )}

      {/* Recording indicator */}
      {status === 'recording' && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.8)', color: 'white',
          padding: '10px 22px', borderRadius: 24, fontSize: 13, zIndex: 10000,
          display: 'flex', alignItems: 'center', gap: 8, backdropFilter: 'blur(8px)',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF5C1A', display: 'inline-block', animation: 'rec-pulse 1.2s ease-in-out infinite' }} />
          Recording in English — ~3 min, don't switch tabs
        </div>
      )}

      {/* Success overlay */}
      {status === 'done' && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
        }}>
          <div style={{ background: '#004F2D', border: '1px solid #00C875', borderRadius: 20, padding: 40, textAlign: 'center', color: 'white', maxWidth: 440 }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 900, marginBottom: 8 }}>
              Download started!
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 20, fontSize: 15 }}>
              Your video ({fileSizeMb} MB) is in your <strong style={{ color: 'white' }}>Downloads folder</strong> — check the top-right of your browser for the download notification.
            </p>
            <div style={{ background: 'rgba(0,200,117,0.08)', border: '1px solid rgba(0,200,117,0.2)', borderRadius: 12, padding: '14px 18px', fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
              Need MP4 instead of WebM?{' '}
              <a href="https://cloudconvert.com/webm-to-mp4" target="_blank" rel="noopener noreferrer"
                style={{ color: '#00C875', textDecoration: 'underline' }}>
                Convert free at CloudConvert
              </a>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes rec-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
