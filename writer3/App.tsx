import React, { useState, useEffect } from 'react';
import { EssayConfig, EssayGenre, AppStatus } from './types';
import { autoPlanEssay, generateEssayContent, generateSpeech } from './services/geminiService';
import { audioBufferToWav, decodeGeminiAudio } from './utils/audioUtils';
import AudioPlayer from './components/AudioPlayer';
import ApiKeyInput from './components/ApiKeyInput';

const DEFAULT_CONFIG: EssayConfig = {
  title: '',
  summary: '',
  genre: EssayGenre.NARRATIVE,
  paragraphCount: 4,
  paragraphSummaries: ['', '', '', ''],
  wordCount: 500
};

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [config, setConfig] = useState<EssayConfig>(DEFAULT_CONFIG);
  const [status, setStatus] = useState<AppStatus>('idle');
  const [essayContent, setEssayContent] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSaveKey = (key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setApiKey(key);
  };
  
  const handleClearKey = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    setEssayContent('');
    setAudioUrl(null);
  };

  // Handle paragraph count changes specifically to resize the summaries array
  const handleParagraphCountChange = (count: number) => {
    const newSummaries = [...config.paragraphSummaries];
    if (count > newSummaries.length) {
      for (let i = newSummaries.length; i < count; i++) {
        newSummaries.push('');
      }
    } else {
      newSummaries.splice(count);
    }
    setConfig({ ...config, paragraphCount: count, paragraphSummaries: newSummaries });
  };

  const handleAutoPlan = async () => {
    if (!config.title || !config.summary) {
      setError("請先輸入作文題目和文章大意");
      return;
    }
    setError(null);
    setStatus('planning');
    try {
      const plan = await autoPlanEssay(config.title, config.summary, apiKey);
      setConfig(prev => ({ ...prev, ...plan }));
    } catch (e: any) {
      setError(e.message || "規劃失敗，請重試");
    } finally {
      setStatus('idle');
    }
  };

  const handleGenerateEssay = async () => {
    setError(null);
    setStatus('generating');
    setAudioUrl(null);
    setAudioBlob(null);
    try {
      const content = await generateEssayContent(config, apiKey);
      setEssayContent(content);
    } catch (e: any) {
      setError(e.message || "文章生成失敗");
    } finally {
      setStatus('idle');
    }
  };

  const handleGenerateSpeech = async () => {
    if (!essayContent) return;
    setError(null);
    setStatus('synthesizing');
    try {
      const base64Audio = await generateSpeech(essayContent, apiKey);
      
      // Decode and convert to WAV Blob
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      const audioBuffer = await decodeGeminiAudio(base64Audio, audioContext);
      const wavBlob = audioBufferToWav(audioBuffer);
      
      const url = URL.createObjectURL(wavBlob);
      setAudioBlob(wavBlob);
      setAudioUrl(url);
    } catch (e: any) {
      console.error(e);
      setError("語音生成失敗: " + e.message);
    } finally {
      setStatus('idle');
    }
  };

  const copyToClipboard = () => {
    const text = `
作文題目：${config.title}
文章大意：${config.summary}
文章文體：${config.genre}
段落數量：${config.paragraphCount}
預計字數：${config.wordCount}

段落大意：
${config.paragraphSummaries.map((s, i) => `第${i + 1}段：${s}`).join('\n')}

---
${essayContent}
    `.trim();
    navigator.clipboard.writeText(text).then(() => {
      alert("已複製到剪貼簿！");
    });
  };

  const downloadAudio = () => {
      if (audioUrl) {
          const a = document.createElement('a');
          a.href = audioUrl;
          a.download = `${config.title || 'essay'}.wav`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
      }
  };

  const downloadHtml = () => {
    if (!essayContent) return;
    
    // If we have audio, convert blob to base64 to embed
    const finalizeDownload = (audioSrc: string) => {
        const htmlContent = `
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${config.title}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2rem; background: #f9fafb; color: #111827; }
  h1 { color: #1e40af; text-align: center; margin-bottom: 2rem; }
  .meta-box { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 2rem; }
  .meta-item { margin-bottom: 0.5rem; }
  .label { font-weight: bold; color: #4b5563; }
  .essay-content { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); font-family: "Noto Serif TC", serif; white-space: pre-wrap; font-size: 1.125rem; }
  .audio-section { margin-top: 2rem; padding: 1rem; background: #e0e7ff; border-radius: 8px; text-align: center; }
  audio { width: 100%; max-width: 500px; margin-top: 0.5rem; }
</style>
</head>
<body>
  <h1>${config.title}</h1>
  
  <div class="meta-box">
    <div class="meta-item"><span class="label">文章大意：</span>${config.summary}</div>
    <div class="meta-item"><span class="label">文體：</span>${config.genre}</div>
    <div class="meta-item"><span class="label">段落數量：</span>${config.paragraphCount}</div>
    <div class="meta-item"><span class="label">預計字數：</span>${config.wordCount}</div>
    <div class="meta-item">
      <span class="label">各段大意：</span>
      <ul style="margin: 0.5rem 0 0 1rem; padding: 0;">
        ${config.paragraphSummaries.map(s => `<li>${s}</li>`).join('')}
      </ul>
    </div>
  </div>

  <div class="essay-content">
    ${essayContent}
  </div>

  ${audioSrc ? `
  <div class="audio-section">
    <h3>語音朗讀</h3>
    <audio controls src="${audioSrc}"></audio>
    <br>
    <a href="${audioSrc}" download="${config.title}.wav">下載語音檔案</a>
  </div>` : ''}
</body>
</html>
        `;
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${config.title || 'essay'}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (audioBlob) {
        const reader = new FileReader();
        reader.onloadend = () => {
            finalizeDownload(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
    } else {
        finalizeDownload('');
    }
  };

  if (!apiKey) return <ApiKeyInput onSave={handleSaveKey} />;

  return (
    <div className="min-h-screen pb-12">
      <header className="bg-indigo-700 text-white py-6 shadow-md">
        <div className="max-w-5xl mx-auto px-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">智能作文自動生成網站</h1>
            <p className="mt-2 text-indigo-100">AI 輔助寫作，從規劃到語音朗讀</p>
          </div>
          <button onClick={handleClearKey} className="text-xs bg-indigo-800 hover:bg-indigo-900 px-3 py-1 rounded text-indigo-200">重設 Key</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Inputs */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">作文規劃</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">1. 作文題目</label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  placeholder="例如：難忘的一次旅行"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">2. 文章大意</label>
                <textarea
                  value={config.summary}
                  onChange={(e) => setConfig({ ...config, summary: e.target.value })}
                  placeholder="簡述你想寫的內容方向..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
              </div>

              <button
                onClick={handleAutoPlan}
                disabled={status !== 'idle'}
                className="w-full py-2 px-4 bg-indigo-50 text-indigo-700 font-semibold rounded-md hover:bg-indigo-100 transition-colors flex items-center justify-center"
              >
                {status === 'planning' ? (
                   <span className="flex items-center"><svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> AI 自動規劃</span>
                ) : "✨ AI 自動規劃內容"}
              </button>

              <hr className="border-slate-100 my-4" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">3. 文章文體</label>
                  <select
                    value={config.genre}
                    onChange={(e) => setConfig({ ...config, genre: e.target.value as EssayGenre })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {Object.values(EssayGenre).map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">4. 段落數 (1-8)</label>
                  <select
                    value={config.paragraphCount}
                    onChange={(e) => handleParagraphCountChange(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                      <option key={n} value={n}>{n} 段</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">6. 預計字數</label>
                <input
                  type="number"
                  value={config.wordCount}
                  onChange={(e) => setConfig({ ...config, wordCount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">5. 各段大意</label>
                <div className="max-h-60 overflow-y-auto pr-1 space-y-2">
                  {config.paragraphSummaries.map((summary, index) => (
                    <div key={index}>
                      <span className="text-xs text-slate-500 mb-1 block">第 {index + 1} 段</span>
                      <textarea
                        value={summary}
                        onChange={(e) => {
                          const newSummaries = [...config.paragraphSummaries];
                          newSummaries[index] = e.target.value;
                          setConfig({ ...config, paragraphSummaries: newSummaries });
                        }}
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerateEssay}
                disabled={status !== 'idle'}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-sm transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'generating' ? '文章生成中...' : '開始產生文章'}
              </button>
              
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">
                  {error}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Result */}
        <div className="lg:col-span-7">
          <section className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 min-h-[600px] flex flex-col">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex justify-between items-center">
              <span>文章預覽</span>
              {essayContent && (
                <div className="flex space-x-2">
                  <button 
                    onClick={copyToClipboard}
                    className="text-sm px-3 py-1.5 border border-slate-300 rounded hover:bg-slate-50 text-slate-600 transition"
                  >
                    複製文章
                  </button>
                  <button 
                    onClick={downloadHtml}
                    className="text-sm px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 transition"
                  >
                    下載文章 (HTML)
                  </button>
                </div>
              )}
            </h2>

            {essayContent ? (
              <div className="flex-1 flex flex-col">
                 <div className="prose prose-slate max-w-none flex-1 font-serif text-lg leading-relaxed whitespace-pre-wrap text-slate-800">
                    {essayContent}
                 </div>
                 
                 <div className="mt-8 pt-6 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-slate-700">朗讀功能</h3>
                        {!audioUrl && (
                             <button
                             onClick={handleGenerateSpeech}
                             disabled={status !== 'idle'}
                             className="text-sm px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 font-medium transition"
                           >
                             {status === 'synthesizing' ? '生成語音中...' : '🔊 產生語音'}
                           </button>
                        )}
                    </div>
                    
                    {audioUrl && (
                        <AudioPlayer audioUrl={audioUrl} onDownload={downloadAudio} />
                    )}
                 </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-lg">
                <svg className="w-16 h-16 mb-4 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
                <p>請在左側輸入資料並點擊「開始產生文章」</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}