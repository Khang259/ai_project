import React, { useCallback } from 'react';
import Particles from 'react-particles';
import { loadSlim } from 'tsparticles-slim';
import styled, { keyframes, css } from 'styled-components';

// Neon flicker animation for grid and text
const neonFlicker = keyframes`
  0% { filter: drop-shadow(0 0 8px rgba(0, 183, 235, 0.9)); opacity: 0.9; }
  4% { filter: drop-shadow(0 0 4px rgba(0, 183, 235, 0.5)); opacity: 0.5; }
  8% { filter: drop-shadow(0 0 10px rgba(0, 183, 235, 1)); opacity: 1; }
  10% { filter: drop-shadow(0 0 6px rgba(0, 183, 235, 0.7)); opacity: 0.7; }
  20% { filter: drop-shadow(0 0 8px rgba(0, 183, 235, 0.9)); opacity: 0.9; }
  100% { filter: drop-shadow(0 0 8px rgba(0, 183, 235, 0.9)); opacity: 0.9; }
`;

// Styled component for perspective grid
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

  &::before {
    background: linear-gradient(
      to bottom,
      rgba(0, 183, 235, 0.6) 0%,
      transparent 0.5%,
      transparent 99.5%,
      rgba(0, 183, 235, 0.6) 100%
    );
    background-size: 100% 50px;
    transform: rotateX(60deg);
    ${css`
      animation: ${neonFlicker} 2s infinite;
    `}
  }

  &::after {
    background: linear-gradient(
      to right,
      rgba(0, 183, 235, 0.6) 0%,
      transparent 0.5%,
      transparent 99.5%,
      rgba(0, 183, 235, 0.6) 100%
    );
    background-size: 50px 100%;
    transform: rotateX(60deg);
    ${css`
      animation: ${neonFlicker} 2s infinite;
    `}
  }
`;

// Styled component for text
const TextContainer = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #00b7eb;
  text-align: center;
  text-shadow: 0 0 10px rgba(0, 183, 235, 0.9);
  ${css`
    animation: ${neonFlicker} 2s infinite;
  `}
`;

const NebulaBackground = () => {
  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
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
              value: 50,
              density: {
                enable: true,
                value_area: 800,
              },
            },
            color: {
              value: ['#00b7eb', '#1e90ff', '#5b5bff'],
            },
            shape: {
              type: 'circle',
            },
            opacity: {
              value: { min: 0.3, max: 1 },
              animation: {
                enable: true,
                speed: 2,
                minimumValue: 0.3,
                sync: false,
                count: 1,
                startValue: 'random',
              },
            },
            size: {
              value: { min: 2, max: 10 },
              animation: {
                enable: true,
                speed: 3,
                minimumValue: 2,
                sync: false,
              },
            },
            links: {
              enable: true,
              distance: 120,
              color: '#00b7eb',
              opacity: 0.5,
              width: 1,
              shadow: {
                enable: true,
                blur: 10,
                color: '#00b7eb',
              },
            },
            move: {
              enable: true,
              speed: { min: 0.2, max: 0.8 },
              direction: 'none',
              random: true,
              straight: false,
              outModes: {
                default: 'bounce',
              },
              attract: {
                enable: true,
                rotateX: 800,
                rotateY: 1600,
              },
            },
          },
          interactivity: {
            events: {
              onHover: {
                enable: true,
                mode: 'grab',
              },
              onClick: {
                enable: true,
                mode: 'push',
              },
            },
            modes: {
              grab: {
                distance: 150,
                links: {
                  opacity: 0.8,
                },
              },
              push: {
                quantity: 2,
                particles: {
                  color: {
                    value: '#00b7eb',
                  },
                  size: {
                    value: 8,
                  },
                  shape: {
                    type: 'circle',
                  },
                  opacity: {
                    value: 1,
                  },
                },
              },
            },
          },
          detectRetina: true,
        }}
        style={{
          filter: 'drop-shadow(0 0 8px rgba(0, 183, 235, 0.7))',
        }}
      />
      <PerspectiveGrid />
      <TextContainer>
        <h1>Tech Nebula</h1>
        <p>Click to add neon blue spotlight particles!</p>
      </TextContainer>
    </div>
  );
};

export default NebulaBackground;