import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

export const compositionConfig = {
  id: 'TitleOverlay',
  durationInFrames: 120,
  defaultProps: { title: 'TITLE', subtitle: 'subtitle', accentColor: '#238636' },
};

export const TitleOverlay: React.FC<{
  title?: string;
  subtitle?: string;
  accentColor?: string;
}> = ({
  title = 'THE PROBLEM',
  subtitle = 'Everyone is using AI to cheat — but cheating won\'t build your career.',
  accentColor = '#238636',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slide up + fade in (first 0.8s = 24 frames at 30fps)
  const slideY = spring({ frame, fps, from: 60, to: 0, durationInFrames: 24 });
  const fadeIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  // Fade out (last 1s) — uses actual composition duration for correct timing
  const { durationInFrames } = useVideoConfig();
  const totalFrames = durationInFrames;
  const fadeOut = interpolate(frame, [totalFrames - 30, totalFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = Math.min(fadeIn, fadeOut);

  // Accent line grows
  const lineWidth = spring({ frame, fps, from: 0, to: 100, durationInFrames: 30, delay: 10 });

  // Title letters spread
  const letterSpacing = spring({ frame, fps, from: 20, to: 3, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <div
        style={{
          position: 'absolute',
          bottom: 100,
          left: 80,
          right: 80,
          padding: '18px 32px',
          background: 'rgba(0,0,0,0.55)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.06)',
          opacity,
          transform: `translateY(${slideY}px)`,
        }}
      >
        {/* Accent line */}
        <div
          style={{
            width: `${lineWidth}%`,
            height: 2,
            background: accentColor,
            marginBottom: 12,
            borderRadius: 1,
          }}
        />
        {/* Title */}
        <div
          style={{
            fontSize: 13,
            color: accentColor,
            fontFamily: 'ui-monospace, monospace',
            letterSpacing: `${letterSpacing}px`,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          {title}
        </div>
        {/* Subtitle */}
        <div
          style={{
            fontSize: 24,
            color: '#fff',
            fontWeight: 500,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </div>
      </div>
    </AbsoluteFill>
  );
};
