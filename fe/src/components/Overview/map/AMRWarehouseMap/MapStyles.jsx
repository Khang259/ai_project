import React from 'react';

/**
 * MapStyles component for managing all map-related CSS styles
 * @param {Object} props - Component props
 * @param {number} props.robotAngle - Current robot angle for animation
 * @returns {JSX.Element} - Style element with CSS
 */
const MapStyles = ({ robotAngle = 0 }) => {
  const angleInDegrees = robotAngle * 180 / Math.PI;
  
  return (
    <style>
      {`
        /* Robot animation keyframes */
        @keyframes float {
          0%, 100% { 
            transform: translateY(0px) rotate(${angleInDegrees}deg); 
          }
          50% { 
            transform: translateY(-3px) rotate(${angleInDegrees}deg); 
          }
        }
        
        /* AMR/AGV circular icon styles */
        .amr-circular-icon {
          transition: all 0.3s ease-in-out;
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
          image-rendering: pixelated;
          background: transparent;
        }
        
        .amr-circular-icon img {
          background: transparent !important;
          border: none !important;
          outline: none !important;
        }
        
        .amr-circular-icon:hover {
          transform: scale(1.1);
          filter: drop-shadow(0 6px 20px rgba(0,0,0,0.9));
        }
        
        /* Fix for PNG transparency issues */
        .leaflet-marker-icon {
          background: transparent !important;
        }
        
        .leaflet-marker-icon img {
          background: transparent !important;
          image-rendering: auto;
        }
        
        /* Camera marker styles */
        .camera-marker-icon {
          transition: transform 0.2s ease;
        }
        
        .camera-marker-icon:hover {
          transform: scale(1.1);
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.8));
        }
        
        .camera-tooltip {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 12px;
          padding: 4px 8px;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid #ddd;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        /* Node icon styles */
        .supply-point-icon,
        .return-point-icon,
        .regular-node-icon {
          transition: transform 0.2s ease;
        }
        
        .supply-point-icon:hover,
        .return-point-icon:hover,
        .regular-node-icon:hover {
          transform: scale(1.1);
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.8));
        }
        
        .node-tooltip {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 12px;
          padding: 4px 8px;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid #ddd;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        /* Path styles */
        .scenario-path {
          stroke-linecap: round;
          stroke-linejoin: round;
          pointer-events: none;
        }
        
        .path-glow {
          pointer-events: none;
          filter: blur(2px);
        }
        
        /* Grid node styles */
        .grid-node {
          pointer-events: all;
          cursor: pointer;
        }
        
        /* Map wrapper styles */
        .map-wrapper {
          position: relative;
          width: 100%;
          height: 40vh;
          background: #1a1a1a;
          border-radius: 8px;
          overflow: hidden;
        }
        
        /* Leaflet overrides for dark theme */
        .leaflet-container {
          background: #1a1a1a;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .leaflet-control-zoom {
          border: 1px solid #333 !important;
        }
        
        .leaflet-control-zoom a {
          background: rgba(40, 40, 40, 0.9) !important;
          color: #fff !important;
          border-bottom: 1px solid #333 !important;
        }
        
        .leaflet-control-zoom a:hover {
          background: rgba(60, 60, 60, 0.9) !important;
        }
        
        /* Popup and tooltip styles */
        .leaflet-popup-content-wrapper {
          background: rgba(40, 40, 40, 0.95);
          color: #fff;
          border-radius: 6px;
          box-shadow: 0 3px 10px rgba(0,0,0,0.4);
        }
        
        .leaflet-popup-tip {
          background: rgba(40, 40, 40, 0.95);
        }
        
        .leaflet-tooltip {
          background: rgba(40, 40, 40, 0.95);
          color: #fff;
          border: 1px solid #333;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        
        /* Custom scrollbar for map container */
        .map-wrapper::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        .map-wrapper::-webkit-scrollbar-track {
          background: #1a1a1a;
        }
        
        .map-wrapper::-webkit-scrollbar-thumb {
          background: #444;
          border-radius: 4px;
        }
        
        .map-wrapper::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
        
        /* Animation for marker appearance */
        @keyframes markerAppear {
          from {
            opacity: 0;
            transform: scale(0.5);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .leaflet-marker-icon {
          animation: markerAppear 0.3s ease-out;
        }
      `}
    </style>
  );
};

export default MapStyles;
