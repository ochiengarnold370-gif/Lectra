/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LECTRA Academic Splash Screen
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, Heart } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
  universityName?: string;
  programmeName?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  // State: false = opacity-0 scale-95, true = opacity-100 scale-100
  const [isRendered, setIsRendered] = useState<boolean>(false);

  useEffect(() => {
    // 1. Mount animation: transition from opacity-0 scale-95 to opacity-100 scale-100
    const mountTimer = setTimeout(() => {
      setIsRendered(true);
    }, 50);

    // 2. Exactly at the 5-second mark (5000ms), trigger the state transition to fade out
    const fiveSecondTimer = setTimeout(() => {
      setIsRendered(false);
      // Wait for the 1000ms transition to finish before unmounting via onComplete
      const unmountTimer = setTimeout(() => {
        onComplete();
      }, 1000);
      return () => clearTimeout(unmountTimer);
    }, 5000);

    return () => {
      clearTimeout(mountTimer);
      clearTimeout(fiveSecondTimer);
    };
  }, [onComplete]);

  const handleSkip = () => {
    setIsRendered(false);
    setTimeout(() => {
      onComplete();
    }, 400);
  };

  return (
    <div
      onClick={handleSkip}
      className={`fixed inset-0 bg-slate-950 flex items-center justify-center z-50 select-none cursor-pointer transition-all duration-1000 ease-in-out ${
        isRendered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
    >
      {/* Subtle radial ambient backglow */}
      <div className="absolute w-80 h-80 sm:w-[32rem] sm:h-[32rem] rounded-full bg-gradient-to-tr from-teal-500/15 to-cyan-500/10 blur-[120px] pointer-events-none" />

      {/* Center Hero: LECTRA in attractive, refined high-tracking typography */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-6xl sm:text-8xl md:text-9xl font-black tracking-[0.3em] font-serif bg-gradient-to-r from-teal-300 via-cyan-100 to-white bg-clip-text text-transparent drop-shadow-[0_0_45px_rgba(20,184,166,0.4)]">
          LECTRA
        </h1>
      </div>

      {/* Encouraging words for student at the bottom */}
      <div className="absolute bottom-8 sm:bottom-12 z-10 max-w-md text-center px-6 space-y-2 pointer-events-none">
        <div className="flex items-center justify-center space-x-2 text-teal-400">
          <Heart className="w-4 h-4 fill-teal-400 text-teal-400 animate-pulse" />
          <span className="text-xs uppercase font-bold tracking-widest text-teal-300">
            For Tomorrow&apos;s Healers
          </span>
          <Sparkles className="w-4 h-4 text-teal-400" />
        </div>
        <p className="text-xs sm:text-sm font-medium text-slate-300 leading-relaxed font-sans">
          &ldquo;Every lecture mastered brings you one step closer to healing lives. You&apos;ve got this, Nurse.&rdquo;
        </p>
      </div>
    </div>
  );
};
