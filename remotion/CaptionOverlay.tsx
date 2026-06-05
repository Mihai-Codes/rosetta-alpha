/**
 * CaptionOverlay — Animated word-by-word captions over video.
 *
 * Uses @remotion/captions createTikTokStyleCaptions() for pagination,
 * spring() for word animations. The agent controls all creative decisions
 * via props — no React code needed.
 *
 * Usage via scene_tool:
 *   render_scene("CaptionOverlay", video="base.mp4", props={
 *     captionsJson: '[{"text":" Hello","startMs":0,"endMs":500,...}]',
 *     animation: "bounce",
 *     activeColor: "#FFD700",
 *     position: "center",
 *   })
 */

import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  Sequence,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from 'remotion';
import { createTikTokStyleCaptions, Caption } from '@remotion/captions';

// Props controlled by the agent
export interface CaptionOverlayProps {
  /** Background video filename (in public/) */
  videoSrc?: string;
  /** JSON string of Caption[] array (word-level timing from generate_subtitles) */
  captionsJson: string;
  /** Pacing: ms threshold for page grouping (300=word-by-word, 1200=phrases, 2000=sentences) */
  combineMs?: number;
  /** Animation style for active word */
  animation?: 'bounce' | 'fade' | 'slide' | 'none';
  /** Color of the active/spoken word (hex) */
  activeColor?: string;
  /** Color of inactive/surrounding words (hex) */
  inactiveColor?: string;
  /** Font size in pixels */
  fontSize?: number;
  /** Font family */
  fontFamily?: string;
  /** Caption position */
  position?: 'center' | 'bottom' | 'top';
  /** Background box behind active word */
  showBackground?: boolean;
  /** Text shadow for readability */
  textShadow?: string;
}

const DEFAULT_PROPS: Required<Omit<CaptionOverlayProps, 'captionsJson' | 'videoSrc'>> = {
  combineMs: 500,
  animation: 'bounce',
  activeColor: '#FFD700',
  inactiveColor: '#FFFFFF',
  fontSize: 56,
  fontFamily: 'Arial Black, Arial, sans-serif',
  position: 'bottom',
  showBackground: true,
  textShadow: '2px 2px 8px rgba(0,0,0,0.9)',
};

export const compositionConfig = {
  id: 'CaptionOverlay',
  durationInFrames: 300,
  defaultProps: { captionsJson: '[]', animation: 'bounce', activeColor: '#FFD700', inactiveColor: '#FFFFFF', fontSize: 56, position: 'bottom' },
};

// Position mapping — uses absolute positioning (not flex) because
// Remotion <Sequence> renders with position:absolute, breaking flex layout
const POSITION_STYLES: Record<string, React.CSSProperties> = {
  center: { top: '50%', transform: 'translateY(-50%)' },
  bottom: { bottom: 100, top: 'auto' },
  top: { top: 100, bottom: 'auto' },
};

/**
 * Renders a single page of captions with per-word animation.
 */
const CaptionPage: React.FC<{
  page: { text: string; startMs: number; tokens: Array<{ text: string; fromMs: number; toMs: number }> };
  animation: string;
  activeColor: string;
  inactiveColor: string;
  fontSize: number;
  fontFamily: string;
  showBackground: boolean;
  textShadow: string;
}> = ({ page, animation, activeColor, inactiveColor, fontSize, fontFamily, showBackground, textShadow }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Inside a <Sequence>, frame resets to 0 at sequence start
  const currentTimeMs = page.startMs + (frame / fps) * 1000;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: '80%',
        margin: '0 auto',
      }}
    >
      {page.tokens.map((token, i) => {
        const isActive = currentTimeMs >= token.fromMs && currentTimeMs < token.toMs;
        const wordStartFrame = ((token.fromMs - page.startMs) / 1000) * fps;

        // Animation calculations
        let scale = 1;
        let opacity = 1;
        let translateY = 0;

        if (isActive) {
          switch (animation) {
            case 'bounce': {
              const s = spring({
                frame: frame - wordStartFrame,
                fps,
                config: { damping: 10, mass: 0.5, stiffness: 200 },
              });
              scale = interpolate(s, [0, 1], [0.8, 1]);
              break;
            }
            case 'fade': {
              opacity = interpolate(
                frame - wordStartFrame,
                [0, 6],
                [0.3, 1],
                { extrapolateRight: 'clamp' },
              );
              break;
            }
            case 'slide': {
              const s = spring({
                frame: frame - wordStartFrame,
                fps,
                config: { damping: 12, mass: 0.6 },
              });
              translateY = interpolate(s, [0, 1], [15, 0]);
              break;
            }
            case 'none':
            default:
              break;
          }
        }

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              fontSize,
              fontFamily,
              fontWeight: 'bold',
              color: isActive ? activeColor : inactiveColor,
              transform: `scale(${scale}) translateY(${translateY}px)`,
              opacity,
              textShadow,
              padding: showBackground && isActive ? '4px 8px' : '2px 4px',
              backgroundColor: showBackground && isActive ? 'rgba(0,0,0,0.6)' : 'transparent',
              borderRadius: showBackground && isActive ? 6 : 0,
              transition: 'background-color 0.1s',
              whiteSpace: 'pre',
            }}
          >
            {token.text}
          </span>
        );
      })}
    </div>
  );
};

/**
 * Main component — renders video + animated captions.
 */
export const CaptionOverlay: React.FC<CaptionOverlayProps> = (props) => {
  const {
    videoSrc,
    captionsJson,
    combineMs = DEFAULT_PROPS.combineMs,
    animation = DEFAULT_PROPS.animation,
    activeColor = DEFAULT_PROPS.activeColor,
    inactiveColor = DEFAULT_PROPS.inactiveColor,
    fontSize = DEFAULT_PROPS.fontSize,
    fontFamily = DEFAULT_PROPS.fontFamily,
    position = DEFAULT_PROPS.position,
    showBackground = DEFAULT_PROPS.showBackground,
    textShadow = DEFAULT_PROPS.textShadow,
  } = props;

  const { fps } = useVideoConfig();

  // Parse captions from JSON string
  const captions: Caption[] = useMemo(() => {
    try {
      return JSON.parse(captionsJson);
    } catch {
      return [];
    }
  }, [captionsJson]);

  // Create TikTok-style pages
  const { pages } = useMemo(() => {
    if (captions.length === 0) return { pages: [] };
    return createTikTokStyleCaptions({
      captions,
      combineTokensWithinMilliseconds: combineMs,
    });
  }, [captions, combineMs]);

  const positionStyle = POSITION_STYLES[position] || POSITION_STYLES.center;

  return (
    <AbsoluteFill>
      {/* Background video */}
      {videoSrc && (
        <OffthreadVideo src={staticFile(videoSrc)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      )}

      {/* Caption sequences — positioned absolutely within the frame */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          ...positionStyle,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10,
        }}
      >
        {pages.map((page, index) => {
          const nextPage = pages[index + 1];
          const startFrame = Math.round((page.startMs / 1000) * fps);
          const endFrame = nextPage
            ? Math.round((nextPage.startMs / 1000) * fps)
            : startFrame + Math.round((page.durationMs / 1000) * fps);
          const durationInFrames = Math.max(1, endFrame - startFrame);

          return (
            <Sequence key={index} from={startFrame} durationInFrames={durationInFrames}>
              <CaptionPage
                page={page}
                animation={animation}
                activeColor={activeColor}
                inactiveColor={inactiveColor}
                fontSize={fontSize}
                fontFamily={fontFamily}
                showBackground={showBackground}
                textShadow={textShadow}
              />
            </Sequence>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
