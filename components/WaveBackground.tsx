"use client";

import React from "react";
import { useVolatilityEffect } from "@/hooks/useVolatilityEffect";

const WaveBackground: React.FC = () => {
  const { intensity } = useVolatilityEffect();

  return (
    <div className="absolute inset-0 z-0 overflow-hidden opacity-20">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1440 400"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        className="animate-pulse-subtle"
        style={{
          filter: `blur(${intensity * 2}px)`,
          transform: `scale(${1 + intensity * 0.02})`,
          transition: "all 0.3s ease-out",
        }}
      >
        {/* First wave */}
        <path
          d="M0,50 C120,100 240,0 360,50 C480,100 600,0 720,50 C840,100 960,0 1080,50 C1200,100 1320,0 1440,50 L1440,400 L0,400 Z"
          fill="url(#gradient1)"
          fillOpacity="0.4"
        />
        {/* Second wave */}
        <path
          d="M0,100 C120,150 240,50 360,100 C480,150 600,50 720,100 C840,150 960,50 1080,100 C1200,150 1320,50 1440,100 L1440,400 L0,400 Z"
          fill="url(#gradient2)"
          fillOpacity="0.3"
        />

        {/* Define gradients */}
        <defs>
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#019E8C" />
            <stop offset="100%" stopColor="#97B1AB" />
          </linearGradient>
          <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#344B47" />
            <stop offset="100%" stopColor="#019E8C" />
          </linearGradient>
          <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#97B1AB" />
            <stop offset="50%" stopColor="#B079B5" />
            <stop offset="100%" stopColor="#7B4780" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default WaveBackground;
