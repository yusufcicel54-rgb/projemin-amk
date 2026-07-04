export interface Chapter {
  id: string;
  title: string;
  order: number;
  content: string;
  synopsis: string;
  status: 'taslak' | 'inceleme' | 'tamamlandi';
  notes: string;
}

export interface Character {
  id: string;
  name: string;
  role: 'basrol' | 'antagonist' | 'yardimci' | 'diger';
  physicalDesc: string;
  personality: string;
  backstory: string;
  goals: string;
  secrets: string;
  avatarColor: string;
}

export interface Place {
  id: string;
  name: string;
  description: string;
  sensoryDetails: string;
  significance: string;
  color: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  chapterId?: string;
  description: string;
  sequence: number;
  color: string;
}

export interface CanvasNode {
  id: string;
  type: 'sahne' | 'karakter' | 'mekan' | 'not';
  x: number;
  y: number;
  title: string;
  content: string;
  color: string;
  linkedId?: string; // Links to a specific Character, Place, or Chapter
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface GeminiSettings {
  apiKey: string;
  isUsingSystemKey: boolean;
  model: string;
  systemInstruction: string;
  temperature: number;
  genre: string;
}

export interface Story {
  id: string;
  title: string;
  genre: string;
  synopsis: string;
  chapters: Chapter[];
  characters: Character[];
  places: Place[];
  timelineEvents: TimelineEvent[];
  canvasNodes: CanvasNode[];
  canvasEdges: CanvasEdge[];
  settings: GeminiSettings;
}
