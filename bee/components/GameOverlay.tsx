import React from 'react';
import { GameStatus } from '../types';
import { Play, RotateCcw, Trophy, Loader2 } from 'lucide-react';

interface GameOverlayProps {
  status: GameStatus;
  score: number;
  onStart: () => void;
  report: string;
  isGeneratingReport: boolean;
}

const GameOverlay: React.FC<GameOverlayProps> = ({ 
  status, 
  score, 
  onStart, 
  report, 
  isGeneratingReport 
}) => {
  if (status === GameStatus.PLAYING) return null;

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-8 text-center animate-in fade-in duration-300">
      
      {status === GameStatus.MENU && (
        <div className="space-y-8 max-w-md">
          <h1 className="text-4xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 to-orange-600 retro-font leading-relaxed filter drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">
            GALACTIC<br/>BEE DEFENSE
          </h1>
          <p className="text-slate-300 font-mono text-sm md:text-base leading-relaxed">
            Defend Earth from the buzzing menace. Use <strong className="text-white">LEFT/RIGHT ARROWS</strong> to move and <strong className="text-white">SPACE</strong> to shoot.
          </p>
          <button 
            onClick={onStart}
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-full transition-all transform hover:scale-105 hover:shadow-[0_0_20px_rgba(79,70,229,0.5)]"
          >
            <Play className="w-5 h-5 fill-current" />
            <span className="tracking-wider">LAUNCH MISSION</span>
          </button>
        </div>
      )}

      {status === GameStatus.GAME_OVER && (
        <div className="space-y-6 max-w-lg w-full">
          <h2 className="text-5xl text-red-500 retro-font drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]">
            GAME OVER
          </h2>
          
          <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-lg backdrop-blur-md">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <span className="text-2xl font-bold text-white tracking-widest">{score}</span>
            </div>

            <div className="min-h-[80px] flex items-center justify-center text-left bg-black/40 p-4 rounded border border-slate-700/50">
              {isGeneratingReport ? (
                <div className="flex items-center gap-2 text-indigo-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-mono animate-pulse">Decoding Commander's Log...</span>
                </div>
              ) : (
                <p className="text-indigo-200 font-mono text-sm italic border-l-2 border-indigo-500 pl-3">
                  "{report}"
                </p>
              )}
            </div>
          </div>

          <button 
            onClick={onStart}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black hover:bg-gray-200 font-bold rounded-full transition-colors font-mono"
          >
            <RotateCcw className="w-4 h-4" />
            RETRY MISSION
          </button>
        </div>
      )}
    </div>
  );
};

export default GameOverlay;