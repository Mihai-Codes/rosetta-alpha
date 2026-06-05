import { AbsoluteFill, OffthreadVideo, useCurrentFrame, spring, interpolate, useVideoConfig, staticFile } from 'remotion';

export const compositionConfig = {
  id: 'SplitLayout',
  durationInFrames: 240,
  defaultProps: { videoSrc: '', line1: 'Title', line2: 'Subtitle', line2Color: '#c9a87c', subtitle: '' },
};

export const SplitLayout: React.FC<{
  videoSrc: string;
  line1?: string;
  line2?: string;
  line2Color?: string;
  subtitle?: string;
}> = ({
  videoSrc,
  line1 = "Don't Use AI to",
  line2 = "Cheat Interviews",
  line2Color = '#c9a87c',
  subtitle = "Everyone is using AI to cheat tech interviews, but cheating won't build your",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Text animations
  const line1Y = spring({ frame, fps, from: 40, to: 0, durationInFrames: 25 });
  const line1Opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  const line2Y = spring({ frame, fps, from: 40, to: 0, durationInFrames: 25, delay: 8 });
  const line2Opacity = interpolate(frame, [8, 28], [0, 1], { extrapolateRight: 'clamp' });

  // Video panel slides in from right
  const videoX = spring({ frame, fps, from: 60, to: 0, durationInFrames: 30, delay: 3 });
  const videoOpacity = interpolate(frame, [3, 20], [0, 1], { extrapolateRight: 'clamp' });

  // Subtitle fades in
  const subOpacity = interpolate(frame, [20, 35], [0, 1], { extrapolateRight: 'clamp' });

  // Fade out at end — uses actual composition duration for correct timing
  const { durationInFrames } = useVideoConfig();
  const totalFrames = durationInFrames;
  const fadeOut = interpolate(frame, [totalFrames - 25, totalFrames], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      {/* Left: Big text */}
      <div style={{
        position: 'absolute', left: 80, top: 0, width: '48%', height: '100%',
        display: 'flex', alignItems: 'center',
        opacity: fadeOut,
      }}>
        <div>
          <div style={{
            fontSize: 72, color: '#ffffff', fontWeight: 700,
            fontFamily: 'Georgia, "Times New Roman", serif',
            lineHeight: 1.15,
            opacity: line1Opacity,
            transform: `translateY(${line1Y}px)`,
          }}>
            {line1}
          </div>
          <div style={{
            fontSize: 72, color: line2Color, fontWeight: 700,
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontStyle: 'italic',
            lineHeight: 1.15,
            opacity: line2Opacity,
            transform: `translateY(${line2Y}px)`,
          }}>
            {line2}
          </div>
        </div>
      </div>

      {/* Right: Video panel */}
      <div style={{
        position: 'absolute', right: 40, top: 40, bottom: 40, width: '45%',
        borderRadius: 16, overflow: 'hidden',
        opacity: videoOpacity * fadeOut,
        transform: `translateX(${videoX}px)`,
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      }}>
        {videoSrc ? (
          <OffthreadVideo
            src={staticFile(videoSrc)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }} />
        )}
        {/* Subtitle on video */}
        <div style={{
          position: 'absolute', bottom: 16, left: 16, right: 16,
          padding: '8px 12px',
          background: 'rgba(0,0,0,0.6)',
          borderRadius: 6,
          opacity: subOpacity,
        }}>
          <span style={{
            fontSize: 15, color: '#ffffff',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            lineHeight: 1.4,
          }}>
            {subtitle}
          </span>
        </div>
      </div>

      {/* Thin accent line at bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent 5%, ${line2Color}40 50%, transparent 95%)`,
        opacity: fadeOut,
      }} />
    </AbsoluteFill>
  );
};
