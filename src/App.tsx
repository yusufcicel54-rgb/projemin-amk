import React, { useState, useEffect } from 'react';
import { Story, Chapter, Character, Place, TimelineEvent, CanvasNode, GeminiSettings } from './types';
import { INITIAL_STORY } from './initialData';
import StoryCanvas from './components/StoryCanvas';
import { 
  Sparkles, BookOpen, Users, MapPin, Clock, Settings, Network, Plus, Trash2, Edit, Save, 
  BookOpenText, Wand2, Key, HelpCircle, CheckCircle, Sliders, Download, Upload, Copy, 
  FileText, ChevronRight, Share2, Info, AlertCircle, RefreshCw, Eye
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { trackEvent, trackPageView } from './lib/analytics';


export default function App() {
  // Stories list state with fallback/migration from v1
  const [stories, setStories] = useState<Story[]>(() => {
    const savedStories = localStorage.getItem('story_editor_stories_v2');
    if (savedStories) {
      try {
        const parsed = JSON.parse(savedStories);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((s: Story) => ({
            ...s,
            settings: {
              ...s.settings,
              isUsingSystemKey: false // Remove system key support
            }
          }));
        }
      } catch (e) {
        console.error('Failed to parse saved stories', e);
      }
    }
    
    // Check if there's v1 data
    const savedV1 = localStorage.getItem('story_editor_data_v1');
    if (savedV1) {
      try {
        const parsedV1 = JSON.parse(savedV1);
        if (parsedV1 && parsedV1.id) {
          parsedV1.settings.isUsingSystemKey = false; // Disable system key
          return [parsedV1];
        }
      } catch (e) {
        console.error('Failed to parse saved v1 data', e);
      }
    }
    
    const initialStoryWithNoSystemKey = {
      ...INITIAL_STORY,
      settings: {
        ...INITIAL_STORY.settings,
        isUsingSystemKey: false
      }
    };
    return [initialStoryWithNoSystemKey];
  });

  // Active story ID state
  const [activeStoryId, setActiveStoryId] = useState<string>(() => {
    const savedActiveId = localStorage.getItem('story_editor_active_id_v2');
    if (savedActiveId) {
      return savedActiveId;
    }
    
    const savedStories = localStorage.getItem('story_editor_stories_v2');
    if (savedStories) {
      try {
        const parsed = JSON.parse(savedStories);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed[0].id;
        }
      } catch (e) {}
    }
    
    const savedV1 = localStorage.getItem('story_editor_data_v1');
    if (savedV1) {
      try {
        const parsedV1 = JSON.parse(savedV1);
        if (parsedV1 && parsedV1.id) {
          return parsedV1.id;
        }
      } catch (e) {}
    }

    return INITIAL_STORY.id;
  });

  // Current active story derived from state
  const story = stories.find(s => s.id === activeStoryId) || stories[0] || {
    ...INITIAL_STORY,
    settings: { ...INITIAL_STORY.settings, isUsingSystemKey: false }
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'editor' | 'characters' | 'places' | 'timeline' | 'canvas' | 'settings'>('overview');
  
  // 4 in 1 probability of showing the Omniverse button on top
  const [showOmniverseButton, setShowOmniverseButton] = useState(() => Math.random() < 0.25);
  
  // Chapter State
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  
  // Character/Place/Timeline states for adding/editing
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  
  // AI Generation Loading States
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>('');

  // Auto-persist to localStorage
  useEffect(() => {
    localStorage.setItem('story_editor_stories_v2', JSON.stringify(stories));
    // Fallback sync for compatibility
    localStorage.setItem('story_editor_data_v1', JSON.stringify(story));
  }, [stories, story]);

  useEffect(() => {
    localStorage.setItem('story_editor_active_id_v2', activeStoryId);
    trackEvent('story_switch', 'Engagement', activeStoryId);
  }, [activeStoryId]);

  // Track page view / tab transitions with Google Analytics
  useEffect(() => {
    trackPageView(`/tab/${activeTab}`);
    trackEvent('tab_transition', 'Navigation', activeTab);
  }, [activeTab]);


  // Sync selected chapter ID when active story changes
  useEffect(() => {
    const activeStory = stories.find(s => s.id === activeStoryId) || stories[0];
    if (activeStory && activeStory.chapters && activeStory.chapters.length > 0) {
      const chapterExists = activeStory.chapters.some(c => c.id === selectedChapterId);
      if (!chapterExists) {
        setSelectedChapterId(activeStory.chapters[0].id);
      }
    } else {
      setSelectedChapterId('');
    }
    setSelectedCharId(null);
    setSelectedPlaceId(null);
  }, [activeStoryId, stories]);

  // Handle generic updates to the active story state helper
  const updateStory = (updater: (prev: Story) => Story) => {
    setStories(prevStories => {
      return prevStories.map(s => {
        if (s.id === activeStoryId) {
          return updater(s);
        }
        return s;
      });
    });
  };

  // Check if AI can be used (custom key provided)
  const isAIConfigured = !!story.settings.apiKey;

  // Global helper for calling the Gemini API directly from the client (serverless, BYOK compatible)
  async function callGemini(prompt: string, customSystemInstruction?: string) {
    setIsGenerating(true);
    setAiError(null);
    setAiSuccessMessage(null);
    try {
      if (!story.settings.apiKey) {
        throw new Error('Gemini API anahtarı bulunamadı. Lütfen Ayarlar sekmesinden kendi API anahtarınızı ekleyin.');
      }
      
      // Initialize the GoogleGenAI client directly on the client side with user's API Key
      const ai = new GoogleGenAI({
        apiKey: story.settings.apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build-client',
          }
        }
      });
      
      const response = await ai.models.generateContent({
        model: story.settings.model || "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: customSystemInstruction || story.settings.systemInstruction,
          temperature: story.settings.temperature !== undefined ? Number(story.settings.temperature) : undefined,
        }
      });

      if (!response || !response.text) {
        throw new Error('Yapay Zeka boş veya geçersiz bir yanıt döndürdü.');
      }

      setAiSuccessMessage('Yapay Zeka yanıtı başarıyla oluşturuldu!');
      return response.text;
    } catch (err: any) {
      console.error('Gemini API Client-side Error:', err);
      setAiError(err.message || 'Yapay Zeka ile iletişim kurulurken bir hata oluştu.');
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }

  // AI Story Assistant Tasks
  const handleAIGenerateConcept = async () => {
    const prompt = `Şu anki hikayemizin detayları şöyle:\nBaşlık: ${story.title}\nTür: ${story.genre}\nÖzet: ${story.synopsis}\n\nLütfen bana bu hikaye için 3 farklı yaratıcı ve sürprizli olay örgüsü fikri, alternatif son veya heyecan verici gizemler öner. Yanıtını temiz paragraflarla ver, teknik veri içermesin.`;
    try {
      const result = await callGemini(prompt);
      // Create a new idea node in Canvas automatically or show/copy it
      alertAIResult('Hikaye Fikirleri ve Geliştirme Önerileri', result);
    } catch (e) {}
  };

  const handleAISummarizeStory = async () => {
    const prompt = `Şu ana kadar yazılmış olan hikaye detayları:\n\nBölümler:\n${story.chapters.map(c => `Bölüm Adı: ${c.title}\nÖzet: ${c.synopsis}\nİçerik Taslağı: ${c.content.substring(0, 300)}...`).join('\n\n')}\n\nKarakterler:\n${story.characters.map(c => `- ${c.name} (${c.role}): ${c.personality}`).join('\n')}\n\nLütfen bu verilere dayanarak hikayenin gidişatını analiz et, tutarsızlıkları belirt, karakter gelişimlerini değerlendir ve sonraki adımlar için yapıcı bir editör özeti çıkar.`;
    try {
      const result = await callGemini(prompt);
      alertAIResult('Editör Özeti ve Tutarlılık Analizi', result);
    } catch (e) {}
  };

  // AI Chapter helpers
  const handleAIChapterImprove = async (actionType: 'expand' | 'dialogue' | 'poetic' | 'suggest_next') => {
    const currentChapter = story.chapters.find(c => c.id === selectedChapterId);
    if (!currentChapter) return;

    let prompt = '';
    const context = `Hikaye Başlığı: ${story.title}\nTür: ${story.genre}\nBölüm Başlığı: ${currentChapter.title}\nBölüm Özeti: ${currentChapter.synopsis}\nVar Olan Bölüm Metni:\n${currentChapter.content}\n\n`;

    if (actionType === 'expand') {
      prompt = context + `Görev: Yukarıdaki bölüm metnini genişlet, sahneyi daha detaylı tasvir et, karakterlerin içsel düşüncelerini derinleştir ve anlatımı zenginleştir. Sadece eklenmiş/geliştirilmiş yeni bölüm metnini döndür.`;
    } else if (actionType === 'dialogue') {
      prompt = context + `Görev: Bu sahneye karakterler arasında geçecek, gerilimi artıran, daha canlı ve doğal tınlayan diyaloglar ekle veya var olan diyalogları geliştir. Sadece güncellenmiş bölüm metnini döndür.`;
    } else if (actionType === 'poetic') {
      prompt = context + `Görev: Yukarıdaki bölüm metnindeki kelimeleri daha sanatsal, betimlemesi güçlü, edebi ve akıcı bir üslupla (steampunk/bilimkurgu ruhuna uygun duyusal detaylarla) yeniden düzenle. Sadece güncellenmiş bölüm metnini döndür.`;
    } else if (actionType === 'suggest_next') {
      prompt = context + `Görev: Bu bölümden sonra yaşanabilecek heyecan verici bir sonraki sahneyi planla, çatışmaları artıracak 2 alternatif olay akışı yaz.`;
    }

    try {
      const result = await callGemini(prompt);
      if (actionType === 'suggest_next') {
        alertAIResult('Sonraki Sahne Önerileri', result);
      } else {
        // Automatically ask if they want to apply it or replace
        const confirmApply = window.confirm("Yapay Zeka yeni bir metin üretti. Bölüm içeriğini bu yeni metinle güncellemek istiyor musunuz?");
        if (confirmApply) {
          updateStory(prev => ({
            ...prev,
            chapters: prev.chapters.map(c => c.id === selectedChapterId ? { ...c, content: result } : c)
          }));
        }
      }
    } catch (e) {}
  };

  // Hızlı Gemini Araçları Paneli Metodu
  const handleQuickGeminiTool = async (toolId: string) => {
    const currentChapter = story.chapters.find(c => c.id === selectedChapterId);
    if (!currentChapter) {
      alert("Lütfen önce bir bölüm seçin!");
      return;
    }

    let prompt = '';
    let title = '';
    const context = `Hikaye: ${story.title}\nTür: ${story.genre}\nBölüm: ${currentChapter.title}\nÖzet: ${currentChapter.synopsis}\nMetin:\n${currentChapter.content}\n\n`;

    switch (toolId) {
      case 'fix_grammar':
        title = 'Yazım ve Dilbilgisi Düzeltici';
        prompt = context + `Görev: Yukarıdaki bölüm metnindeki imla hatalarını, noktalama kusurlarını, anlatım bozuklukluklarını ve Türkçe yazım yanlışlarını düzelt. Metnin kurgusuna, olaylarına veya karakter sözlerine dokunma, sadece akıcılığı ve dilbilgisini mükemmelleştir. Sadece düzeltilmiş nihai metni döndür.`;
        break;
      case 'auto_synopsis':
        title = 'Yapay Zeka Otomatik Bölüm Özeti';
        prompt = context + `Görev: Yukarıdaki bölüm metnini analiz ederek, yazar için 2-3 cümlelik akıcı, net ve odaklanmış bir Bölüm Özeti (Synopsis) oluştur. Sadece yeni özeti döndür.`;
        break;
      case 'cliffhanger':
        title = 'Bölüm Sonu Çengel Önerisi';
        prompt = context + `Görev: Bu bölümün sonunu daha gizemli, heyecanlı ve okuyucuyu bir sonraki bölüme sabırsızlandıracak bir "cliffhanger" (çengel / merakta bırakma) ögesi ile sonlandırmak için yaratıcı fikirler veya doğrudan bir paragraf ekleme metni öner.`;
        break;
      case 'sensory_details':
        title = 'Duyusal Atmosfer Güçlendirici';
        prompt = context + `Görev: Sahnenin geçtiği ortamdaki sesler, kokular, ışık gölge oyunları, sıcaklık ve nesnelerin dokusu gibi duyusal detayları (karanlık/parlak, buğulu, metalik, rüzgarlı vb.) güçlendirerek hikaye atmosferini çok daha sürükleyici hale getir. Sadece güncellenmiş metni döndür.`;
        break;
      case 'suggest_title':
        title = 'Yaratıcı Bölüm Başlığı Önerileri';
        prompt = context + `Görev: Mevcut bölüm metnini ve olay örgüsünü göz önüne alarak, bu bölüm için birbirinden etkileyici, merak uyandırıcı ve edebi derinliği olan 5 farklı Türkçe başlık önerisi listele.`;
        break;
      case 'action_dialogue':
        title = 'Diyalog Canlandırıcı';
        prompt = context + `Görev: Bölümdeki diyalogları gözden geçir. Karakterlerin ses tonlarını, duraksamalarını, mimik ve jestlerini ekleyerek veya konuşmaları daha keskin ve vurucu kılarak diyalogları canlandır. Sadece nihai metni döndür.`;
        break;
      default:
        return;
    }

    try {
      const result = await callGemini(prompt);
      if (toolId === 'auto_synopsis') {
        const confirmApply = window.confirm(`Yapay zeka şu özeti çıkardı:\n\n"${result}"\n\nBu özeti bu bölümün özet alanına otomatik olarak yazmak ister misiniz?`);
        if (confirmApply) {
          updateStory(prev => ({
            ...prev,
            chapters: prev.chapters.map(c => c.id === selectedChapterId ? { ...c, synopsis: result } : c)
          }));
        }
      } else if (toolId === 'suggest_title' || toolId === 'cliffhanger') {
        alertAIResult(title, result);
      } else {
        const confirmApply = window.confirm(`Yapay zeka metni güncelledi. Bölüm içeriğini bu yeni metinle değiştirmek istiyor musunuz?`);
        if (confirmApply) {
          updateStory(prev => ({
            ...prev,
            chapters: prev.chapters.map(c => c.id === selectedChapterId ? { ...c, content: result } : c)
          }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Helper Custom Prompt for Chapter Editor
  const handleAICustomPrompt = async () => {
    if (!customPrompt.trim()) return;
    const currentChapter = story.chapters.find(c => c.id === selectedChapterId);
    if (!currentChapter) return;

    const prompt = `Hikaye Başlığı: ${story.title}\nTür: ${story.genre}\nBölüm Başlığı: ${currentChapter.title}\nBölüm Metni:\n${currentChapter.content}\n\nYazarın Özel Yapay Zeka Komutu: ${customPrompt}\n\nLütfen bu komutu uygulayarak bölüm metnini düzenle veya yeni içerik yaz. Sadece nihai metni döndür.`;
    
    try {
      const result = await callGemini(prompt);
      const confirmApply = window.confirm("Yapay Zeka özel komutunuza göre metni güncelledi. Bölüm içeriğini bununla değiştirmek ister misiniz?");
      if (confirmApply) {
        updateStory(prev => ({
          ...prev,
          chapters: prev.chapters.map(c => c.id === selectedChapterId ? { ...c, content: result } : c)
        }));
        setCustomPrompt('');
      }
    } catch (e) {}
  };

  // AI Character Creator helper
  const handleAIGenerateCharacter = async () => {
    const prompt = `Hikaye Başlığı: ${story.title}\nTür: ${story.genre}\nÖzet: ${story.synopsis}\n\nLütfen bana bu hikayenin atmosferine mükemmel uyum sağlayacak, derinliği olan yeni bir karakter tasarla.\nYazacağın format tam olarak şu JSON şeklinde olsun (başka hiçbir metin yazma, sadece saf JSON döndür):\n{\n  "name": "Karakter Adı",\n  "role": "basrol" veya "antagonist" veya "yardimci" veya "diger",\n  "physicalDesc": "Fiziksel görünüm tasviri",\n  "personality": "Kişilik özellikleri, zaafları ve güçlü yönleri",\n  "backstory": "Geçmiş hikayesi, kökeni",\n  "goals": "Hikayedeki motivasyonu, amacı",\n  "secrets": "Herkesten sakladığı sırrı"\n}`;

    try {
      const result = await callGemini(prompt, "Sen sadece JSON döndüren bir yardımcı yazılımsın. JSON kod blokları olmadan, sadece saf JSON verisi döndür.");
      // Parse JSON
      let cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim();
      const generated = JSON.parse(cleaned);
      
      const newChar: Character = {
        id: `char-${Date.now()}`,
        name: generated.name || 'Yeni Karakter',
        role: generated.role || 'yardimci',
        physicalDesc: generated.physicalDesc || '',
        personality: generated.personality || '',
        backstory: generated.backstory || '',
        goals: generated.goals || '',
        secrets: generated.secrets || '',
        avatarColor: ['amber', 'blue', 'rose', 'indigo', 'emerald', 'purple'][Math.floor(Math.random() * 6)]
      };

      updateStory(prev => ({
        ...prev,
        characters: [...prev.characters, newChar]
      }));
      setSelectedCharId(newChar.id);
      setAiSuccessMessage(`Yeni karakter "${newChar.name}" başarıyla yaratıldı ve eklendi!`);
    } catch (e) {
      console.error(e);
      setAiError("Karakter yaratılırken veya JSON işlenirken bir hata oluştu. Lütfen tekrar deneyin.");
    }
  };

  // AI Place Creator helper
  const handleAIGeneratePlace = async () => {
    const prompt = `Hikaye Başlığı: ${story.title}\nTür: ${story.genre}\n\nLütfen bu hikaye evrenine uygun sıra dışı bir mekan / mekan konsepti tasarla.\nYazacağın format tam olarak şu JSON şeklinde olsun (başka hiçbir açıklama yazma, sadece saf JSON döndür):\n{\n  "name": "Mekan Adı",\n  "description": "Mekanın genel tasarımı ve yapısı",\n  "sensoryDetails": "Mekandaki kokular, sesler, ışıklar ve hissettirdikleri",\n  "significance": "Mekanın hikaye olay örgüsündeki kritik önemi"\n}`;

    try {
      const result = await callGemini(prompt, "Sen sadece JSON döndüren bir yardımcı yazılımsın. JSON kod blokları olmadan, sadece saf JSON verisi döndür.");
      let cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim();
      const generated = JSON.parse(cleaned);

      const newPlace: Place = {
        id: `place-${Date.now()}`,
        name: generated.name || 'Yeni Mekan',
        description: generated.description || '',
        sensoryDetails: generated.sensoryDetails || '',
        significance: generated.significance || '',
        color: ['emerald', 'orange', 'sky', 'rose', 'amber', 'purple'][Math.floor(Math.random() * 6)]
      };

      updateStory(prev => ({
        ...prev,
        places: [...prev.places, newPlace]
      }));
      setSelectedPlaceId(newPlace.id);
      setAiSuccessMessage(`Yeni mekan "${newPlace.name}" başarıyla yaratıldı ve eklendi!`);
    } catch (e) {
      console.error(e);
      setAiError("Mekan yaratılırken veya JSON işlenirken bir hata oluştu.");
    }
  };

  // Canvas Mode AI Card Generation
  const handleGenerateAICanvasCard = async (sourceNode: CanvasNode) => {
    const prompt = `Hikaye Başlığı: ${story.title}\nTür: ${story.genre}\nÖzet: ${story.synopsis}\n\nŞu anda hikaye haritamızda (canvas) seçili bir kart var:\nKart Tipi: ${sourceNode.type}\nKart Başlığı: ${sourceNode.title}\nKart İçeriği: ${sourceNode.content}\n\nLütfen bu kartla yakından ilişkili, olay örgüsünü devam ettiren veya bu karttaki gizemi derinleştiren yeni bir kart tasarla.\nYazacağın format tam olarak şu JSON şeklinde olsun (açıklama ekleme, sadece saf JSON döndür):\n{\n  "type": "sahne" veya "karakter" veya "mekan" veya "not",\n  "title": "İlişkili Kartın Başlığı",\n  "content": "İlişkili kartın içeriği, olay akışı veya açıklaması",\n  "label": "İki kart arasındaki ilişki bağı etiket metni (örn: 'Olayı Tetikler', 'Onun Atölyesi', 'Sırdaşı')" \n}`;

    try {
      const result = await callGemini(prompt, "Sen sadece JSON döndüren bir yardımcı yazılımsın. JSON kod blokları olmadan, sadece saf JSON verisi döndür.");
      let cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim();
      const generated = JSON.parse(cleaned);

      const newId = `node-${Date.now()}`;
      const colors = {
        sahne: '#fbbf24',
        karakter: '#3b82f6',
        mekan: '#10b981',
        not: '#a855f7',
      };

      const newCanvasNode: CanvasNode = {
        id: newId,
        type: generated.type || 'not',
        x: sourceNode.x + 180 + Math.floor(Math.random() * 40),
        y: sourceNode.y + 120 + Math.floor(Math.random() * 40),
        title: generated.title || 'Yapay Zeka Kartı',
        content: generated.content || '',
        color: colors[generated.type as CanvasNode['type']] || '#64748b',
      };

      const newEdge = {
        id: `edge-${Date.now()}`,
        source: sourceNode.id,
        target: newId,
        label: generated.label || 'İlişkili',
      };

      updateStory(prev => ({
        ...prev,
        canvasNodes: [...prev.canvasNodes, newCanvasNode],
        canvasEdges: [...prev.canvasEdges, newEdge]
      }));

      setAiSuccessMessage(`Yapay zeka başarıyla "${newCanvasNode.title}" başlıklı yeni bir kart üretti ve "${sourceNode.title}" ile bağladı!`);
    } catch (e) {
      console.error(e);
      setAiError("Yapay zeka kartı üretilirken bir hata oluştu.");
    }
  };

  // Cosmic Omniverse Crack method - Crossover event with previous stories and current story
  const handleOmniverseCrack = async () => {
    if (!isAIConfigured) {
      alert("Lütfen önce bir Gemini API Anahtarı tanımlayın (Ayarlar sekmesinden veya sağ üst kısımdan)!");
      return;
    }

    // Get current story info
    const currentStoryText = `Mevcut Hikaye: "${story.title}"\nTür: ${story.genre}\nÖzet: ${story.synopsis}\n` +
      `Karakterler: ${story.characters.map(c => `${c.name} (${c.role})`).join(', ') || 'Henüz tanımlanmamış'}\n` +
      `Mekanlar: ${story.places.map(p => p.name).join(', ') || 'Henüz tanımlanmamış'}\n` +
      `Bölümler:\n${story.chapters.map(c => `- ${c.title}: ${c.synopsis}`).join('\n') || 'Bölüm yok'}`;

    // Get last 3 other stories (excluding the active story)
    const otherStories = stories.filter(s => s.id !== activeStoryId).slice(-3);
    let otherStoriesText = '';
    
    if (otherStories.length > 0) {
      otherStoriesText = otherStories.map((s, idx) => 
        `Diğer Evren/Hikaye #${idx + 1}: "${s.title}"\nTür: ${s.genre}\nÖzet: ${s.synopsis}\n` +
        `Karakterler: ${s.characters.map(c => c.name).join(', ') || 'Yok'}\n` +
        `Mekanlar: ${s.places.map(p => p.name).join(', ') || 'Yok'}\n` +
        `Bölümler: ${s.chapters.map(c => c.title).join(', ') || 'Yok'}`
      ).join('\n\n');
    } else {
      // High quality alternate-universe fallbacks
      otherStoriesText = `Diğer Evren/Hikaye #1: "Saat Kulesinin Gölgeleri" (Karanlık Steampunk - Buharlı dev robotlar, dişli çark gökyüzü şehirleri ve gizemli simyacılar)\n` +
        `Diğer Evren/Hikaye #2: "Neo-İzmir 2099" (İleri Teknoloji Cyberpunk - Neon yağmurları, siber sibernetik implantlar ve yapay zeka isyanı)\n` +
        `Diğer Evren/Hikaye #3: "Elfheim Fısıltıları" (Kadim Fantastik - Element ejderhaları, runik tılsımlar ve unutulmuş orman krallığı)`;
    }

    const prompt = `GÖREV: BÜYÜK KOZMİK OMNIVERSE ÇATLAMASI (BOYUTLAR ARASI GEÇİŞ)
Mevcut hikayemizi ve diğer 3 farklı evreni/hikayeyi kozmik ve boyutsal bir çatlakla (Omniverse Çatlaması) birleştiren, tüm bu dünyaların karakterlerini ve atmosferlerini bir araya getiren epik, edebi ve sürükleyici bir ortak devam sahnesi/bölüm metni kaleme al.

MEVCUT EVREN VE DETAYLARI:
${currentStoryText}

BİRLEŞTİRİLECEK DİĞER EVRENLER / PARALEL BOYUTLAR:
${otherStoriesText}

KURGU YÖNERGELERİ:
1. Başlık olarak heyecan verici bir "Omniverse Çatlaması: Kozmik Birleşme" başlığı kullan.
2. Bu evrenlerden en az birkaç belirgin karakterin (örneğin mevcut hikayedeki karakterler ile diğer hikayelerdeki/paralel evrenlerdeki karakterlerin) kozmik yarılma anındaki şaşkınlık ve heyecan dolu karşılaşmasını tasvir et.
3. Atmosferi, dillerini ve evrenlerin karakteristik mekaniklerini (buhar gücü, siber implantlar, büyü tılsımları veya mevcut hikayenin teması) birbirine harika bir biçimde eklemle.
4. Çıktı tamamen edebi, Türkçe dil kurallarına uygun, sürükleyici ve akıcı bir hikaye metni olmalıdır. Teknik veri, açıklama veya kod bloğu içermemelidir.`;

    try {
      trackEvent('omniverse_crack_click', 'Engagement', story.title);
      const result = await callGemini(prompt, "Sen evrenleri birleştiren, son derece yaratıcı ve edebi bir kozmik kurgu yazarı asistanısın.");
      alertAIResult('🌌 OMNIVERSE ÇATLAMASI: KOZMİK BİRLEŞME 🌌', result);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAppendOmniverseChapter = (text: string) => {
    trackEvent('omniverse_chapter_added', 'Engagement', story.title);
    const nextOrder = story.chapters.length + 1;

    const newChapter: Chapter = {
      id: `chapter-${Date.now()}`,
      title: `${nextOrder}. Bölüm: Omniverse Çatlaması`,
      order: nextOrder,
      content: text,
      synopsis: 'Farklı evrenlerin kozmik bir çatlakla birleştiği epik devam sahnesi.',
      status: 'taslak',
      notes: 'Omniverse Çatlaması tarafından otomatik olarak üretildi.'
    };
    updateStory(prev => ({
      ...prev,
      chapters: [...prev.chapters, newChapter]
    }));
    setSelectedChapterId(newChapter.id);
    alert("Omniverse Çatlaması devam sahnesi hikayenize yeni bir bölüm olarak başarıyla eklendi! Editör sekmesine geçebilirsiniz.");
    setShowModal(false);
  };

  // Helper modal/alert to display long AI results beautifully
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');
  const [showModal, setShowModal] = useState(false);

  const alertAIResult = (title: string, content: string) => {
    setModalTitle(title);
    setModalContent(content);
    setShowModal(true);
  };

  // Story Chapter management
  const handleAddChapter = () => {
    const nextOrder = story.chapters.length + 1;
    const newChapter: Chapter = {
      id: `chapter-${Date.now()}`,
      title: `${nextOrder}. Bölüm: Yeni Macera`,
      order: nextOrder,
      content: 'Yeni bölümünüzü buraya yazmaya başlayın...',
      synopsis: 'Bölümün kısa bir özeti veya hedefi...',
      status: 'taslak',
      notes: 'Bölümle ilgili kendinize notlar...'
    };
    updateStory(prev => ({
      ...prev,
      chapters: [...prev.chapters, newChapter]
    }));
    setSelectedChapterId(newChapter.id);
  };

  const handleDeleteChapter = (id: string) => {
    if (story.chapters.length <= 1) {
      alert("En az bir bölüm bulunmalıdır.");
      return;
    }
    const confirmed = window.confirm("Bu bölümü kalıcı olarak silmek istediğinize emin misiniz?");
    if (!confirmed) return;

    updateStory(prev => {
      const remaining = prev.chapters.filter(c => c.id !== id);
      // Re-order
      const reordered = remaining.map((c, i) => ({ ...c, order: i + 1 }));
      return {
        ...prev,
        chapters: reordered
      };
    });

    if (selectedChapterId === id) {
      const remaining = story.chapters.filter(c => c.id !== id);
      setSelectedChapterId(remaining[0]?.id || '');
    }
  };

  // Character Management
  const handleAddCharacter = () => {
    const newChar: Character = {
      id: `char-${Date.now()}`,
      name: 'Yeni Karakter',
      role: 'yardimci',
      physicalDesc: 'Karakterin görünüşü...',
      personality: 'Nasıl biri? Davranış kalıpları...',
      backstory: 'Geçmişi, sırları...',
      goals: 'Hedefleri...',
      secrets: 'Gizli gerçekleri...',
      avatarColor: ['amber', 'blue', 'rose', 'indigo', 'emerald', 'purple'][Math.floor(Math.random() * 6)]
    };
    updateStory(prev => ({
      ...prev,
      characters: [...prev.characters, newChar]
    }));
    setSelectedCharId(newChar.id);
  };

  const handleDeleteCharacter = (id: string) => {
    updateStory(prev => ({
      ...prev,
      characters: prev.characters.filter(c => c.id !== id)
    }));
    if (selectedCharId === id) setSelectedCharId(null);
  };

  // Place Management
  const handleAddPlace = () => {
    const newPlace: Place = {
      id: `place-${Date.now()}`,
      name: 'Yeni Mekan',
      description: 'Mekanın genel görünümü...',
      sensoryDetails: 'Hangi sesler var? Kokular? Atmosfer...',
      significance: 'Olay örgüsündeki kritik önemi nedir?',
      color: ['emerald', 'orange', 'sky', 'rose', 'amber', 'purple'][Math.floor(Math.random() * 6)]
    };
    updateStory(prev => ({
      ...prev,
      places: [...prev.places, newPlace]
    }));
    setSelectedPlaceId(newPlace.id);
  };

  const handleDeletePlace = (id: string) => {
    updateStory(prev => ({
      ...prev,
      places: prev.places.filter(p => p.id !== id)
    }));
    if (selectedPlaceId === id) setSelectedPlaceId(null);
  };

  // Timeline Event Management
  const handleAddTimelineEvent = () => {
    const nextSeq = story.timelineEvents.length + 1;
    const newEvent: TimelineEvent = {
      id: `event-${Date.now()}`,
      title: 'Yeni Olay',
      description: 'Gelişen olayın detayları...',
      sequence: nextSeq,
      color: ['red', 'blue', 'emerald', 'purple', 'amber', 'sky'][Math.floor(Math.random() * 6)]
    };
    updateStory(prev => ({
      ...prev,
      timelineEvents: [...prev.timelineEvents, newEvent]
    }));
  };

  const handleDeleteTimeline = (id: string) => {
    updateStory(prev => {
      const filtered = prev.timelineEvents.filter(e => e.id !== id);
      return {
        ...prev,
        timelineEvents: filtered.map((e, index) => ({ ...e, sequence: index + 1 }))
      };
    });
  };

  // Import / Export JSON Files
  const handleExportJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(story, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `${story.title.replace(/\s+/g, '_')}_hikaye_taslagi.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && parsed.title && parsed.chapters) {
            const importedStory = {
              ...parsed,
              id: parsed.id || `story-${Date.now()}`,
              settings: {
                ...parsed.settings,
                isUsingSystemKey: false // Make sure system key is disabled
              }
            };
            setStories(prev => {
              const existsIndex = prev.findIndex(s => s.id === importedStory.id);
              if (existsIndex >= 0) {
                const updated = [...prev];
                updated[existsIndex] = importedStory;
                return updated;
              } else {
                return [...prev, importedStory];
              }
            });
            setActiveStoryId(importedStory.id);
            alert("Hikaye taslağınız başarıyla içeri aktarıldı!");
          } else {
            alert("Geçersiz hikaye JSON yapısı.");
          }
        } catch (err) {
          alert("Dosya okunamadı veya geçerli bir JSON değil.");
        }
      };
    }
  };

  const handleResetStory = () => {
    if (window.confirm("Seçili olan bu hikayeye ait tüm değişiklikler silinecektir ve örnek hikayeye geri dönülecektir. Onaylıyor musunuz?")) {
      setStories(prev => prev.map(s => s.id === activeStoryId ? {
        ...INITIAL_STORY,
        id: s.id, // Keep the same ID so activeStoryId stays correct
        settings: {
          ...INITIAL_STORY.settings,
          apiKey: s.settings.apiKey || '', // preserve their API key!
          isUsingSystemKey: false
        }
      } : s));
    }
  };

  const handleAddNewStory = () => {
    const newStoryId = `story-${Date.now()}`;
    const newStory: Story = {
      id: newStoryId,
      title: 'Yeni Taslak Hikaye',
      genre: 'Genel Kurgu',
      synopsis: 'Hikayenizin genel özetini buraya yazın...',
      chapters: [
        {
          id: `chapter-${Date.now()}`,
          title: '1. Bölüm: Başlangıç',
          order: 1,
          content: 'İlk bölümünüzün metnini yazmaya başlayın...',
          synopsis: 'İlk bölüm özeti...',
          status: 'taslak',
          notes: 'İlk bölüm notları...'
        }
      ],
      characters: [],
      places: [],
      timelineEvents: [],
      canvasNodes: [],
      canvasEdges: [],
      settings: {
        apiKey: story.settings.apiKey || '', // Keep API key if they already configured one
        isUsingSystemKey: false,
        model: 'gemini-3.5-flash',
        systemInstruction: 'Sen yaratıcı ve çok yönlü bir edebiyat ve kurgu editörüsün. Yazarın verdiği karakterleri, olayları ve mekanları temel alarak sürükleyici, akıcı, zengin betimlemeler içeren Türkçe hikaye bölümleri üret veya mevcut taslakları geliştir.',
        temperature: 0.8,
        genre: 'Genel Kurgu'
      }
    };
    
    setStories(prev => [...prev, newStory]);
    setActiveStoryId(newStoryId);
  };

  const handleDeleteStory = (id: string) => {
    if (stories.length <= 1) {
      alert("En az bir hikaye bulunmalıdır.");
      return;
    }
    const targetStory = stories.find(s => s.id === id);
    if (!targetStory) return;
    const confirmed = window.confirm(`"${targetStory.title}" hikayesini ve hikayeye ait tüm bölümleri, karakterleri kalıcı olarak silmek istediğinize emin misiniz?`);
    if (!confirmed) return;

    const remaining = stories.filter(s => s.id !== id);
    setStories(remaining);
    setActiveStoryId(remaining[0].id);
  };

  // Quick helper for genre template settings
  const applyGenreTemplate = (genreName: string) => {
    let instruction = '';
    switch (genreName) {
      case 'Bilim Kurgu / Steampunk':
        instruction = 'Sen yaratıcı, sürükleyici ve betimlemeleri güçlü bir roman ve hikaye yazarı yardımcısısın. Kullanıcının verdiği steampunk/bilimkurgu dünyasına uygun olarak çarklar, buhar teknolojileri, asılı gökyüzü şehirleri ve retro-fütüristik ögelerle harmanlanmış edebi tasvirler sun. Türkçe dil bilgisi kurallarına üst düzeyde özen göster.';
        break;
      case 'Fantastik / Büyü':
        instruction = 'Sen epik fantastik edebiyat yazarı yardımcısısın. Kadim rünler, unutulmuş diller, büyülü tılsımlar, ejderhalar veya sıra dışı büyülü ekosistemler içeren tasvirler ve diyaloglar yarat. Betimlemelerin karanlık, asil veya görkemli olsun.';
        break;
      case 'Polisiye / Gizem':
        instruction = 'Sen usta bir polisiye ve psikolojik gerilim yazarı yardımcısısın. İpuçları, şüpheli hareketler, sisli sokaklar, esrarengiz ayak izleri ve karakterlerin zihnindeki kuşkuları harika bir tempoyla aktaran olay örgüleri ve diyaloglar yaz. Merak ve gizem hissini zirvede tut.';
        break;
      case 'Tarihsel Kurgu':
        instruction = 'Sen tarihsel roman yazarı yardımcısısın. Tarihi dokuya, dönemin giysilerine, konuşma üsluplarına, mimarisine ve sosyal yaşamına sadık kalarak son derece inandırıcı, gerçekçi ve tarihi atmosferi derinden hissettiren metinler tasarla.';
        break;
      default:
        instruction = 'Sen yaratıcı ve çok yönlü bir edebiyat ve kurgu editörüsün. Yazarın verdiği karakterleri, olayları ve mekanları temel alarak sürükleyici, akıcı, zengin betimlemeler içeren Türkçe hikaye bölümleri üret veya mevcut taslakları geliştir.';
    }

    updateStory(prev => ({
      ...prev,
      genre: genreName,
      settings: {
        ...prev.settings,
        genre: genreName,
        systemInstruction: instruction
      }
    }));
  };

  const currentChapter = story.chapters.find(c => c.id === selectedChapterId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" id="app-root-layout">
      
      {/* Upper Navigation Header */}
      <header className="bg-slate-900 border-b border-slate-800 py-3.5 px-6 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 shadow-lg" id="app-header">
        <div className="flex flex-wrap items-center gap-6" id="app-branding">
          <div className="flex items-center gap-3" id="brand-container">
            <div className="bg-gradient-to-tr from-amber-500 to-orange-500 p-2 rounded-xl shadow-md shadow-amber-950/40" id="brand-logo-container">
              <BookOpenText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 
                className="text-lg font-bold tracking-tight bg-gradient-to-r from-slate-100 via-amber-100 to-orange-300 bg-clip-text text-transparent flex items-center gap-1.5 cursor-pointer select-none" 
                id="brand-title"
                onDoubleClick={() => {
                  setShowOmniverseButton(prev => !prev);
                  alert(`Omniverse Çatlaması Butonu ${!showOmniverseButton ? "AÇILDI" : "KAPATILDI"}! (Gizli Geliştirici Easter Egg)`);
                }}
                title="Çift tıklayarak Omniverse Çatlaması butonunu manuel olarak açıp kapatabilirsiniz!"
              >
                Mint Scribe-2 <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800">Yapay Zeka Editörü</span>
              </h1>
              <p className="text-[11px] text-slate-400" id="brand-tagline">
                {story.title || 'Hikayenizi oluşturun ve şekillendirin'}
              </p>
            </div>
          </div>

          {/* Active Story Selector & New Story Trigger */}
          <div className="flex items-center gap-2 bg-slate-950/40 p-1.5 rounded-xl border border-slate-800/80" id="story-selector-container">
            <select
              value={activeStoryId}
              onChange={(e) => setActiveStoryId(e.target.value)}
              className="bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-750 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer min-w-[150px] max-w-[220px] truncate transition"
              id="select-active-story"
            >
              {stories.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
            
            <button
              onClick={handleAddNewStory}
              className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition shadow"
              title="Yeni Hikaye Ekle"
              id="btn-header-add-story"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Yeni Hikaye</span>
            </button>

            {stories.length > 1 && (
              <button
                onClick={() => handleDeleteStory(story.id)}
                className="p-1.5 hover:bg-red-950/40 text-slate-500 hover:text-red-400 rounded-lg transition cursor-pointer"
                title="Aktif Hikayeyi Sil"
                id="btn-header-delete-story"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Global Key status indicator */}
        <div className="flex items-center gap-3 text-xs" id="header-actions">
          {showOmniverseButton && (
            <button
              onClick={handleOmniverseCrack}
              disabled={isGenerating}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white animate-rgb cursor-pointer flex items-center gap-1.5 transition-all shadow-md hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
              id="btn-omniverse-crack"
              title="Kozmik Çatlak: Son 3 hikaye ile bu hikayeyi birbirine bağlayan epik bir devam yazın!"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-white" />
              <span>Omniverse Çatlaması</span>
            </button>
          )}

          <div className={`px-3 py-1.5 rounded-full flex items-center gap-2 border ${
            isAIConfigured 
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
              : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
          }`} id="api-key-status">
            <Key className="w-3.5 h-3.5" />
            <span>
              {isAIConfigured 
                ? 'API Anahtarı Tanımlı' 
                : 'API Anahtarı Eksik'}
            </span>
          </div>

          <button
            onClick={handleExportJSON}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1.5 transition text-xs font-medium cursor-pointer"
            title="Tüm hikaye verilerini JSON olarak bilgisayarınıza indirin"
            id="btn-export"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Dışa Aktar</span>
          </button>

          <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1.5 transition text-xs font-medium cursor-pointer" title="Önceki taslağınızı yükleyin">
            <Upload className="w-3.5 h-3.5" />
            <span>İçe Aktar</span>
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>

          <button
            onClick={handleResetStory}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-red-400 rounded-lg border border-slate-800/80 cursor-pointer"
            title="Sıfırla"
            id="btn-reset-data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container Dashboard */}
      <main className="flex-1 flex flex-col md:flex-row" id="main-content-layout">
        
        {/* Sidebar Tabs Navigator */}
        <aside className="w-full md:w-64 bg-slate-900/60 border-r border-slate-800 p-4 space-y-2 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible shrink-0 scrollbar-none" id="aside-navbar">
          <div className="hidden md:block px-3 py-2 text-[10px] uppercase font-mono tracking-wider text-slate-500" id="nav-label">
            Yönlendirme Paneli
          </div>
          
          {[
            { id: 'overview', label: 'Genel Bakış', icon: BookOpen },
            { id: 'editor', label: 'Bölüm Editörü', icon: BookOpenText },
            { id: 'characters', label: 'Karakterler', icon: Users },
            { id: 'places', label: 'Mekanlar', icon: MapPin },
            { id: 'timeline', label: 'Zaman Çizelgesi', icon: Clock },
            { id: 'canvas', label: 'Canvas Modu', icon: Network },
            { id: 'settings', label: 'Gemini Ayarları', icon: Settings },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setAiError(null); setAiSuccessMessage(null); }}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer shrink-0 whitespace-nowrap md:w-full ${
                  activeTab === tab.id
                    ? 'bg-amber-600/15 border border-amber-500/30 text-amber-200'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                }`}
                id={`tab-btn-${tab.id}`}
              >
                <Icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.id === 'canvas' && (
                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800/60">Canlı</span>
                )}
              </button>
            );
          })}

          {/* Quick Metrics display inside side bar (Desktop only) */}
          <div className="hidden md:block pt-6 mt-6 border-t border-slate-800/80 space-y-2" id="sidebar-stats">
            <div className="px-3 text-[10px] uppercase font-mono tracking-wider text-slate-500">
              Hikaye İstatistikleri
            </div>
            <div className="grid grid-cols-2 gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800/60 text-center" id="quick-stats-grid">
              <div className="p-2 border-r border-slate-800/40">
                <p className="text-lg font-bold text-slate-200">{story.chapters.length}</p>
                <p className="text-[9px] text-slate-500">Bölüm</p>
              </div>
              <div className="p-2">
                <p className="text-lg font-bold text-slate-200">{story.characters.length}</p>
                <p className="text-[9px] text-slate-500">Karakter</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Dynamic Center Work Area */}
        <section className="flex-1 p-6 overflow-y-auto max-w-full" id="work-area-stage">
          
          {/* Notification Toasts if any */}
          {isGenerating && (
            <div className="mb-4 bg-amber-950/60 border border-amber-500/30 text-amber-300 rounded-xl p-3 flex items-center justify-between text-xs animate-pulse" id="toast-loading">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                <span>Gemini Yapay Zeka yanıtı hazırlıyor... Lütfen bekleyin.</span>
              </div>
            </div>
          )}

          {aiError && (
            <div className="mb-4 bg-red-950/50 border border-red-500/30 text-red-300 rounded-xl p-3 flex items-start gap-2.5 text-xs" id="toast-error">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Bir Hata Oluştu</p>
                <p className="text-[11px] text-red-400/90 mt-0.5">{aiError}</p>
              </div>
              <button onClick={() => setAiError(null)} className="text-red-400 hover:text-red-300 ml-2 font-bold font-mono">×</button>
            </div>
          )}

          {aiSuccessMessage && (
            <div className="mb-4 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 rounded-xl p-3 flex items-center justify-between text-xs" id="toast-success">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>{aiSuccessMessage}</span>
              </div>
              <button onClick={() => setAiSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-300 ml-2 font-bold font-mono">×</button>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6" id="tab-overview">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6" id="overview-card">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5" id="overview-header">
                  <div className="space-y-1.5 flex-1">
                    <input
                      type="text"
                      value={story.title}
                      onChange={(e) => { updateStory(prev => ({ ...prev, title: e.target.value })); }}
                      placeholder="Hikaye Başlığı Yazın..."
                      className="text-2xl font-bold bg-transparent text-slate-100 border-b border-transparent hover:border-slate-700 focus:border-amber-500 focus:outline-none w-full transition pb-1"
                      id="input-story-title-main"
                    />
                    <div className="flex items-center gap-3 text-xs text-slate-400" id="overview-meta">
                      <span className="flex items-center gap-1 text-amber-400 font-medium">
                        <Sparkles className="w-3.5 h-3.5" />
                        Tür:
                      </span>
                      <select
                        value={story.genre}
                        onChange={(e) => applyGenreTemplate(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 focus:outline-none focus:border-amber-500"
                        id="select-story-genre"
                      >
                        {[
                          'Bilim Kurgu / Steampunk',
                          'Fantastik / Büyü',
                          'Polisiye / Gizem',
                          'Tarihsel Kurgu',
                          'Dram / Sosyal',
                          'Genel Kurgu'
                        ].map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                      <span className="text-slate-600">|</span>
                      <span>Son Güncelleme: Bugün</span>
                    </div>
                  </div>
                </div>

                {/* Synopsis Section */}
                <div className="space-y-2" id="synopsis-section">
                  <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">Hikaye Özeti (Synopsis)</label>
                  <textarea
                    rows={4}
                    value={story.synopsis}
                    onChange={(e) => { updateStory(prev => ({ ...prev, synopsis: e.target.value })); }}
                    placeholder="Hikayenin ana fikrini, başlangıç noktasını ve evrenini buraya yazın..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-300 text-sm focus:outline-none focus:border-amber-500 transition resize-none leading-relaxed"
                    id="textarea-story-synopsis"
                  />
                  <p className="text-[10px] text-slate-500">
                    Özet alanı, yapay zeka tarafından karakter, mekan ve yeni bölümler kurgulanırken evrenin ruhunu bozmamak için referans alınacaktır.
                  </p>
                </div>

                {/* Global AI Helper Panel */}
                <div className="bg-slate-950 border border-indigo-950 rounded-xl p-4 space-y-3" id="ai-quick-tools">
                  <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                    Hızlı Yapay Zeka Editör Araçları
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sistemde yüklü olan tüm veriyi (bölümler, karakterler, mekanlar) analiz ederek size yol gösterecek derinlemesine tavsiyeler alın:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1" id="ai-tools-buttons-grid">
                    <button
                      onClick={handleAIGenerateConcept}
                      disabled={!isAIConfigured}
                      className={`p-3 rounded-lg border text-left transition flex items-start gap-2.5 ${
                        isAIConfigured 
                          ? 'bg-slate-900 hover:bg-indigo-950/20 border-slate-800 hover:border-indigo-500/40 text-slate-300 cursor-pointer' 
                          : 'bg-slate-950 text-slate-600 border-slate-900 cursor-not-allowed'
                      }`}
                      id="btn-ai-concepts"
                    >
                      <Wand2 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-slate-200">Sürpriz Olay Örgüleri Öner</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">3 farklı yaratıcı kurgu ve gelişme fikri sunar.</p>
                      </div>
                    </button>

                    <button
                      onClick={handleAISummarizeStory}
                      disabled={!isAIConfigured}
                      className={`p-3 rounded-lg border text-left transition flex items-start gap-2.5 ${
                        isAIConfigured 
                          ? 'bg-slate-900 hover:bg-indigo-950/20 border-slate-800 hover:border-indigo-500/40 text-slate-300 cursor-pointer' 
                          : 'bg-slate-950 text-slate-600 border-slate-900 cursor-not-allowed'
                      }`}
                      id="btn-ai-summarize"
                    >
                      <BookOpenText className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-slate-200">Genel Hikaye Sağlığı Analizi</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Tutarsızlıkları belirler, editör gözünden kritik yapar.</p>
                      </div>
                    </button>
                  </div>
                  {!isAIConfigured && (
                    <div className="p-2 bg-amber-950/30 border border-amber-500/20 rounded-lg text-[10px] text-amber-400" id="ai-warning-not-configured">
                      Yapay zekayı kullanmak için lütfen <strong>Gemini Ayarları</strong> sekmesinden kendi API anahtarınızı tanımlayın.
                    </div>
                  )}
                </div>
              </div>

              {/* Elements Summary Dashboard (Quick Cards) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="elements-summary-cards">
                <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex items-center gap-3.5" id="chapters-summary-card">
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-xs text-slate-400 font-medium">Bölümler</h4>
                    <p className="text-lg font-bold text-slate-200">{story.chapters.length} Bölüm Hazır</p>
                    <button onClick={() => setActiveTab('editor')} className="text-[10px] text-indigo-400 hover:underline flex items-center mt-0.5 cursor-pointer">Yazmaya Git <ChevronRight className="w-3 h-3" /></button>
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex items-center gap-3.5" id="chars-summary-card">
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-xs text-slate-400 font-medium">Karakter Profili</h4>
                    <p className="text-lg font-bold text-slate-200">{story.characters.length} Karakter</p>
                    <button onClick={() => setActiveTab('characters')} className="text-[10px] text-blue-400 hover:underline flex items-center mt-0.5 cursor-pointer">Karakterleri İncele <ChevronRight className="w-3 h-3" /></button>
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex items-center gap-3.5" id="canvas-summary-card">
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <Network className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-xs text-slate-400 font-medium">İnteraktif Olay Odası</h4>
                    <p className="text-lg font-bold text-slate-200">{story.canvasNodes.length} Canvas Kartı</p>
                    <button onClick={() => setActiveTab('canvas')} className="text-[10px] text-amber-400 hover:underline flex items-center mt-0.5 cursor-pointer">Canvas Haritasını Aç <ChevronRight className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STORY EDITOR (CHAPTERS) */}
          {activeTab === 'editor' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="tab-editor">
              
              {/* Chapters List Sidebar Panel */}
              <div className="lg:col-span-1 space-y-4" id="editor-chapters-sidebar">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3" id="chapter-list-nav">
                  <div className="flex items-center justify-between" id="chapter-list-header">
                    <h3 className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Bölümler</h3>
                    <button
                      onClick={handleAddChapter}
                      className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-medium flex items-center gap-1 cursor-pointer transition shadow"
                      id="btn-add-chapter"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ekle
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1" id="chapters-scroll-list">
                    {story.chapters.map(c => (
                      <div
                        key={c.id}
                        onClick={() => setSelectedChapterId(c.id)}
                        className={`p-2.5 rounded-lg text-xs font-medium cursor-pointer transition flex items-center justify-between border ${
                          selectedChapterId === c.id
                            ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                            : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-slate-300'
                        }`}
                        id={`chapter-item-${c.id}`}
                      >
                        <span className="truncate max-w-[120px]">{c.title}</span>
                        <div className="flex items-center gap-1.5" id={`chapter-item-status-${c.id}`}>
                          <span className={`w-2 h-2 rounded-full ${
                            c.status === 'tamamlandi' ? 'bg-emerald-500' : c.status === 'inceleme' ? 'bg-amber-500' : 'bg-slate-500'
                          }`} title={c.status} />
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteChapter(c.id); }}
                            className="text-slate-600 hover:text-red-400 p-0.5 rounded transition cursor-pointer"
                            title="Bölümü Sil"
                            id={`btn-delete-chapter-${c.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chapter Quick Notes inside list */}
                {currentChapter && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs" id="chapter-notes-panel">
                    <label className="font-semibold text-slate-400">Bölüm Hedefi & Notları</label>
                    <textarea
                      rows={4}
                      value={currentChapter.notes || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateStory(prev => ({
                          ...prev,
                          chapters: prev.chapters.map(c => c.id === selectedChapterId ? { ...c, notes: val } : c)
                        }));
                      }}
                      placeholder="Bu bölümde ne olmalı? Çözülmesi gereken sırlar, odaklanılacak karakterler..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-300 text-xs focus:outline-none focus:border-amber-500 transition resize-none"
                      id="chapter-notes-textarea"
                    />
                  </div>
                )}
              </div>

              {/* Main Rich text & AI Assistant Workspace */}
              <div className="lg:col-span-2 space-y-4" id="editor-main-workspace">
                {currentChapter ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4" id="rich-editor-container">
                    
                    {/* Chapter Metadata edit bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3" id="chapter-edit-header">
                      <div className="flex-1 min-w-[200px]">
                        <input
                          type="text"
                          value={currentChapter.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateStory(prev => ({
                              ...prev,
                              chapters: prev.chapters.map(c => c.id === selectedChapterId ? { ...c, title: val } : c)
                            }));
                          }}
                          className="text-lg font-bold bg-transparent text-slate-200 border-b border-transparent hover:border-slate-800 focus:border-amber-500 focus:outline-none w-full transition pb-1"
                          id="chapter-title-input"
                        />
                      </div>

                      <div className="flex items-center gap-2 text-xs" id="chapter-status-selector">
                        <span className="text-slate-400">Bölüm Durumu:</span>
                        <select
                          value={currentChapter.status}
                          onChange={(e) => {
                            const val = e.target.value as Chapter['status'];
                            updateStory(prev => ({
                              ...prev,
                              chapters: prev.chapters.map(c => c.id === selectedChapterId ? { ...c, status: val } : c)
                            }));
                          }}
                          className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 focus:outline-none"
                          id="chapter-status-select"
                        >
                          <option value="taslak">Taslak</option>
                          <option value="inceleme">İncelemede</option>
                          <option value="tamamlandi">Tamamlandı</option>
                        </select>
                      </div>
                    </div>

                    {/* Chapter Synopsis Edit field */}
                    <div className="space-y-1" id="chapter-synopsis-container">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Bölüm Özeti (Yapay Zekaya İpucu Sağlar)</label>
                      <input
                        type="text"
                        value={currentChapter.synopsis}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateStory(prev => ({
                            ...prev,
                            chapters: prev.chapters.map(c => c.id === selectedChapterId ? { ...c, synopsis: val } : c)
                          }));
                        }}
                        placeholder="Örn: Kaelen, Gideon ile gizemli sarsıntıların kökenini kulede tartışıyor..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500 transition"
                        id="chapter-synopsis-input"
                      />
                    </div>

                    {/* Big Content Writing Textarea */}
                    <div className="space-y-1" id="chapter-body-container">
                      <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider" id="chapter-body-header">
                        <span>Bölüm Hikaye İçeriği</span>
                        <span className="font-mono text-slate-500">{currentChapter.content.length} karakter</span>
                      </div>
                      <textarea
                        rows={16}
                        value={currentChapter.content}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateStory(prev => ({
                            ...prev,
                            chapters: prev.chapters.map(c => c.id === selectedChapterId ? { ...c, content: val } : c)
                          }));
                        }}
                        placeholder="Kelime denizine yelken açın... Hikayenizi buraya yazın."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 text-sm focus:outline-none focus:border-amber-500/50 transition resize-y leading-relaxed custom-scrollbar font-sans"
                        id="chapter-body-textarea"
                      />
                    </div>

                    {/* Integrated AI Assistant Toolbar for writing helper */}
                    <div className="bg-slate-950 border border-amber-950/60 rounded-xl p-4 space-y-3" id="chapter-ai-actions-container">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider" id="chapter-ai-header">
                        <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                        <span>Metin Düzenleme & Genişletme AI Yardımcısı</span>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" id="chapter-ai-quick-buttons">
                        <button
                          onClick={() => handleAIChapterImprove('expand')}
                          disabled={!isAIConfigured}
                          className={`py-2 px-3 rounded-lg text-[11px] font-medium transition flex items-center justify-center gap-1 ${
                            isAIConfigured 
                              ? 'bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-850 hover:border-amber-500/30 cursor-pointer' 
                              : 'bg-slate-950 text-slate-600 border-slate-900 cursor-not-allowed'
                          }`}
                          title="Seçili metni daha fazla detay, çevre tasviri ve derinlikle zenginleştirir."
                          id="btn-ai-expand"
                        >
                          <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                          Sahneyi Detaylandır
                        </button>
                        
                        <button
                          onClick={() => handleAIChapterImprove('dialogue')}
                          disabled={!isAIConfigured}
                          className={`py-2 px-3 rounded-lg text-[11px] font-medium transition flex items-center justify-center gap-1 ${
                            isAIConfigured 
                              ? 'bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-850 hover:border-amber-500/30 cursor-pointer' 
                              : 'bg-slate-950 text-slate-600 border-slate-900 cursor-not-allowed'
                          }`}
                          title="Sahneye derinlik ve gerilim katacak nitelikli diyaloglar ekler."
                          id="btn-ai-dialogue"
                        >
                          <Wand2 className="w-3.5 h-3.5 text-blue-400" />
                          Diyalog Ekle
                        </button>

                        <button
                          onClick={() => handleAIChapterImprove('poetic')}
                          disabled={!isAIConfigured}
                          className={`py-2 px-3 rounded-lg text-[11px] font-medium transition flex items-center justify-center gap-1 ${
                            isAIConfigured 
                              ? 'bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-850 hover:border-amber-500/30 cursor-pointer' 
                              : 'bg-slate-950 text-slate-600 border-slate-900 cursor-not-allowed'
                          }`}
                          title="Anlatımı pürüzsüzleştirir, kelimeleri edebi açıdan şıklaştırır."
                          id="btn-ai-polish"
                        >
                          <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                          Dili Edebi Yap
                        </button>

                        <button
                          onClick={() => handleAIChapterImprove('suggest_next')}
                          disabled={!isAIConfigured}
                          className={`py-2 px-3 rounded-lg text-[11px] font-medium transition flex items-center justify-center gap-1 ${
                            isAIConfigured 
                              ? 'bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-850 hover:border-amber-500/30 cursor-pointer' 
                              : 'bg-slate-950 text-slate-600 border-slate-900 cursor-not-allowed'
                          }`}
                          title="Bu sahneden sonra gelebilecek senaryo kurgu alternatiflerini sıralar."
                          id="btn-ai-next-step"
                        >
                          <Wand2 className="w-3.5 h-3.5 text-orange-400" />
                          Sonraki Sahne Öner
                        </button>
                      </div>

                      {/* Custom instruction prompt */}
                      <div className="flex gap-2 pt-1" id="custom-ai-prompt-container">
                        <input
                          type="text"
                          value={customPrompt}
                          onChange={(e) => setCustomPrompt(e.target.value)}
                          disabled={!isAIConfigured}
                          placeholder={isAIConfigured ? "Örn: 'Kaelen'in babasıyla ilgili bir anısını rüya şeklinde buraya ekle'..." : "Yapay Zeka yapılandırılmadı."}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                          id="input-custom-ai-prompt"
                        />
                        <button
                          onClick={handleAICustomPrompt}
                          disabled={!isAIConfigured || !customPrompt.trim()}
                          className={`px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                            isAIConfigured && customPrompt.trim()
                              ? 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer'
                              : 'bg-slate-950 text-slate-600 border border-slate-900 cursor-not-allowed'
                          }`}
                          id="btn-submit-custom-ai"
                        >
                          Giriş
                        </button>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl p-12 text-center" id="empty-editor-fallback">
                    <BookOpenText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-slate-400">Yazılmış Bölüm Bulunmamaktadır</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Hikayenize yeni bir bölüm ekleyerek yazmaya başlayın. Sol üst kısımdaki Ekle butonunu kullanabilirsiniz.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Side: Hızlı Gemini Araçları Panel */}
              {currentChapter && (
                <div className="lg:col-span-1 space-y-4" id="editor-quick-gemini-tools">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4 animate-fade-in" id="quick-gemini-container">
                    <div className="flex items-center gap-1.5 border-b border-slate-800 pb-3" id="quick-gemini-header">
                      <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                      <div>
                        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Hızlı Gemini Araçları</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">Tek tıkla zenginleştirme ve hızlı asistanlık.</p>
                      </div>
                    </div>

                    {!isAIConfigured && (
                      <div className="bg-amber-950/20 border border-amber-500/20 text-amber-300 text-[11px] p-3 rounded-xl leading-relaxed" id="quick-gemini-warning">
                        <strong>Uyarı:</strong> Gemini API Anahtarı bulunamadı. Lütfen üst bar veya Ayarlar sekmesinden API anahtarınızı ekleyin.
                      </div>
                    )}

                    <div className="space-y-4" id="quick-gemini-body">
                      {/* Metin İşleme Grubu */}
                      <div className="space-y-2" id="quick-gemini-group-text">
                        <label className="text-[10px] font-bold text-amber-500/80 uppercase tracking-wider block">Metin Sihirbazı</label>
                        
                        <button
                          onClick={() => handleQuickGeminiTool('fix_grammar')}
                          disabled={!isAIConfigured || !currentChapter}
                          className={`w-full p-2.5 rounded-xl border text-left transition flex items-center gap-2 text-xs font-medium ${
                            isAIConfigured && currentChapter
                              ? 'bg-slate-950 hover:bg-amber-950/10 border-slate-800 hover:border-amber-500/40 text-slate-300 cursor-pointer'
                              : 'bg-slate-950/40 text-slate-600 border-slate-900 cursor-not-allowed'
                          }`}
                          id="quick-tool-fix-grammar"
                        >
                          <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>Yazım & İmla Düzelt</span>
                        </button>

                        <button
                          onClick={() => handleQuickGeminiTool('sensory_details')}
                          disabled={!isAIConfigured || !currentChapter}
                          className={`w-full p-2.5 rounded-xl border text-left transition flex items-center gap-2 text-xs font-medium ${
                            isAIConfigured && currentChapter
                              ? 'bg-slate-950 hover:bg-amber-950/10 border-slate-800 hover:border-amber-500/40 text-slate-300 cursor-pointer'
                              : 'bg-slate-950/40 text-slate-600 border-slate-900 cursor-not-allowed'
                          }`}
                          id="quick-tool-sensory"
                        >
                          <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>Atmosferi Güçlendir (Duyusal)</span>
                        </button>

                        <button
                          onClick={() => handleQuickGeminiTool('action_dialogue')}
                          disabled={!isAIConfigured || !currentChapter}
                          className={`w-full p-2.5 rounded-xl border text-left transition flex items-center gap-2 text-xs font-medium ${
                            isAIConfigured && currentChapter
                              ? 'bg-slate-950 hover:bg-amber-950/10 border-slate-800 hover:border-amber-500/40 text-slate-300 cursor-pointer'
                              : 'bg-slate-950/40 text-slate-600 border-slate-900 cursor-not-allowed'
                          }`}
                          id="quick-tool-dialogue"
                        >
                          <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>Diyalogları Canlandır</span>
                        </button>
                      </div>

                      {/* Kurgu & Keşif Grubu */}
                      <div className="space-y-2" id="quick-gemini-group-ideas">
                        <label className="text-[10px] font-bold text-amber-500/80 uppercase tracking-wider block">Yaratıcı Editörlük</label>

                        <button
                          onClick={() => handleQuickGeminiTool('auto_synopsis')}
                          disabled={!isAIConfigured || !currentChapter}
                          className={`w-full p-2.5 rounded-xl border text-left transition flex items-center gap-2 text-xs font-medium ${
                            isAIConfigured && currentChapter
                              ? 'bg-slate-950 hover:bg-amber-950/10 border-slate-800 hover:border-amber-500/40 text-slate-300 cursor-pointer'
                              : 'bg-slate-950/40 text-slate-600 border-slate-900 cursor-not-allowed'
                          }`}
                          id="quick-tool-synopsis"
                        >
                          <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>Otomatik Özet Çıkar</span>
                        </button>

                        <button
                          onClick={() => handleQuickGeminiTool('suggest_title')}
                          disabled={!isAIConfigured || !currentChapter}
                          className={`w-full p-2.5 rounded-xl border text-left transition flex items-center gap-2 text-xs font-medium ${
                            isAIConfigured && currentChapter
                              ? 'bg-slate-950 hover:bg-amber-950/10 border-slate-800 hover:border-amber-500/40 text-slate-300 cursor-pointer'
                              : 'bg-slate-950/40 text-slate-600 border-slate-900 cursor-not-allowed'
                          }`}
                          id="quick-tool-title"
                        >
                          <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>Farklı Başlık Önerileri Al</span>
                        </button>

                        <button
                          onClick={() => handleQuickGeminiTool('cliffhanger')}
                          disabled={!isAIConfigured || !currentChapter}
                          className={`w-full p-2.5 rounded-xl border text-left transition flex items-center gap-2 text-xs font-medium ${
                            isAIConfigured && currentChapter
                              ? 'bg-slate-950 hover:bg-amber-950/10 border-slate-800 hover:border-amber-500/40 text-slate-300 cursor-pointer'
                              : 'bg-slate-950/40 text-slate-600 border-slate-900 cursor-not-allowed'
                          }`}
                          id="quick-tool-cliffhanger"
                        >
                          <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>Bölüm Sonu Çengeli (Cliffhanger)</span>
                        </button>
                      </div>

                      <p className="text-[9px] text-slate-500 leading-normal" id="quick-gemini-info">
                        * Araçlar, mevcut bölüm metninizin tamamını analiz ederek en uygun edebî sonuçları doğrudan Gemini API'si ile dinamik olarak kurgular.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CHARACTERS */}
          {activeTab === 'characters' && (
            <div className="space-y-6" id="tab-characters">
              
              {/* Header and Quick generator trigger */}
              <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 shadow" id="characters-header">
                <div id="characters-header-info">
                  <h2 className="text-sm font-semibold text-slate-200">Karakter Kütüphanesi</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">Hikaye evreninizdeki şahsiyetler, motivasyonları ve sırlar.</p>
                </div>
                <div className="flex gap-2" id="characters-header-actions">
                  <button
                    onClick={handleAIGenerateCharacter}
                    disabled={!isAIConfigured}
                    className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                      isAIConfigured 
                        ? 'bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/40 text-purple-200 cursor-pointer' 
                        : 'bg-slate-950 text-slate-600 border border-slate-900 cursor-not-allowed'
                    }`}
                    id="btn-ai-gen-character"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                    Yapay Zeka Karakter Yarat
                  </button>
                  <button
                    onClick={handleAddCharacter}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition shadow"
                    id="btn-manual-add-character"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Karakter Ekle
                  </button>
                </div>
              </div>

              {/* Master / Detail split panel */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="characters-main-grid">
                
                {/* Character selection list */}
                <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5 max-h-[550px] overflow-y-auto" id="characters-list-panel">
                  <h3 className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Tüm Karakterler</h3>
                  <div className="space-y-1.5" id="characters-list">
                    {story.characters.map(char => (
                      <div
                        key={char.id}
                        onClick={() => setSelectedCharId(char.id)}
                        className={`p-3 rounded-lg cursor-pointer transition border flex items-center gap-2.5 relative group ${
                          selectedCharId === char.id
                            ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200'
                            : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-slate-300'
                        }`}
                        id={`character-list-item-${char.id}`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full`} style={{ 
                          backgroundColor: char.avatarColor === 'amber' ? '#fbbf24' : char.avatarColor === 'rose' ? '#f43f5e' : char.avatarColor === 'emerald' ? '#10b981' : char.avatarColor === 'indigo' ? '#6366f1' : char.avatarColor === 'blue' ? '#3b82f6' : '#a855f7'
                        }} />
                        <div className="flex-1 min-w-0" id={`character-list-item-info-${char.id}`}>
                          <p className="text-xs font-bold truncate">{char.name}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{char.role === 'basrol' ? 'Başrol' : char.role === 'antagonist' ? 'Antagonist' : char.role === 'yardimci' ? 'Yardımcı' : 'Diğer'}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteCharacter(char.id); }}
                          className="absolute right-2 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 p-1 rounded transition cursor-pointer"
                          id={`btn-delete-character-${char.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Character Detail and editing form */}
                <div className="lg:col-span-3" id="character-detail-container">
                  {selectedCharId ? (
                    (() => {
                      const char = story.characters.find(c => c.id === selectedCharId);
                      if (!char) return null;
                      return (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4" id={`character-editor-form-${char.id}`}>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4" id="char-form-header">
                            <div className="flex items-center gap-3 w-full sm:w-auto" id="char-title-inputs">
                              <div className={`w-5 h-5 rounded-full shrink-0`} style={{ 
                                backgroundColor: char.avatarColor === 'amber' ? '#fbbf24' : char.avatarColor === 'rose' ? '#f43f5e' : char.avatarColor === 'emerald' ? '#10b981' : char.avatarColor === 'indigo' ? '#6366f1' : char.avatarColor === 'blue' ? '#3b82f6' : '#a855f7'
                              }} />
                              <input
                                type="text"
                                value={char.name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateStory(prev => ({
                                    ...prev,
                                    characters: prev.characters.map(c => c.id === selectedCharId ? { ...c, name: val } : c)
                                  }));
                                }}
                                className="text-lg font-bold bg-transparent text-slate-200 border-b border-transparent hover:border-slate-850 focus:border-indigo-500 focus:outline-none w-full sm:w-64 transition"
                                id="char-name-input"
                              />
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs" id="char-role-select-container">
                              <span className="text-slate-400">Rolü:</span>
                              <select
                                value={char.role}
                                onChange={(e) => {
                                  const val = e.target.value as Character['role'];
                                  updateStory(prev => ({
                                    ...prev,
                                    characters: prev.characters.map(c => c.id === selectedCharId ? { ...c, role: val } : c)
                                  }));
                                }}
                                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 focus:outline-none"
                                id="char-role-select"
                              >
                                <option value="basrol">Başrol</option>
                                <option value="antagonist">Antagonist / Karşıt</option>
                                <option value="yardimci">Yardımcı Karakter</option>
                                <option value="diger">Diğer / Figüran</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs" id="char-details-inputs-grid">
                            <div className="space-y-1" id="char-phys-desc-container">
                              <label className="text-slate-400 font-semibold uppercase tracking-wider block">Fiziksel Görünüm</label>
                              <textarea
                                rows={3}
                                value={char.physicalDesc}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateStory(prev => ({ ...prev, characters: prev.characters.map(c => c.id === selectedCharId ? { ...c, physicalDesc: val } : c) }));
                                }}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 resize-none"
                                placeholder="Göz rengi, boyu, giysileri, dikkat çekici yaraları veya mekanik parçaları..."
                                id="char-phys-desc-textarea"
                              />
                            </div>

                            <div className="space-y-1" id="char-personality-container">
                              <label className="text-slate-400 font-semibold uppercase tracking-wider block">Kişilik & Alışkanlıklar</label>
                              <textarea
                                rows={3}
                                value={char.personality}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateStory(prev => ({ ...prev, characters: prev.characters.map(c => c.id === selectedCharId ? { ...c, personality: val } : c) }));
                                }}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 resize-none"
                                placeholder="Korkuları, zaafları, inatçı yönleri, sevdikleri..."
                                id="char-personality-textarea"
                              />
                            </div>

                            <div className="space-y-1" id="char-backstory-container">
                              <label className="text-slate-400 font-semibold uppercase tracking-wider block">Geçmiş Hikayesi (Backstory)</label>
                              <textarea
                                rows={4}
                                value={char.backstory}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateStory(prev => ({ ...prev, characters: prev.characters.map(c => c.id === selectedCharId ? { ...c, backstory: val } : c) }));
                                }}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 resize-none"
                                placeholder="Çocukluğu, yaşadığı kırılma noktaları, onu bugün olduğu kişi yapan şeyler..."
                                id="char-backstory-textarea"
                              />
                            </div>

                            <div className="space-y-1" id="char-goals-container">
                              <label className="text-slate-400 font-semibold uppercase tracking-wider block">Motive Eden Hedefler & Sırlar</label>
                              <textarea
                                rows={4}
                                value={`${char.goals || ''}\n\nSIRRI:\n${char.secrets || ''}`}
                                onChange={(e) => {
                                  const rawText = e.target.value;
                                  const parts = rawText.split('SIRRI:');
                                  const goalsPart = parts[0]?.trim() || '';
                                  const secretsPart = parts[1]?.trim() || '';
                                  updateStory(prev => ({
                                    ...prev,
                                    characters: prev.characters.map(c => c.id === selectedCharId ? { ...c, goals: goalsPart, secrets: secretsPart } : c)
                                  }));
                                }}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 resize-none font-mono"
                                placeholder="Karakterin asıl amacı nedir? Herkesten gizlediği o karanlık sır ne?"
                                id="char-goals-textarea"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl p-12 text-center" id="char-empty-fallback">
                      <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                      <h3 className="text-sm font-semibold text-slate-400">Karakter Seçilmedi</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Soldaki listeden bir karakter seçerek detaylarını düzenleyebilir veya yeni karakter ekleyebilirsiniz.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: PLACES */}
          {activeTab === 'places' && (
            <div className="space-y-6" id="tab-places">
              
              <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 shadow" id="places-header">
                <div>
                  <h2 className="text-sm font-semibold text-slate-200">Mekan ve Atmosfer Kütüphanesi</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">Sahnelerinizin geçtiği mekanların duyusal tasvirleri ve kurgu önemi.</p>
                </div>
                <div className="flex gap-2" id="places-header-actions">
                  <button
                    onClick={handleAIGeneratePlace}
                    disabled={!isAIConfigured}
                    className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                      isAIConfigured 
                        ? 'bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/40 text-purple-200 cursor-pointer' 
                        : 'bg-slate-950 text-slate-600 border border-slate-900 cursor-not-allowed'
                    }`}
                    id="btn-ai-gen-place"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                    Yapay Zeka Mekan Tasarla
                  </button>
                  <button
                    onClick={handleAddPlace}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition shadow"
                    id="btn-manual-add-place"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Mekan Ekle
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="places-main-grid">
                
                {/* Places selection list */}
                <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5 max-h-[550px] overflow-y-auto" id="places-list-panel">
                  <h3 className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Mekanlar</h3>
                  <div className="space-y-1.5" id="places-list">
                    {story.places.map(place => (
                      <div
                        key={place.id}
                        onClick={() => setSelectedPlaceId(place.id)}
                        className={`p-3 rounded-lg cursor-pointer transition border flex items-center gap-2.5 relative group ${
                          selectedPlaceId === place.id
                            ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200'
                            : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-slate-300'
                        }`}
                        id={`place-list-item-${place.id}`}
                      >
                        <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div className="flex-1 min-w-0" id={`place-list-item-info-${place.id}`}>
                          <p className="text-xs font-bold truncate">{place.name}</p>
                          <p className="text-[9px] text-slate-500 truncate mt-0.5">{place.description.substring(0, 30)}...</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeletePlace(place.id); }}
                          className="absolute right-2 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 p-1 rounded transition cursor-pointer"
                          id={`btn-delete-place-${place.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Place Detail and Editor */}
                <div className="lg:col-span-3" id="place-detail-container">
                  {selectedPlaceId ? (
                    (() => {
                      const place = story.places.find(p => p.id === selectedPlaceId);
                      if (!place) return null;
                      return (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4" id={`place-editor-form-${place.id}`}>
                          <div className="border-b border-slate-800 pb-4" id="place-form-header">
                            <input
                              type="text"
                              value={place.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateStory(prev => ({
                                  ...prev,
                                  places: prev.places.map(p => p.id === selectedPlaceId ? { ...p, name: val } : p)
                                }));
                              }}
                              className="text-lg font-bold bg-transparent text-slate-200 border-b border-transparent hover:border-slate-850 focus:border-indigo-500 focus:outline-none w-full max-w-md transition"
                              id="place-name-input"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs" id="place-details-inputs-grid">
                            <div className="space-y-1" id="place-desc-container">
                              <label className="text-slate-400 font-semibold uppercase tracking-wider block">Mekan Açıklaması & Tasarımı</label>
                              <textarea
                                rows={4}
                                value={place.description}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateStory(prev => ({ ...prev, places: prev.places.map(p => p.id === selectedPlaceId ? { ...p, description: val } : p) }));
                                }}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                                placeholder="Mekanın coğrafi veya mimari detayları neler? Boyutları, mimari üslubu..."
                                id="place-desc-textarea"
                              />
                            </div>

                            <div className="space-y-1" id="place-sensory-container">
                              <label className="text-slate-400 font-semibold uppercase tracking-wider block">Duyusal Detaylar (Atmosfer)</label>
                              <textarea
                                rows={4}
                                value={place.sensoryDetails}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateStory(prev => ({ ...prev, places: prev.places.map(p => p.id === selectedPlaceId ? { ...p, sensoryDetails: val } : p) }));
                                }}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                                placeholder="Okuyucuya hissettireceğimiz sesler, kokular, ışık süzmeleri, hava sıcaklığı ve ortam havası..."
                                id="place-sensory-textarea"
                              />
                            </div>

                            <div className="space-y-1 md:col-span-2" id="place-significance-container">
                              <label className="text-slate-400 font-semibold uppercase tracking-wider block">Kurgusal Önemi</label>
                              <textarea
                                rows={3}
                                value={place.significance}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateStory(prev => ({ ...prev, places: prev.places.map(p => p.id === selectedPlaceId ? { ...p, significance: val } : p) }));
                                }}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                                placeholder="Bu mekanda hangi kilit olay yaşanacak? Hikayenin gidişatı açısından neden kritik bir öneme sahip?"
                                id="place-significance-textarea"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl p-12 text-center" id="place-empty-fallback">
                      <MapPin className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                      <h3 className="text-sm font-semibold text-slate-400">Mekan Seçilmedi</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Mekan düzenlemek için listeden bir yer seçin veya yeni bir mekan tasarlayarak başlayın.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 5: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-6" id="tab-timeline">
              <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 shadow" id="timeline-header">
                <div>
                  <h2 className="text-sm font-semibold text-slate-200">Zaman Çizelgesi ve Kronolojik Olay Örgüsü</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">Olayları sırayla dizerek senaryo akışını baştan sona kontrol edin.</p>
                </div>
                <button
                  onClick={handleAddTimelineEvent}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition shadow"
                  id="btn-add-timeline-event"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Yeni Kilometre Taşı / Olay Ekle
                </button>
              </div>

              {/* Vertical timeline line visual */}
              <div className="relative border-l-2 border-slate-800 pl-6 ml-4 space-y-6" id="timeline-flow-list">
                {story.timelineEvents.sort((a, b) => a.sequence - b.sequence).map((event, index) => (
                  <div key={event.id} className="relative bg-slate-900 border border-slate-850 rounded-xl p-4 text-xs space-y-3 shadow-md" id={`timeline-event-card-${event.id}`}>
                    
                    {/* Floating timeline dot marker */}
                    <span className="absolute -left-[33px] top-4 w-4.5 h-4.5 rounded-full border-4 border-slate-950 bg-indigo-500 flex items-center justify-center font-mono text-[8px] text-white font-bold" id={`timeline-dot-${event.id}`}>
                      {index + 1}
                    </span>

                    <div className="flex items-center justify-between gap-3 border-b border-slate-800/60 pb-2" id={`timeline-card-header-${event.id}`}>
                      <div className="flex items-center gap-2 flex-1" id={`timeline-title-inputs-${event.id}`}>
                        <input
                          type="text"
                          value={event.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateStory(prev => ({
                              ...prev,
                              timelineEvents: prev.timelineEvents.map(ev => ev.id === event.id ? { ...ev, title: val } : ev)
                            }));
                          }}
                          className="font-bold bg-transparent text-slate-200 border-b border-transparent hover:border-slate-800 focus:border-indigo-500 focus:outline-none w-64 text-xs"
                          id={`timeline-title-input-${event.id}`}
                        />
                      </div>

                      <div className="flex items-center gap-2" id={`timeline-card-actions-${event.id}`}>
                        {/* Sequence re-order simple buttons */}
                        <button
                          disabled={index === 0}
                          onClick={() => {
                            updateStory(prev => {
                              const sorted = [...prev.timelineEvents].sort((a, b) => a.sequence - b.sequence);
                              const targetIndex = index - 1;
                              // Swap sequence values
                              const temp = sorted[index].sequence;
                              sorted[index].sequence = sorted[targetIndex].sequence;
                              sorted[targetIndex].sequence = temp;
                              return { ...prev, timelineEvents: sorted };
                            });
                          }}
                          className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-[10px] text-slate-400 hover:text-slate-200 disabled:opacity-30 rounded transition"
                          id={`btn-timeline-up-${event.id}`}
                        >
                          ▲
                        </button>
                        <button
                          disabled={index === story.timelineEvents.length - 1}
                          onClick={() => {
                            updateStory(prev => {
                              const sorted = [...prev.timelineEvents].sort((a, b) => a.sequence - b.sequence);
                              const targetIndex = index + 1;
                              const temp = sorted[index].sequence;
                              sorted[index].sequence = sorted[targetIndex].sequence;
                              sorted[targetIndex].sequence = temp;
                              return { ...prev, timelineEvents: sorted };
                            });
                          }}
                          className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-[10px] text-slate-400 hover:text-slate-200 disabled:opacity-30 rounded transition"
                          id={`btn-timeline-down-${event.id}`}
                        >
                          ▼
                        </button>
                        <button
                          onClick={() => handleDeleteTimeline(event.id)}
                          className="text-slate-600 hover:text-red-400 p-1 rounded hover:bg-slate-800/80 transition cursor-pointer"
                          id={`btn-delete-timeline-${event.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div id={`timeline-desc-container-${event.id}`}>
                      <textarea
                        rows={2}
                        value={event.description}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateStory(prev => ({
                            ...prev,
                            timelineEvents: prev.timelineEvents.map(ev => ev.id === event.id ? { ...ev, description: val } : ev)
                          }));
                        }}
                        placeholder="Olayın içeriği, etkilenen karakterler..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-300 focus:outline-none focus:border-indigo-500 resize-none text-xs"
                        id={`timeline-desc-textarea-${event.id}`}
                      />
                    </div>
                  </div>
                ))}

                {story.timelineEvents.length === 0 && (
                  <div className="p-8 text-center bg-slate-900/40 border border-slate-800/60 rounded-xl" id="timeline-empty-fallback">
                    <Clock className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                    <h3 className="text-xs font-semibold text-slate-400">Henüz Olay Bulunmamaktadır</h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Yeni olaylar ve tarihler yerleştirerek kronolojik çizginizi başlatın.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: CANVAS MODE (STORY CANVAS) */}
          {activeTab === 'canvas' && (
            <div className="space-y-4" id="tab-canvas">
              <StoryCanvas
                story={story}
                onUpdateStory={updateStory}
                onGenerateAICard={handleGenerateAICanvasCard}
                isAIConfigured={isAIConfigured}
              />
            </div>
          )}

          {/* TAB 7: SETTINGS & BYOK */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-6" id="tab-settings">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6" id="settings-card">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-4" id="settings-header">
                  <Settings className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-sm font-semibold text-slate-200">Gemini Yapay Zeka & Uygulama Ayarları</h2>
                </div>

                {/* API Key settings Section (BYOK) */}
                <div className="space-y-4" id="api-key-config-section">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">1. API Anahtarı Ayarları (BYOK)</h3>
                  
                  <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-3" id="api-key-inputs">
                    <div className="space-y-1 text-xs" id="custom-api-key-input-container">
                      <label className="text-slate-400 font-medium block">Gemini API Anahtarınızı Girin (Bring Your Own Key)</label>
                      <input
                        type="password"
                        value={story.settings.apiKey || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateStory(prev => ({
                            ...prev,
                            settings: {
                              ...prev.settings,
                              apiKey: val
                            }
                          }));
                        }}
                        placeholder="AI Studio API anahtarınızı buraya yapıştırın (AIzaSy...)"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                        id="input-user-byok-key"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        API anahtarınız sadece tarayıcınızda (LocalStorage) saklanır, dış sunuculara veya veritabanlarına gönderilmez. Doğrudan Google Gemini API uç noktalarına yetkilendirme sağlar.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Model and hyperparameter configuration */}
                <div className="space-y-4 text-xs" id="hyperparameters-section">
                  <h3 className="font-bold text-slate-300 uppercase tracking-wider">2. Model & Yapay Zeka Parametreleri</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="params-grid">
                    <div className="space-y-1" id="param-model-container">
                      <label className="text-slate-400 font-medium block">Kullanılacak Gemini Modeli</label>
                      <select
                        value={story.settings.model}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateStory(prev => ({
                            ...prev,
                            settings: { ...prev.settings, model: val }
                          }));
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-300 focus:outline-none"
                        id="select-active-gemini-model"
                      >
                        <option value="gemini-3.5-flash">gemini-3.5-flash (En Hızlı / Son Teknoloji)</option>
                        <option value="gemini-2.5-flash">gemini-2.5-flash (Hızlı / Dengeli)</option>
                        <option value="gemini-2.5-pro">gemini-2.5-pro (Aşırı Zengin ve Edebi Anlatım)</option>
                      </select>
                    </div>

                    <div className="space-y-1" id="param-temp-container">
                      <div className="flex justify-between items-center text-slate-400 font-medium" id="param-temp-header">
                        <span>Sıcaklık (Creativity / Randomness)</span>
                        <span className="font-mono text-indigo-400">{story.settings.temperature}</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.2"
                        step="0.1"
                        value={story.settings.temperature}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateStory(prev => ({
                            ...prev,
                            settings: { ...prev.settings, temperature: val }
                          }));
                        }}
                        className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-2"
                        id="slider-gemini-temperature"
                      />
                      <div className="flex justify-between text-[9px] text-slate-500" id="param-temp-footer">
                        <span>0.1 (Mantıksal / Tutarlı)</span>
                        <span>1.2 (Sürreal / Aşırı Yaratıcı)</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 pt-2" id="param-system-instruction-container">
                    <label className="text-slate-400 font-medium block">Yazar Asistanı Sistem Direktifi (System Instruction)</label>
                    <textarea
                      rows={4}
                      value={story.settings.systemInstruction}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateStory(prev => ({
                          ...prev,
                          settings: { ...prev.settings, systemInstruction: val }
                        }));
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-300 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed resize-y"
                      id="textarea-system-instruction"
                    />
                    <p className="text-[10px] text-slate-500">
                      Bu direktif, Yapay Zeka asistanına hangi edebi kimlikle yazması gerektiğini söyler. Farklı bir kurgu türü seçtiğinizde otomatik olarak güncellenir.
                    </p>
                  </div>
                </div>

                {/* Danger zone / resets */}
                <div className="pt-4 border-t border-slate-800/60 text-xs space-y-2" id="danger-zone-section">
                  <h4 className="font-bold text-red-400 uppercase tracking-wider">Tehlikeli Bölge</h4>
                  <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3" id="danger-actions-box">
                    <div>
                      <p className="font-semibold text-slate-200">Fabrika Ayarlarına Dön</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Tüm yerel veritabanı hikaye içeriğini siler ve ilk steampunk kurguyu yükler.</p>
                    </div>
                    <button
                      onClick={handleResetStory}
                      className="px-3.5 py-1.5 bg-red-900/40 hover:bg-red-900/60 border border-red-700/40 text-red-300 text-xs font-semibold rounded-lg cursor-pointer transition"
                      id="btn-settings-reset"
                    >
                      Verileri Sıfırla
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

        </section>
      </main>

      {/* Global Bottom Status Bar */}
      <footer className="bg-slate-900 border-t border-slate-800 py-2.5 px-6 text-center text-[10px] text-slate-500 flex flex-wrap items-center justify-between gap-2" id="app-footer">
        <p id="footer-copyright">© 2026 Mürekkep & Saat - Tüm hakları yerel tarayıcınızda saklıdır.</p>
        <p className="font-mono" id="footer-stats-info">
          Bölümler: {story.chapters.length} | Karakterler: {story.characters.length} | Mekanlar: {story.places.length} | Zaman Çizelgesi: {story.timelineEvents.length} Olay
        </p>
      </footer>

      {/* Full screen modal popup to view rich AI results cleanly */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in" id="global-popup-modal">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl" id="popup-modal-content-wrapper">
            
            <div className="bg-slate-850 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between" id="popup-modal-header">
              <h3 className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                {modalTitle}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-200 font-bold font-mono text-base p-1"
                id="btn-close-modal"
              >
                ×
              </button>
            </div>

            <div className="p-5 overflow-y-auto text-slate-300 text-xs leading-relaxed space-y-4 custom-scrollbar whitespace-pre-wrap max-h-[60vh]" id="popup-modal-body">
              {modalContent}
            </div>

            <div className="bg-slate-850 px-5 py-3.5 border-t border-slate-800 flex items-center justify-end gap-2" id="popup-modal-footer">
              {modalTitle.includes("OMNIVERSE") && (
                <button
                  onClick={() => handleAppendOmniverseChapter(modalContent)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 border border-amber-500/20 rounded-lg text-[11px] text-white font-semibold flex items-center gap-1.5 transition cursor-pointer shadow"
                  id="btn-add-omniverse-chapter"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Yeni Bölüm Olarak Ekle
                </button>
              )}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(modalContent);
                  alert("Metin panoya kopyalandı!");
                }}
                className="px-3.5 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-700 rounded-lg text-[11px] text-slate-300 font-medium flex items-center gap-1.5 transition cursor-pointer"
                id="btn-copy-modal-content"
              >
                <Copy className="w-3.5 h-3.5" />
                Panoya Kopyala
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-semibold cursor-pointer transition shadow"
                id="btn-close-modal-bottom"
              >
                Kapat
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
