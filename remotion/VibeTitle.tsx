import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig } from 'remotion';

export const compositionConfig = {
  id: 'VibeTitle',
  durationInFrames: 150,
  defaultProps: { title: 'TITLE', subtitle: 'subtitle', neonColor: '#00ffcc' },
};

export const VibeTitle: React.FC<{ title: string; subtitle: string; neonColor: string }> = ({ 
  title, 
  subtitle, 
  neonColor = '#ff00ff' 
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const scale = spring({ frame, fps, from: 0.8, to: 1, durationInFrames: 40 });
  const opacity = spring({ frame, fps, from: 0, to: 1, durationInFrames: 30 });
  const blur = spring({ frame, fps, from: 20, to: 0, durationInFrames: 30 });

  return (
    <AbsoluteFill style={{ backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ 
        transform: `scale(${scale})`, 
        opacity, 
        filter: `blur(${blur}px)`,
        textAlign: 'center' 
      }}>
        <h1 style={{ 
          fontSize: 140, 
          fontWeight: 900, 
          color: '#fff', 
          textShadow: `0 0 60px ${neonColor}, 0 0 20px ${neonColor}`, 
          margin: 0, 
          fontFamily: 'system-ui, -apple-system, sans-serif',
          letterSpacing: '-2px'
        }}>
          {title}
        </h1>
        <p style={{ 
          fontSize: 40, 
          color: '#aaa', 
          marginTop: 20, 
          fontFamily: 'ui-monospace, monospace', 
          letterSpacing: '12px',
          textTransform: 'uppercase'
        }}>
          {subtitle}
        </p>
      </div>
    </AbsoluteFill>
  );
};