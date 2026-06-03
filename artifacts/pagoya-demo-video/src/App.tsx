import VideoWithControls from "@/components/video/VideoWithControls";
import VideoExport from "@/components/video/VideoExport";

export default function App() {
  const isExport = new URLSearchParams(window.location.search).get('export') === 'true';
  return isExport ? <VideoExport /> : <VideoWithControls />;
}
