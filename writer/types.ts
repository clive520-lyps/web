export enum EssayGenre {
    NARRATIVE = '記敘文',
    ARGUMENTATIVE = '議論文',
    POETRY = '詩歌',
    EXPOSITORY = '說明文',
    APPLIED = '應用文',
    LYRICAL = '抒情文'
  }
  
  export interface EssayConfig {
    title: string;
    summary: string;
    genre: EssayGenre;
    paragraphCount: number;
    paragraphSummaries: string[];
    wordCount: number;
  }
  
  export interface GeneratedEssay {
    content: string;
    audioBlob: Blob | null;
    audioUrl: string | null;
  }
  
  export type AppStatus = 'idle' | 'planning' | 'generating' | 'synthesizing';