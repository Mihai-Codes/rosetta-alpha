import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, OffthreadVideo, staticFile } from 'remotion';

export const compositionConfig = {
  id: 'GlassSplit',
  durationInFrames: 240,
  defaultProps: { videoSrc: '', title: 'TITLE', subtitle: 'subtitle', glowColor: '#00ffcc' },
};

export const GlassSplit: React.FC<{ videoSrc: string; title: string; subtitle: string; glowColor: string }> = ({ 
  videoSrc, 
  title, 
  subtitle,
  glowColor = '#00ffff'
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const slideX = spring({ frame, fps, from: -700, to: 0, durationInFrames: 35 });
  const textOpacity = spring({ frame: frame - 15, fps, from: 0, to: 1, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {videoSrc ? (
        <OffthreadVideo src={staticFile(videoSrc)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #0f2060 100%)' }} />
      )}
      
      <div style={{
        position: 'absolute', 
        left: 0, 
        top: 0, 
        bottom: 0, 
        width: 650,
        background: 'rgba(15, 15, 20, 0.45)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        borderRight: '1px solid rgba(255,255,255,0.15)',
        boxShadow: '10px 0 50px rgba(0,0,0,0.5)',
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        padding: 80,
        transform: `translateX(${slideX}px)`
      }}>
        <div style={{ opacity: textOpacity }}>
          <div style={{ 
            width: 80, 
            height: 6, 
            backgroundColor: glowColor, 
            marginBottom: 30,
            boxShadow: `0 0 20px ${glowColor}`
          }} />
          <h2 style={{ 
            fontSize: 90, 
            color: '#fff', 
            margin: 0, 
            fontWeight: 800,
            fontFamily: 'system-ui, -apple-system, sans-serif', 
            lineHeight: 1.1
          }}>
            {title}
          </h2>
          <p style={{ 
            fontSize: 36, 
            color: '#e1e1e1', 
            marginTop: 30, 
            lineHeight: 1.4,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 300
          }}>
            {subtitle}
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};