import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import GameOverlay from './components/GameOverlay';
import { GameState, GameStatus } from './types';
import { generateBattleReport } from './services/geminiService';
import { Rocket } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [score, setScore] = useState(0);
  const [finalReport, setFinalReport] = useState<string>('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const startGame = () => {
    setScore(0);
    setStatus(GameStatus.PLAYING);
    setFinalReport('');
  };

  const endGame = async (finalScore: number) => {
    setStatus(GameStatus.GAME_OVER);
    setScore(finalScore);
    setIsGeneratingReport(true);
    
    try {
      const report = await generateBattleReport(finalScore);
      setFinalReport(report);
    } catch (error) {
      console.error("Failed to generate report", error);
      setFinalReport("Communication link severed. No battle report available.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden flex flex-col items-center justify-center">
      
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black"></div>

      <div className="z-10 w-full max-w-4xl h-full max-h-[900px] relative aspect-[3/4] md:aspect-[4/3] shadow-2xl rounded-lg overflow-hidden border-4 border-slate-800 bg-black">
        
        {/* Header / HUD */}
        <div className="absolute top-0 left-0 w-full h-16 bg-slate-900/80 border-b border-slate-700 flex justify-between items-center px-6 z-20 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-yellow-400">
            <Rocket className="w-6 h-6" />
            <span className="retro-font text-xs md:text-sm tracking-widest">GALACTIC BEE</span>
          </div>
          <div className="text-white retro-font text-xs md:text-sm">
            SCORE: <span className="text-green-400">{score.toString().padStart(6, '0')}</span>
          </div>
        </div>

        {/* The Game Layer */}
        {status === GameStatus.PLAYING ? (
          <GameCanvas onGameOver={endGame} onScoreUpdate={setScore} />
        ) : null}

        {/* UI Overlay (Menu, Game Over) */}
        {status !== GameStatus.PLAYING && (
          <GameOverlay 
            status={status} 
            score={score} 
            onStart={startGame} 
            report={finalReport}
            isGeneratingReport={isGeneratingReport}
          />
        )}
      </div>
    </div>
  );
};

export default App;