import React, { useCallback } from 'react';
import Particles from 'react-particles';
import { loadFull } from 'tsparticles';
import styled, { keyframes } from 'styled-components';

// Animation for subtle pulsing glow
const pulseGlow = keyframes`
  0% { filter: drop-shadow(0 0 8px rgba(91, 91, 255, 0.7)); }
  50% { filter: drop-shadow(0 0 12px rgba(91, 91, 255, 0.9)); }
  100% { filter: drop-shadow(0 0 8px rgba(91, 91, 255, 0.7)); }
`;

// Styled component for the perspective grid
const PerspectiveGrid = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: transparent;
  perspective: 1000px;
  perspective-origin: 50% 50%;
  z-index: 0;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  /* Horizontal lines */
  &::before {
    background: linear-gradient(
      to bottom,
      rgba(91, 91, 255, 0.5) 0%, /* Increased opacity for visibility */
      transparent 0.5%,
      transparent 99.5%,
      rgba(91, 91, 255, 0.5) 100%
    );
    background-size: 100% 50px; /* Slightly denser grid */
    transform: rotateX(60deg);
    animation: ${pulseGlow} 3s ease-in-out infinite; /* Pulsing glow */
  }

  /* Vertical lines */
  &::after {
    background: linear-gradient(
      to right,
      rgba(91, 91, 255, 0.5) 0%,
      transparent 0.5%,
      transparent 99.5%,
      rgba(91, 91, 255, 0.5) 100%
    );
    background-size: 50px 100%;
    transform: rotateX(60deg);
    animation: ${pulseGlow} 3s ease-in-out infinite;
  }
`;

const NebulaBackground = () => {
  const particlesInit = useCallback(async (engine) => {
    await loadFull(engine);
  }, []);

  const particlesLoaded = useCallback(async (container) => {
    console.log('Particles loaded:', container);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100vh',
        background: '#0a0a0a',
        zIndex: -1,
      }}
    >
      <Particles
        id="tsparticles"
        init={particlesInit}
        loaded={particlesLoaded}
        options={{
          background: {
            color: {
              value: '#0a0a0a',
            },
          },
          fpsLimit: 60,
          particles: {
            number: {
              value: 70, // Slightly reduced for clarity
              density: {
                enable: true,
                value_area: 1000,
              },
            },
            color: {
              value: ['#5b5bff', '#ff5b5b', '#5bff5b', '#ff5bff'], // Brighter nebula colors
            },
            shape: {
              type: 'circle',
            },
            opacity: {
              value: { min: 0.2, max: 0.6 }, // Increased for visibility
              animation: {
                enable: true,
                speed: 0.5,
                sync: false,
              },
            },
            size: {
              value: { min: 0.8, max: 8 }, // Larger max size for emphasis
              animation: {
                enable: true,
                speed: 1.5,
                sync: false,
                startValue: 'random',
                destroy: 'none',
              },
            },
            links: {
              enable: true,
              distance: 100, // Tighter connections
              color: '#ffffff',
              opacity: 0.5, // More visible lines
              width: 1,
              shadow: {
                enable: true,
                blur: 8, // Stronger glow
                color: '#5b5bff',
              },
            },
            move: {
              enable: true,
              speed: { min: 0.2, max: 0.7 }, // Slightly faster for dynamic feel
              direction: 'none',
              random: true,
              straight: false,
              outModes: {
                default: 'bounce',
              },
              attract: {
                enable: true,
                rotateX: 800, // Enhanced perspective
                rotateY: 1600,
              },
            },
          },
          interactivity: {
            events: {
              onHover: {
                enable: true,
                mode: 'grab', // Changed to 'grab' for more engaging interaction
              },
              onClick: {
                enable: true,
                mode: 'push',
              },
            },
            modes: {
              grab: {
                distance: 150, // Stronger interaction
                links: {
                  opacity: 0.7, // More visible connections on hover
                },
              },
              push: {
                quantity: 3,
              },
            },
          },
          detectRetina: true,
        }}
      />
      <PerspectiveGrid />
    </div>
  );
};

export default NebulaBackground;