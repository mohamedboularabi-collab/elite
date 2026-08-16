/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  BookOpen, 
  Copy, 
  CheckCircle2, 
  Download, 
  History, 
  Trash2, 
  Loader2, 
  AlertCircle, 
  Feather, 
  FileText, 
  Share2, 
  ArrowRight,
  BookMarked,
  Clock,
  Layers,
  Search,
  Quote,
  Volume2,
  VolumeX,
  Type,
  Mic,
  Play,
  Pause,
  User,
  Radio,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  ChevronRight,
  ChevronLeft,
  Volume1,
  Sliders,
  Languages,
  Globe,
  ExternalLink,
  FileCheck
} from 'lucide-react';

// --- Types ---
interface TextStyle {
  id: string;
  name: string;
  description: string;
  badge: string;
}

interface VoiceOption {
  id: string;
  name: string;
  description: string;
  voiceName: string;
  badge: string;
  avatar: string;
}

interface GeneratedText {
  id: string;
  topic: string;
  styleName: string;
  content: string;
  translations?: {
    fr?: string;
    en?: string;
  };
  wordCount: number;
  charCount: number;
  timestamp: number;
}

const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: 'harry',
    name: 'القارئ هاري (Harry - Deep & Warm)',
    description: 'صوت دافئ، عميق، ورخيم مخصص للإلقاء الفلسفي والأدبي الرزين',
    voiceName: 'Puck',
    badge: 'دافئ وعميق جداً (الافتراضي)',
    avatar: '🎙️'
  },
  {
    id: 'nizar',
    name: 'القارئ نزار طه حاج أحمد',
    description: 'صوت رخيم، وقور، وجليل يناسب القراءات الفكرية والتأملية',
    voiceName: 'Charon',
    badge: 'وقور وجليل',
    avatar: '🗣️'
  },
  {
    id: 'fenrir',
    name: 'القارئ فينرير (Fenrir - Deep Pitch)',
    description: 'صوت جهوري، عميق، وفخم للإلقاء الخطابي والفكري الفصيح',
    voiceName: 'Fenrir',
    badge: 'جهوري وعميق',
    avatar: '🔊'
  },
  {
    id: 'aoede',
    name: 'القارئة أود (Aoede)',
    description: 'صوت أنثوي وقور وشاعر يناسب التأملات الروحية والأدبية',
    voiceName: 'Aoede',
    badge: 'أنثوي وقور',
    avatar: '✨'
  },
  {
    id: 'kore',
    name: 'القارئة كور (Kore)',
    description: 'صوت أنثوي نقي وهادئ مع جودة إلقاء عالية',
    voiceName: 'Kore',
    badge: 'أنثوي نقي',
    avatar: '🌸'
  }
];

const TEXT_STYLES: TextStyle[] = [
  { 
    id: 'philosophical', 
    name: 'سرد فلسفي نخبوي عميق', 
    description: 'تحليل وجودي وفكري يدمج الرؤى الميتافيزيقية والأخلاقية ونقد الوعي.',
    badge: 'فلسفة ووجود'
  },
  { 
    id: 'literary', 
    name: 'سرد أدبي وجداني حالم', 
    description: 'لغة شاعرية مكثفة، غنية بالصور البيانية والزمن النفسي وتأملات الروح.',
    badge: 'أدب ووجدانيات'
  },
  { 
    id: 'critical', 
    name: 'نقد فكري واجتماعي حاد', 
    description: 'تفكيك لظواهر السلطة، الهيمنة، والتربية، والاستهلاك برؤية سوسيولوجية نقذية.',
    badge: 'نقد ومجتمع'
  },
  { 
    id: 'psychoanalytic', 
    name: 'تحليل نفسي ومستويات الوعي', 
    description: 'غوص في لاوعي الإنسان، الرغبة المحاكية، النقص، وأزمات الذات المعاصرة.',
    badge: 'علم النفس والذات'
  },
];

const LENGTH_OPTIONS = [
  { id: 'max', label: 'دراسة موسعة (حد أقصى ~9,000 حرف)', wordsTarget: 1400, maxChars: 9000 },
  { id: 'medium', label: 'مقال عميق (حوالي ~5,000 حرف)', wordsTarget: 800, maxChars: 5000 },
  { id: 'short', label: 'إشراقة تأملية (حوالي ~2,500 حرف)', wordsTarget: 400, maxChars: 2500 },
];

// --- Audio Utils ---
const ttsChunkCache = new Map<string, Uint8Array>();

function getTTSChunkCacheKey(text: string, voiceId: string): string {
  let hash = 0;
  const str = `${voiceId}::${text.trim()}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return `tts_pcm_${voiceId}_${hash}`;
}

function splitTextIntoBalancedChunks(text: string, targetSize: number = 700): string[] {
  const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const p of paragraphs) {
    if (p.length > targetSize) {
      const sentences = p.match(/[^.!?؟\n]+[.!?؟\n]*/g) || [p];
      for (const sentence of sentences) {
        if ((currentChunk + " " + sentence).length <= targetSize) {
          currentChunk = currentChunk ? currentChunk + " " + sentence : sentence;
        } else {
          if (currentChunk) chunks.push(currentChunk.trim());
          currentChunk = sentence;
        }
      }
    } else if ((currentChunk + "\n\n" + p).length <= targetSize) {
      currentChunk = currentChunk ? currentChunk + "\n\n" + p : p;
    } else {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = p;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

function pcmToWav(pcmData: Uint8Array, sampleRate: number = 24000): Blob {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + pcmData.length, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 1 * 16 / 8, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, pcmData.length, true);

  const wavBytes = new Uint8Array(44 + pcmData.length);
  wavBytes.set(new Uint8Array(header), 0);
  wavBytes.set(pcmData, 44);

  return new Blob([wavBytes], { type: 'audio/wav' });
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'create' | 'library'>('create');
  const [topic, setTopic] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<TextStyle>(TEXT_STYLES[0]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(VOICE_OPTIONS[0]);
  const [selectedLength, setSelectedLength] = useState(LENGTH_OPTIONS[0]);
  const [customNotes, setCustomNotes] = useState('');
  
  const [enableTashkeel, setEnableTashkeel] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioProgressText, setAudioProgressText] = useState<string>('');
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [isDiacritizing, setIsDiacritizing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [currentTopicTitle, setCurrentTopicTitle] = useState('');
  const [translations, setTranslations] = useState<{ fr?: string; en?: string }>({});
  const [currentLanguage, setCurrentLanguage] = useState<'ar' | 'fr' | 'en' | 'bilingual'>('ar');
  const [bilingualTargetLang, setBilingualTargetLang] = useState<'fr' | 'en'>('fr');
  const [isTranslating, setIsTranslating] = useState<'fr' | 'en' | null>(null);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [history, setHistory] = useState<GeneratedText[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Audio Player & Reader Navigation State
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [audioVolume, setAudioVolume] = useState(1);

  // Audio Player Navigation Handlers
  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().then(() => setIsPlayingAudio(true)).catch(console.error);
    }
  };

  const handleSkipTime = (seconds: number) => {
    if (!audioRef.current) return;
    const newTime = Math.min(Math.max(audioRef.current.currentTime + seconds, 0), audioDuration || 0);
    audioRef.current.currentTime = newTime;
    setAudioCurrentTime(newTime);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setAudioCurrentTime(newTime);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setAudioVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const formatAudioTime = (timeInSec: number) => {
    if (isNaN(timeInSec) || timeInSec < 0) return "00:00";
    const mins = Math.floor(timeInSec / 60);
    const secs = Math.floor(timeInSec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // High-Quality Gemini TTS Audio Generation with selected voice
  const handleGenerateAudio = async () => {
    if (!generatedContent || isGeneratingAudio) return;
    setIsGeneratingAudio(true);
    setAudioProgressText('جاري تحضير الأجزاء الصوتية...');
    setError(null);

    try {
      const chunksToProcess = splitTextIntoBalancedChunks(generatedContent, 750);

      let voiceStylePrompt = "";
      if (selectedVoice.id === 'harry') {
        voiceStylePrompt = `بأسلوب القارئ والملقي هاري (Harry)، بنبرة صوتية دافئة جداً (Warm)، وعميقة (Deep)، ورخيمة، ورزينة، اقرأ بوضوح وتأنٍ وفصاحة عالية`;
      } else if (selectedVoice.id === 'nizar') {
        voiceStylePrompt = `بأسلوب القارئ والملقي "نزار طه حاج أحمد"، وبنبرة رخيمة، ووقورة، وتأملية رصينة، اقرأ بوضوح وتأنٍ ورزانة`;
      } else {
        voiceStylePrompt = `بأسلوب ملقٍ محترف، وبنبرة ${selectedVoice.description}، اقرأ بوضوح وتأنٍ ورزانة فصيحة`;
      }

      const BATCH_SIZE = 3;
      const chunkResults: { index: number; pcm: Uint8Array }[] = [];

      for (let batchStart = 0; batchStart < chunksToProcess.length; batchStart += BATCH_SIZE) {
        const currentBatch = chunksToProcess.slice(batchStart, batchStart + BATCH_SIZE);
        const currentCount = Math.min(batchStart + currentBatch.length, chunksToProcess.length);
        setAudioProgressText(`جاري إلقاء وهندسة الصوت (${currentCount}/${chunksToProcess.length})...`);

        const batchPromises = currentBatch.map(async (chunkText, batchIdx) => {
          const globalIdx = batchStart + batchIdx;
          const cacheKey = getTTSChunkCacheKey(chunkText, selectedVoice.id);

          if (ttsChunkCache.has(cacheKey)) {
            return { index: globalIdx, pcm: ttsChunkCache.get(cacheKey)! };
          }

          try {
            const res = await fetch("/api/generate-tts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: chunkText,
                voiceName: selectedVoice.voiceName,
                promptStyle: voiceStylePrompt
              })
            });

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || `HTTP ${res.status}`);
            }

            const data = await res.json();
            const base64Audio = data.base64Audio;

            let chunkPcm = new Uint8Array(0);
            if (base64Audio) {
              const byteString = atob(base64Audio);
              const bytes = new Uint8Array(byteString.length);
              for (let j = 0; j < byteString.length; j++) {
                bytes[j] = byteString.charCodeAt(j);
              }
              chunkPcm = bytes;
            }

            if (chunkPcm.length > 0) {
              ttsChunkCache.set(cacheKey, chunkPcm);
            }

            return { index: globalIdx, pcm: chunkPcm };
          } catch (err: any) {
            console.error(`Error generating chunk ${globalIdx}:`, err);
            return { index: globalIdx, pcm: new Uint8Array(0) };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        chunkResults.push(...batchResults);
      }

      chunkResults.sort((a, b) => a.index - b.index);
      const totalPcmLength = chunkResults.reduce((sum, r) => sum + r.pcm.length, 0);
      let combinedPcm = new Uint8Array(totalPcmLength);
      let offset = 0;
      for (const r of chunkResults) {
        combinedPcm.set(r.pcm, offset);
        offset += r.pcm.length;
      }

      if (combinedPcm.length === 0) {
        throw new Error("تعذر توليد التسجيل الصوتي حالياً. يرجى إعادة المحاولة.");
      }

      const wavBlob = pcmToWav(combinedPcm, 24000);
      if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
      const url = URL.createObjectURL(wavBlob);
      setAudioBlobUrl(url);

    } catch (err: any) {
      console.error("Audio Generation Error:", err);
      setError(err?.message || "حدث خطأ أثناء توليد التسجيل الصوتي.");
    } finally {
      setIsGeneratingAudio(false);
      setAudioProgressText('');
    }
  };

  // Web Speech API for oral preview
  const handleSpeakToggle = () => {
    if (!('speechSynthesis' in window)) {
      alert('عذراً، ميزة المعاينة الصوتية غير مدعومة في متصفحك الحالي.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      let textToRead = generatedContent;
      let langCode = 'ar-SA';

      if (currentLanguage === 'fr' && translations.fr) {
        textToRead = translations.fr;
        langCode = 'fr-FR';
      } else if (currentLanguage === 'en' && translations.en) {
        textToRead = translations.en;
        langCode = 'en-US';
      } else if (currentLanguage === 'bilingual') {
        const trText = translations[bilingualTargetLang];
        if (trText) {
          textToRead = `${generatedContent}. ${trText}`;
        }
      }

      if (!textToRead) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = langCode;
      utterance.rate = 0.9; // Fluid natural reading pace
      
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Professional Literary & Philosophical Translation Handler
  const handleTranslate = async (targetLang: 'fr' | 'en') => {
    if (!generatedContent || isTranslating) return;
    setIsTranslating(targetLang);
    setError(null);

    try {
      const isFrench = targetLang === 'fr';
      const translationPrompt = isFrench
        ? `أنت مترجم أدبي وفلسفي خبير ومحترف باللغتين العربية والفرنسية.
المطلوب: ترجمة النص الفلسفي/الأدبي العربي التالي إلى اللغة الفرنسية (Français) ترجمة أدبية راقية، رفيعة الأسلوب، وبلاغية فائقة الدقة تحافظ على عمق الأفكار، الجزالة، والمصطلحات الفلسفية والأدبية العالمية.
- لا تضع أي مقدمات أو شروح أو تعليقات من عندك.
- أخرج فقط النص المترجم باللغة الفرنسية مباشرة.

النص العربي:
${generatedContent}`
        : `You are an expert literary and philosophical translator fluent in Arabic and English.
Task: Translate the following Arabic philosophical/literary essay into eloquent, high-caliber, publication-grade English. Preserve intellectual depth, rhythmic cadence, philosophical concepts, and stylistic sophistication.
- Do NOT include any introductions, notes, disclaimers, or preambles.
- Output only the clean English translated text directly.

Arabic text:
${generatedContent}`;

      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-3.7-flash",
          contents: translationPrompt,
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "خطأ أثناء توليد الترجمة");
      }

      const data = await res.json();
      const translatedText = data.text?.trim();
      if (!translatedText) throw new Error("لم يتم استلام نص الترجمة.");

      const updatedTranslations = {
        ...translations,
        [targetLang]: translatedText,
      };
      setTranslations(updatedTranslations);
      setCurrentLanguage(targetLang);

      // Sync with history
      setHistory(prev => prev.map(item => {
        if (item.content === generatedContent || item.id === currentEntryId) {
          return {
            ...item,
            translations: {
              ...item.translations,
              [targetLang]: translatedText,
            }
          };
        }
        return item;
      }));

    } catch (err: any) {
      console.error("Translation Error:", err);
      setError(err?.message || "تعذر إتمام الترجمة حالياً. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsTranslating(null);
    }
  };

  // Add / Remove Diacritics on demand
  const handleApplyDiacritics = async () => {
    if (!generatedContent || isDiacritizing) return;
    setIsDiacritizing(true);
    setError(null);

    try {
      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-3.7-flash",
          contents: `قم بإضافة التشكيل الكامل والنطق الفصيح (الفتحة، الضمة، الكسرة، السكون، الشدة، والتنوين) للنص العربي التالي ليصبح جاهزاً تماماً للقراءة والإلقاء الصوتي السلس، دون تعديل أو زيادة في كلمات النص الأصلية:\n\n${generatedContent}`,
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "خطأ في التشكيل");
      }

      const data = await res.json();
      if (data.text) {
        setGeneratedContent(data.text.trim());
      }
    } catch (err: any) {
      console.error("Diacritization Error:", err);
      setError(err?.message || "تعذر إضافة التشكيل حالياً.");
    } finally {
      setIsDiacritizing(false);
    }
  };

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('elite_text_studio_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history:", e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('elite_text_studio_history', JSON.stringify(history));
  }, [history]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedContent('');
    setCurrentTopicTitle(topic);

    try {
      const prompt = `
        قم بكتابة نص فكري وسردي نخبوي عالي الجودة باللغة العربية حول الموضوع التالي:
        الموضوع: "${topic}"
        
        نمط الكتابة المطلوبة: ${selectedStyle.name} (${selectedStyle.description})
        الطول المفضل: ${selectedLength.label}
        ${customNotes ? `توجيهات إضافية من المستخدم: ${customNotes}` : ''}

        **ضوابط ومحددات فكرية صارمة (ملزمة وقاطعة):**
        1. **عدم الاستشهاد بالكُتّاب الدينيين:** يُمنع الاستشهاد برجال الدين أو الفقهاء أو الكُتّاب ذوي الطابع الديني المباشر. ركّز بدلاً من ذلك على الفلسفة العقلانية، التحليل النفسي، الفكر الإنساني، الأدب العالمي الرفيع، وعلم الاجتماع.
        2. **ضابط وجود الخالق:** التزم التزاماً تاماً بعدم صياغة أي جُمل أو أفكار تنفي وجود الرب/الخالق أو تروّج للإلحاد والعدمية الإلحادية. حافظ على احترام وجود الخالق والمعنى الوجودي والكرامة الإنسانية، دون إدخال وعظ ديني أو نصوص دينية.

        **شرط حاسم وقاطع بخصوص حجم النص (مهم جداً):**
        - يجب ألا يتجاوز إجمالي عدد أحرف النص الإجمالي **10,000 حرف** بأي حال من الأحوال (أقل من 10,000 حرف).
        - استهدف حجم تقريبي قدره ${selectedLength.maxChars} حرف، ولا تتعدى السقف الأقصى مطلقاً.

        **المصادر والمفكرون والأعمال المرجعية الفلسفية والإنسانية (استحضرها وحللها ببراعة وعمق بحسب السياق):**
        - **الفلسفة، الوجودية، والوعي الإنساني:** 
          * بليز باسكال («خواطر» - الوعي الإنساني والتأمل في اللامتناهي)
          * سورين كيركغارد (الفلسفة الوجودية وبحث الإنسان عن المعنى الأصيل)
          * إيمانويل كانط («نقد العقل الخالص»، «نقد العقل العملي»)
          * سقراط، أفلاطون، أرسطو، وإبكتيتوس (الحكمة الكلاسيكية والرواقية)
          * باروخ سبينوزا، رينيه ديكارت
          * ابن خلدون («المقدمة» - العمران البشري وطبائع الاجتماع)
        - **علم النفس والتحليل النفسي واستكشاف الذات:** 
          * فيكتور فرانكل («الإنسان يبحث عن المعنى»)
          * كارل يونغ (الرمزية واللاوعي الجمعي والبحث عن التكامل النفسي)
          * إريك فروم («فن الحب»، «الخوف من الحرية»، «أن نملك أو أن نكون؟»)
          * سيغموند فرويد، جاك لاكان (بنية الرغبة والوعي)
          * رينيه جيرار («الخداع والرغبة والرواية» - نظرية الرغبة المحاكية)
        - **الفكر النقدي، المجتمع، وفلسفة الإنسان:**
          * حنة أرندت («أصول التوتاليتارية»، «الأزمة في التربية»)
          * باولو فريري («تربية المقهورين»)
          * ميشيل فوكو («المراقبة والمعاقبة»، «تاريخ أنظمة الفكر»)
          * خوسيه أورتيغا إي غاسيت («تمرد الجماهير»)
          * زغمونت باومان («الحداثة السائلة»)
        - **الأدب العالمي والفن الإنساني الخالد:**
          * فيودور دوستويفسكي («الإخوة كارامازوف»، «الجريمة والعقاب» - صراع الضمير البشري)
          * ليو تولستوي («موت إيفان إيليتش»، «اعتراف»)
          * جبران خليل جبران، ميخائيل نعيمة
          * جورج أورويل («1984»)، ألدوس هاكسلي («عالم جديد شجاع»)
          * أعمال سينمائية وموسيقية رمزية: (The Wave, The Wall - Pink Floyd, Whiplash, Kind of Blue - Miles Davis, Entre les murs).

        **المتطلبات الأسلوبية والتوافق مع القراءة الصوتية:**
        1. اكتب النص بأسلوب متصل، فخم، وجذاب يحاكي أسلوب المجلات الفلسفية والأدبية العريقة كتكست واحد متصل.
        2. تجنب التقسيم الفني للفقرات أو وضع عناوين فرعية وقوائم نقطية، وصُغ النص ليدفق ككتلة واحدة متماسكة بدون تجزئة.
        3. اربط بين التحليل النفسي والفلسفي والواقع الإنساني المعاصر بانسجام تام.
        4. أخرج النص جاهزاً تماماً للقراءة والنشر بدون أي مقدمات تشغيلية أو ملاحظات جانبية من الذكاء الاصطناعي.
        ${enableTashkeel ? `
        **شرط التشكيل الكامل والقراءة الصوتية السلسة (مهم جداً ومطلوب حتماً):**
        - يجب تشكيل النص العربي تشكيلاً كاملاً ودقيقاً (الفتحة، الضمة، الكسرة، السكون، الشدة، والتنوين) في جميع الكلمات والجمل.
        - يهدف التشكيل إلى تسهيل القراءة الصوتية والإلقاء السلس المباشر بدون أي التباس أو خطأ في النطق.
        ` : ''}
      `;

      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-3.7-flash",
          contents: prompt,
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "خطأ أثناء توليد النص");
      }

      const data = await res.json();
      const text = data.text;
      if (!text) throw new Error("لم يتم استلام أي نص من المحرك.");

      let cleanedText = text.trim();

      // Programmatic Guarantee: Strictly limit text to <= 10,000 characters
      if (cleanedText.length > 10000) {
        const truncated = cleanedText.substring(0, 9950);
        const lastBoundary = Math.max(
          truncated.lastIndexOf('.'), 
          truncated.lastIndexOf('؟'), 
          truncated.lastIndexOf('!'), 
          truncated.lastIndexOf('\n')
        );
        if (lastBoundary > 2000) {
          cleanedText = truncated.substring(0, lastBoundary + 1);
        } else {
          cleanedText = truncated + '...';
        }
      }

      const words = cleanedText.split(/\s+/).filter(Boolean).length;
      const chars = cleanedText.length;

      setGeneratedContent(cleanedText);
      setTranslations({});
      setCurrentLanguage('ar');

      // Add to history
      const newEntryId = Date.now().toString();
      setCurrentEntryId(newEntryId);

      const newEntry: GeneratedText = {
        id: newEntryId,
        topic,
        styleName: selectedStyle.name,
        content: cleanedText,
        translations: {},
        wordCount: words,
        charCount: chars,
        timestamp: Date.now(),
      };

      setHistory(prev => [newEntry, ...prev]);

    } catch (err: any) {
      console.error("Text Generation Error:", err);
      setError(err?.message || "حدث خطأ أثناء إنشاء النص الفكري.");
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteEntry = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const handleLoadHistoryItem = (item: GeneratedText) => {
    setTopic(item.topic);
    setCurrentTopicTitle(item.topic);
    setGeneratedContent(item.content);
    setTranslations(item.translations || {});
    setCurrentLanguage('ar');
    setCurrentEntryId(item.id);
    if (audioBlobUrl) {
      URL.revokeObjectURL(audioBlobUrl);
      setAudioBlobUrl(null);
    }
    setActiveTab('create');
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Copy error:", err);
    }
  };

  const downloadTextFile = (title: string, content: string, suffix?: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${title.replace(/[\s/]/g, '_')}${suffix ? `_${suffix}` : ''}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadBilingualFile = (title: string, arText: string, translatedText: string, langName: string) => {
    const separator = "================================================================";
    const fullDoc = `${title}\n${separator}\n[النص العربي الأصلي]\n\n${arText}\n\n${separator}\n[الترجمة الأدبية والفلسفية - ${langName}]\n\n${translatedText}\n\n${separator}\nمنصة النخبة لتوليد النصوص الفلسفية والسردية`;
    const element = document.createElement("a");
    const file = new Blob([fullDoc], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${title.replace(/[\s/]/g, '_')}_مزدوج_${langName}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const filteredHistory = history.filter(item => 
    item.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.translations?.fr && item.translations.fr.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.translations?.en && item.translations.en.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#fcfbf9] text-slate-800 font-sans selection:bg-amber-500/20">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-100/30 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-stone-200/40 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6 border-b border-stone-200/60 pb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-600 rounded-2xl flex items-center justify-center shadow-[0_8px_20px_rgba(217,119,6,0.25)] text-white">
              <Feather className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-display font-black tracking-tight text-slate-900">
                  منصة <span className="text-amber-700">النخبة</span> لتوليد النصوص
                </h1>
                <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2.5 py-1 rounded-full border border-amber-200 shadow-sm flex items-center gap-1">
                  ✨ فكر فلسفي وإنساني نخبوي
                </span>
              </div>
              <p className="text-slate-500 text-xs font-medium">
                تأليف النصوص الفلسفية والسردية الراقية والتحليل النفسي والإنساني العميق
              </p>
            </div>
          </div>

          <nav className="flex p-1.5 bg-white/80 rounded-2xl border border-stone-200 backdrop-blur-md shadow-sm">
            <button 
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'create' 
                  ? 'bg-amber-700 text-white shadow-md' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Feather className="w-4 h-4" />
              <span>تأليف نص جديد</span>
            </button>
            <button 
              onClick={() => setActiveTab('library')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'library' 
                  ? 'bg-amber-700 text-white shadow-md' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4" />
              <span>أرشيف النصوص ({history.length})</span>
            </button>
          </nav>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'create' ? (
            <motion.div 
              key="create"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Controls Column */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white border border-stone-200/80 rounded-3xl p-7 shadow-sm space-y-6">
                  <div>
                    <label className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>عنوان أو موضوع النص الفكري</span>
                    </label>
                    <textarea 
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="أدخل الفكرة أو العنوان الرئيسي (مثلاً: أزمة المعنى في العصر الرقمي، مجتمع المراقبة، الوعي بالزمن النفسي...)"
                      className="w-full h-32 bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all resize-none text-slate-800 placeholder:text-slate-400 leading-relaxed"
                    />
                  </div>

                  {/* Writing Archetype */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 block">
                      نمط الصياغة والأسلوب
                    </label>
                    <div className="grid grid-cols-1 gap-2.5">
                      {TEXT_STYLES.map((style) => (
                        <div
                          key={style.id}
                          onClick={() => setSelectedStyle(style)}
                          className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer flex flex-col gap-1 ${
                            selectedStyle.id === style.id 
                              ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-300/50 shadow-sm' 
                              : 'bg-white border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold ${selectedStyle.id === style.id ? 'text-amber-800' : 'text-slate-900'}`}>
                              {style.name}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-100 text-slate-500 font-medium">
                              {style.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-tight">
                            {style.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Length Target */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                      حجم النص المستهدف
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {LENGTH_OPTIONS.map((len) => (
                        <button
                          key={len.id}
                          type="button"
                          onClick={() => setSelectedLength(len)}
                          className={`py-2.5 px-3.5 rounded-xl border text-xs font-bold text-right transition-all ${
                            selectedLength.id === len.id 
                              ? 'bg-stone-900 text-white border-stone-900 shadow-sm' 
                              : 'bg-stone-50 border-stone-200 text-slate-700 hover:bg-stone-100'
                          }`}
                        >
                          {len.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional Notes */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                      توجيهات خاصة أو تركيز إضافي (اختياري)
                    </label>
                    <input 
                      type="text"
                      value={customNotes}
                      onChange={(e) => setCustomNotes(e.target.value)}
                      placeholder="مثلاً: التركيز على فلسفة شوبنهاور وجاك لاكان..."
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all text-slate-800 placeholder:text-slate-400"
                    />
                  </div>

                  {/* Voice Selection Panel */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 block flex items-center justify-between">
                      <span>اختر صوت القارئ والمُلقي</span>
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">ذكاء اصطناعي فائق الجودة</span>
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {VOICE_OPTIONS.map((voice) => (
                        <div
                          key={voice.id}
                          onClick={() => setSelectedVoice(voice)}
                          className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            selectedVoice.id === voice.id 
                              ? 'bg-amber-700 text-white border-amber-700 shadow-md' 
                              : 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">{voice.avatar}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold block">{voice.name}</span>
                              </div>
                              <span className={`text-[10px] block line-clamp-1 ${selectedVoice.id === voice.id ? 'text-amber-100' : 'text-slate-500'}`}>
                                {voice.description}
                              </span>
                            </div>
                          </div>
                          <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold whitespace-nowrap shrink-0 ${
                            selectedVoice.id === voice.id ? 'bg-amber-800 text-amber-100' : 'bg-stone-200 text-slate-600'
                          }`}>
                            {voice.badge}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Diacritics / Tashkeel Toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-amber-50/50 border border-amber-200/60 rounded-2xl">
                    <div className="flex items-center gap-2.5">
                      <Type className="w-4 h-4 text-amber-700" />
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">التشكيل الكامل للنص</span>
                        <span className="text-[10px] text-slate-500 block">إضافة الحركات والسكون لسهولة القراءة والإلقاء الصوتي</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEnableTashkeel(!enableTashkeel)}
                      className={`w-11 h-6 rounded-full transition-all relative p-0.5 ${enableTashkeel ? 'bg-amber-700' : 'bg-stone-300'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-all shadow-sm ${enableTashkeel ? 'translate-x-[-20px] rtl:translate-x-[-20px] ltr:translate-x-[20px]' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <button 
                    onClick={handleGenerate}
                    disabled={isGenerating || !topic.trim()}
                    className="w-full py-4 bg-amber-700 hover:bg-amber-800 disabled:bg-stone-100 disabled:text-stone-400 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-700/20 active:scale-[0.99] text-sm"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري صياغة النص الفكري...</span>
                      </>
                    ) : (
                      <>
                        <span>تأليف النص الآن</span>
                        <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                      </>
                    )}
                  </button>
                </div>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-600 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}
              </div>

              {/* Output Preview Column */}
              <div className="lg:col-span-7">
                <div className="h-full min-h-[620px] bg-white border border-stone-200/80 rounded-3xl p-8 flex flex-col justify-between relative shadow-sm overflow-hidden">
                  <AnimatePresence mode="wait">
                    {!isGenerating && !generatedContent && (
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="my-auto text-center space-y-5 max-w-sm mx-auto"
                      >
                        <div className="w-20 h-20 bg-amber-50 border border-amber-100 rounded-3xl flex items-center justify-center mx-auto text-amber-700 shadow-inner">
                          <BookOpen className="w-9 h-9" />
                        </div>
                        <div>
                          <h3 className="text-xl font-display font-bold text-slate-900 mb-2">استوديو التأليف الفكري</h3>
                          <p className="text-slate-500 text-xs leading-relaxed">
                            أدخل موضوعك واختر الأسلوب الفلسفي أو الأدبي المطلوب لتأليف نص نخبوي متناسق، مستوحى من أمهات الكتب والأعلام الخالدين.
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {isGenerating && (
                      <motion.div 
                        key="loading"
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="my-auto text-center space-y-6"
                      >
                        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                          <div className="absolute inset-0 border-4 border-amber-100 border-t-amber-600 rounded-full animate-spin" />
                          <Feather className="w-8 h-8 text-amber-700 animate-pulse" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xl font-display font-bold text-slate-900">جاري التأليف والحبك الأدبي...</h3>
                          <p className="text-slate-500 text-xs italic">
                            استحضار الرؤى الفلسفية، النقدية، والأدبية لبناء مقال نخبوي عميق...
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {!isGenerating && generatedContent && (
                      <motion.div 
                        key="result"
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        className="w-full flex flex-col h-full"
                      >
                        {/* Header toolbar */}
                        <div className="flex flex-wrap justify-between items-center gap-4 pb-6 mb-6 border-b border-stone-100">
                          <div>
                            <h3 className="text-2xl font-display font-bold text-slate-900">{currentTopicTitle}</h3>
                            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400 font-medium">
                              <span className="flex items-center gap-1 text-amber-700 font-bold">
                                <BookMarked className="w-3.5 h-3.5" />
                                {selectedStyle.name}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                قراءة ~{Math.ceil(generatedContent.split(/\s+/).length / 200)} دقائق
                              </span>
                              <span>•</span>
                              <span>{generatedContent.split(/\s+/).length} كلمة</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={handleGenerateAudio}
                              disabled={isGeneratingAudio}
                              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                              title={`توليد مقطع صوتي نقي واستماع فوري بصوت ${selectedVoice.name}`}
                            >
                              {isGeneratingAudio ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>{audioProgressText || "جاري هندسة وإلقاء الصوت..."}</span>
                                </>
                              ) : (
                                <>
                                  <Mic className="w-4 h-4" />
                                  <span>توليد التسجيل بصوت {selectedVoice.name}</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={handleSpeakToggle}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                                isSpeaking 
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse' 
                                  : 'bg-stone-100 hover:bg-stone-200 text-slate-800'
                              }`}
                              title="قراءة فورية متصفح"
                            >
                              {isSpeaking ? (
                                <>
                                  <VolumeX className="w-4 h-4 text-amber-800" />
                                  <span>إيقاف القراءة</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-4 h-4 text-amber-700" />
                                  <span>قراءة المتصفح</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={handleApplyDiacritics}
                              disabled={isDiacritizing}
                              className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-slate-800 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                              title="إعادة تشكيل أو توثيق الحركات والسكون"
                            >
                              {isDiacritizing ? (
                                <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
                              ) : (
                                <Type className="w-4 h-4 text-amber-700" />
                              )}
                              <span>التشكيل</span>
                            </button>

                            <button
                              onClick={() => {
                                if (currentLanguage === 'ar') {
                                  copyToClipboard(generatedContent);
                                } else if (currentLanguage === 'fr') {
                                  copyToClipboard(translations.fr || generatedContent);
                                } else if (currentLanguage === 'en') {
                                  copyToClipboard(translations.en || generatedContent);
                                } else if (currentLanguage === 'bilingual') {
                                  const trText = translations[bilingualTargetLang] || '';
                                  const combined = `[النص العربي الأصلي]\n${generatedContent}\n\n[الترجمة ${bilingualTargetLang === 'fr' ? 'الفرنسية' : 'الإنجليزية'}]\n${trText}`;
                                  copyToClipboard(combined);
                                }
                              }}
                              className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-slate-800 rounded-xl text-xs font-bold transition-all"
                              title="نسخ النص المعروض حالياً"
                            >
                              {isCopied ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  <span>تم النسخ</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4 text-amber-700" />
                                  <span>نسخ {currentLanguage === 'fr' ? '🇫🇷' : currentLanguage === 'en' ? '🇬🇧' : currentLanguage === 'bilingual' ? 'المزدوج' : ''}</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => {
                                if (currentLanguage === 'ar') {
                                  downloadTextFile(currentTopicTitle, generatedContent, 'عربي');
                                } else if (currentLanguage === 'fr') {
                                  if (translations.fr) downloadTextFile(currentTopicTitle, translations.fr, 'Français');
                                  else downloadTextFile(currentTopicTitle, generatedContent, 'عربي');
                                } else if (currentLanguage === 'en') {
                                  if (translations.en) downloadTextFile(currentTopicTitle, translations.en, 'English');
                                  else downloadTextFile(currentTopicTitle, generatedContent, 'عربي');
                                } else if (currentLanguage === 'bilingual') {
                                  downloadBilingualFile(
                                    currentTopicTitle,
                                    generatedContent,
                                    translations[bilingualTargetLang] || 'لم تتم الترجمة بعد',
                                    bilingualTargetLang === 'fr' ? 'الفرنسية' : 'الإنجليزية'
                                  );
                                }
                              }}
                              className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                              title="تنزيل كملف نصي للغة المعروضة"
                            >
                              <Download className="w-4 h-4" />
                              <span>TXT {currentLanguage === 'fr' ? '🇫🇷' : currentLanguage === 'en' ? '🇬🇧' : currentLanguage === 'bilingual' ? 'مزدوج' : ''}</span>
                            </button>
                          </div>
                        </div>

                        {/* Custom Interactive Audio Player with Seek / Speed / Navigation Controls */}
                        {audioBlobUrl && (
                          <div className="mb-6 p-5 bg-gradient-to-br from-amber-950 via-stone-900 to-black text-white rounded-3xl shadow-xl border border-amber-800/40 space-y-4 animate-fadeIn">
                            <audio
                              ref={audioRef}
                              src={audioBlobUrl}
                              onTimeUpdate={() => {
                                if (audioRef.current) setAudioCurrentTime(audioRef.current.currentTime);
                              }}
                              onLoadedMetadata={() => {
                                if (audioRef.current) setAudioDuration(audioRef.current.duration);
                              }}
                              onEnded={() => setIsPlayingAudio(false)}
                              className="hidden"
                            />

                            {/* Header Info */}
                            <div className="flex items-center justify-between gap-3 border-b border-amber-800/30 pb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-700/80 text-amber-100 rounded-xl flex items-center justify-center shrink-0 shadow-inner">
                                  <Radio className={`w-5 h-5 ${isPlayingAudio ? 'animate-pulse text-amber-300' : ''}`} />
                                </div>
                                <div>
                                  <span className="text-xs font-bold text-amber-100 block">
                                    مشغل الصوت الإيماني • بصوت {selectedVoice.name}
                                  </span>
                                  <span className="text-[10px] text-amber-300/80 font-medium block">
                                    تلاوات وإلقاء فصيح عالي الجودة والدقة
                                  </span>
                                </div>
                              </div>

                              <a
                                href={audioBlobUrl}
                                download={`${currentTopicTitle.replace(/[\s/]/g, '_')}_${selectedVoice.id}.wav`}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-800/60 hover:bg-amber-700 text-amber-100 rounded-xl text-xs font-bold transition-all border border-amber-600/40"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>تنزيل (WAV)</span>
                              </a>
                            </div>

                            {/* Progress Scrubber Slider Bar */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-mono text-amber-200/90 dir-ltr">
                                <span>{formatAudioTime(audioCurrentTime)}</span>
                                <input
                                  type="range"
                                  min={0}
                                  max={audioDuration || 100}
                                  step={0.1}
                                  value={audioCurrentTime}
                                  onChange={handleSeekChange}
                                  className="w-full mx-3 h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400"
                                />
                                <span>{formatAudioTime(audioDuration)}</span>
                              </div>
                            </div>

                            {/* Main Navigation Controls Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                              {/* Skip -10s, Play/Pause, Skip +10s */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleSkipTime(-10)}
                                  className="p-2.5 bg-stone-800/90 hover:bg-stone-700 text-amber-200 rounded-xl transition-all border border-stone-700/50 flex items-center gap-1 text-xs font-bold active:scale-95"
                                  title="إرجاع 10 ثوانٍ"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                  <span className="text-[10px]">10- ث</span>
                                </button>

                                <button
                                  onClick={handleTogglePlay}
                                  className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-2xl transition-all shadow-lg shadow-amber-950/50 active:scale-95 flex items-center gap-2 font-bold text-xs"
                                  title={isPlayingAudio ? 'إيقاف مؤقت' : 'تشغيل الصوت'}
                                >
                                  {isPlayingAudio ? (
                                    <>
                                      <Pause className="w-4 h-4" />
                                      <span>إيقاف مؤقت</span>
                                    </>
                                  ) : (
                                    <>
                                      <Play className="w-4 h-4" />
                                      <span>تشغيل الصوت</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  onClick={() => handleSkipTime(10)}
                                  className="p-2.5 bg-stone-800/90 hover:bg-stone-700 text-amber-200 rounded-xl transition-all border border-stone-700/50 flex items-center gap-1 text-xs font-bold active:scale-95"
                                  title="تقديم 10 ثوانٍ"
                                >
                                  <span className="text-[10px]">10+ ث</span>
                                  <RotateCw className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Playback Speed Controls */}
                              <div className="flex items-center gap-1 bg-stone-800/90 p-1 rounded-xl border border-stone-700/50 text-[11px] font-bold">
                                <span className="text-[10px] text-amber-400/80 px-1.5 hidden sm:inline">السرعة:</span>
                                {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                                  <button
                                    key={spd}
                                    onClick={() => handleSpeedChange(spd)}
                                    className={`px-2 py-1 rounded-lg transition-all ${
                                      playbackSpeed === spd 
                                        ? 'bg-amber-600 text-white shadow-sm' 
                                        : 'text-amber-200/70 hover:text-white'
                                    }`}
                                  >
                                    {spd}x
                                  </button>
                                ))}
                              </div>

                              {/* Volume Slider */}
                              <div className="flex items-center gap-2 bg-stone-800/90 px-3 py-1.5 rounded-xl border border-stone-700/50 text-amber-200">
                                <button
                                  onClick={() => handleVolumeChange({ target: { value: audioVolume > 0 ? "0" : "1" } } as any)}
                                  className="text-amber-300 hover:text-white"
                                >
                                  {audioVolume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                </button>
                                <input
                                  type="range"
                                  min={0}
                                  max={1}
                                  step={0.05}
                                  value={audioVolume}
                                  onChange={handleVolumeChange}
                                  className="w-16 h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Continuous Unified Content Display & Multi-language System */}
                        {/* Language Selector & Translation Tabs */}
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-2 bg-stone-100/90 rounded-2xl border border-stone-200/80">
                          <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-xl shadow-xs border border-stone-200/60">
                            <button
                              onClick={() => setCurrentLanguage('ar')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                currentLanguage === 'ar'
                                  ? 'bg-amber-700 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-stone-50'
                              }`}
                            >
                              <span>🇸🇦</span>
                              <span>العربية (الأصل)</span>
                            </button>

                            <button
                              onClick={() => {
                                if (!translations.fr && !isTranslating) {
                                  handleTranslate('fr');
                                } else {
                                  setCurrentLanguage('fr');
                                }
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                currentLanguage === 'fr'
                                  ? 'bg-amber-700 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-stone-50'
                              }`}
                            >
                              <span>🇫🇷</span>
                              <span>الفرنسية (Français)</span>
                              {translations.fr ? (
                                <span className={`w-2 h-2 rounded-full ${currentLanguage === 'fr' ? 'bg-amber-200' : 'bg-emerald-500'}`} title="تمت الترجمة" />
                              ) : isTranslating === 'fr' ? (
                                <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                              ) : (
                                <span className="text-[9px] bg-stone-100 text-slate-500 px-1 rounded">+</span>
                              )}
                            </button>

                            <button
                              onClick={() => {
                                if (!translations.en && !isTranslating) {
                                  handleTranslate('en');
                                } else {
                                  setCurrentLanguage('en');
                                }
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                currentLanguage === 'en'
                                  ? 'bg-amber-700 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-stone-50'
                              }`}
                            >
                              <span>🇬🇧</span>
                              <span>الإنجليزية (English)</span>
                              {translations.en ? (
                                <span className={`w-2 h-2 rounded-full ${currentLanguage === 'en' ? 'bg-amber-200' : 'bg-emerald-500'}`} title="تمت الترجمة" />
                              ) : isTranslating === 'en' ? (
                                <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                              ) : (
                                <span className="text-[9px] bg-stone-100 text-slate-500 px-1 rounded">+</span>
                              )}
                            </button>

                            <button
                              onClick={() => setCurrentLanguage('bilingual')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                currentLanguage === 'bilingual'
                                  ? 'bg-amber-700 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-stone-50'
                              }`}
                              title="عرض مقارن جنباً إلى جنب"
                            >
                              <Languages className="w-3.5 h-3.5" />
                              <span>عرض مقارن ثنائي</span>
                            </button>
                          </div>

                          {/* Quick translation buttons if not translated yet */}
                          <div className="flex items-center gap-2">
                            {!translations.fr && (
                              <button
                                onClick={() => handleTranslate('fr')}
                                disabled={!!isTranslating}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 rounded-xl text-xs font-bold border border-stone-200 shadow-xs transition-all active:scale-95 disabled:opacity-50"
                              >
                                {isTranslating === 'fr' ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
                                ) : (
                                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                                )}
                                <span>ترجمة للفرنسية 🇫🇷</span>
                              </button>
                            )}

                            {!translations.en && (
                              <button
                                onClick={() => handleTranslate('en')}
                                disabled={!!isTranslating}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 rounded-xl text-xs font-bold border border-stone-200 shadow-xs transition-all active:scale-95 disabled:opacity-50"
                              >
                                {isTranslating === 'en' ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
                                ) : (
                                  <Globe className="w-3.5 h-3.5 text-rose-600" />
                                )}
                                <span>ترجمة للإنجليزية 🇬🇧</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Main Text Content Area according to selected language */}
                        <div className="flex-1 overflow-y-auto pr-1 max-h-[520px]">
                          {/* Arabic View */}
                          {currentLanguage === 'ar' && (
                            <div className="leading-[2.4] text-slate-800 text-lg font-medium whitespace-pre-wrap bg-stone-50/60 p-6 rounded-2xl border border-stone-200/60 selection:bg-amber-500/20 shadow-inner">
                              {generatedContent}
                            </div>
                          )}

                          {/* French View */}
                          {currentLanguage === 'fr' && (
                            <div>
                              {isTranslating === 'fr' ? (
                                <div className="py-20 text-center space-y-4 bg-stone-50/70 rounded-2xl border border-stone-200/80">
                                  <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
                                    <div className="absolute inset-0 border-4 border-amber-200 border-t-amber-700 rounded-full animate-spin" />
                                    <Globe className="w-6 h-6 text-amber-700 animate-pulse" />
                                  </div>
                                  <div>
                                    <h4 className="text-base font-bold text-slate-900 mb-1">جاري الترجمة الأدبية والفلسفية إلى الفرنسية...</h4>
                                    <p className="text-xs text-slate-500 font-sans italic">Traduction littéraire et philosophique en cours...</p>
                                  </div>
                                </div>
                              ) : translations.fr ? (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between px-1 text-xs text-slate-500">
                                    <span className="font-semibold text-amber-800 flex items-center gap-1">
                                      <span>🇫🇷</span>
                                      <span>Version Française (Littéraire et Philosophique)</span>
                                    </span>
                                    <button
                                      onClick={() => handleTranslate('fr')}
                                      className="text-[11px] text-slate-500 hover:text-amber-800 underline transition-colors"
                                    >
                                      إعادة الترجمة
                                    </button>
                                  </div>
                                  <div 
                                    dir="ltr" 
                                    className="leading-[2] text-slate-800 text-base font-normal font-serif whitespace-pre-wrap bg-stone-50/60 p-6 rounded-2xl border border-stone-200/60 selection:bg-amber-500/20 shadow-inner"
                                  >
                                    {translations.fr}
                                  </div>
                                </div>
                              ) : (
                                <div className="py-16 text-center space-y-4 bg-stone-50/50 rounded-2xl border border-dashed border-stone-300">
                                  <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-700">
                                    <Globe className="w-7 h-7" />
                                  </div>
                                  <div>
                                    <h4 className="text-base font-bold text-slate-900 mb-1">لم تتم ترجمة هذا النص للفرنسية بعد</h4>
                                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                                      انقر على الزر أدناه لتوليد ترجمة أدبية وفلسفية رفيعة المستوى متوافقة مع الأسلوب والمصطلحات الفكرية.
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleTranslate('fr')}
                                    className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 inline-flex items-center gap-2"
                                  >
                                    <Sparkles className="w-4 h-4" />
                                    <span>بدء الترجمة إلى الفرنسية (Traduire en Français)</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* English View */}
                          {currentLanguage === 'en' && (
                            <div>
                              {isTranslating === 'en' ? (
                                <div className="py-20 text-center space-y-4 bg-stone-50/70 rounded-2xl border border-stone-200/80">
                                  <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
                                    <div className="absolute inset-0 border-4 border-amber-200 border-t-amber-700 rounded-full animate-spin" />
                                    <Globe className="w-6 h-6 text-amber-700 animate-pulse" />
                                  </div>
                                  <div>
                                    <h4 className="text-base font-bold text-slate-900 mb-1">جاري الترجمة الأدبية والفلسفية إلى الإنجليزية...</h4>
                                    <p className="text-xs text-slate-500 font-sans italic">Literary and philosophical translation in progress...</p>
                                  </div>
                                </div>
                              ) : translations.en ? (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between px-1 text-xs text-slate-500">
                                    <span className="font-semibold text-amber-800 flex items-center gap-1">
                                      <span>🇬🇧</span>
                                      <span>English Version (Literary & Philosophical)</span>
                                    </span>
                                    <button
                                      onClick={() => handleTranslate('en')}
                                      className="text-[11px] text-slate-500 hover:text-amber-800 underline transition-colors"
                                    >
                                      إعادة الترجمة
                                    </button>
                                  </div>
                                  <div 
                                    dir="ltr" 
                                    className="leading-[2] text-slate-800 text-base font-normal font-serif whitespace-pre-wrap bg-stone-50/60 p-6 rounded-2xl border border-stone-200/60 selection:bg-amber-500/20 shadow-inner"
                                  >
                                    {translations.en}
                                  </div>
                                </div>
                              ) : (
                                <div className="py-16 text-center space-y-4 bg-stone-50/50 rounded-2xl border border-dashed border-stone-300">
                                  <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-700">
                                    <Globe className="w-7 h-7" />
                                  </div>
                                  <div>
                                    <h4 className="text-base font-bold text-slate-900 mb-1">لم تتم ترجمة هذا النص للإنجليزية بعد</h4>
                                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                                      انقر على الزر أدناه لتوليد ترجمة أدبية وفلسفية رفيعة المستوى متوافقة مع الأسلوب والمصطلحات الفكرية.
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleTranslate('en')}
                                    className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 inline-flex items-center gap-2"
                                  >
                                    <Sparkles className="w-4 h-4" />
                                    <span>بدء الترجمة إلى الإنجليزية (Translate to English)</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Bilingual Comparative View */}
                          {currentLanguage === 'bilingual' && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between p-2 bg-stone-100/70 rounded-xl border border-stone-200/60 text-xs">
                                <span className="font-bold text-slate-700">اختر لغة المقارنة:</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setBilingualTargetLang('fr')}
                                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                                      bilingualTargetLang === 'fr'
                                        ? 'bg-amber-700 text-white shadow-xs'
                                        : 'bg-white text-slate-700 hover:bg-stone-50'
                                    }`}
                                  >
                                    🇫🇷 الفرنسية (Français)
                                  </button>
                                  <button
                                    onClick={() => setBilingualTargetLang('en')}
                                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                                      bilingualTargetLang === 'en'
                                        ? 'bg-amber-700 text-white shadow-xs'
                                        : 'bg-white text-slate-700 hover:bg-stone-50'
                                    }`}
                                  >
                                    🇬🇧 الإنجليزية (English)
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Arabic Column */}
                                <div className="bg-stone-50/70 p-5 rounded-2xl border border-stone-200/70 space-y-2">
                                  <div className="flex items-center justify-between pb-2 border-b border-stone-200/60 text-xs font-bold text-amber-800">
                                    <span className="flex items-center gap-1">
                                      <span>🇸🇦</span>
                                      <span>النص العربي الأصلي</span>
                                    </span>
                                  </div>
                                  <div className="leading-[2.2] text-slate-800 text-sm whitespace-pre-wrap max-h-[420px] overflow-y-auto pr-1 font-medium">
                                    {generatedContent}
                                  </div>
                                </div>

                                {/* Translated Column */}
                                <div className="bg-stone-50/70 p-5 rounded-2xl border border-stone-200/70 space-y-2" dir="ltr">
                                  <div className="flex items-center justify-between pb-2 border-b border-stone-200/60 text-xs font-bold text-amber-800" dir="rtl">
                                    <span className="flex items-center gap-1">
                                      <span>{bilingualTargetLang === 'fr' ? '🇫🇷' : '🇬🇧'}</span>
                                      <span>{bilingualTargetLang === 'fr' ? 'الترجمة الفرنسية (Traduction)' : 'الترجمة الإنجليزية (Translation)'}</span>
                                    </span>
                                    {translations[bilingualTargetLang] && (
                                      <button
                                        onClick={() => downloadBilingualFile(
                                          currentTopicTitle, 
                                          generatedContent, 
                                          translations[bilingualTargetLang]!, 
                                          bilingualTargetLang === 'fr' ? 'الفرنسية' : 'الإنجليزية'
                                        )}
                                        className="text-[11px] text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1"
                                      >
                                        <Download className="w-3 h-3" />
                                        <span>تنزيل الملف المزدوج</span>
                                      </button>
                                    )}
                                  </div>

                                  {isTranslating === bilingualTargetLang ? (
                                    <div className="py-16 text-center space-y-3">
                                      <Loader2 className="w-6 h-6 animate-spin text-amber-700 mx-auto" />
                                      <p className="text-xs text-slate-500">جاري الترجمة الأدبية...</p>
                                    </div>
                                  ) : translations[bilingualTargetLang] ? (
                                    <div className="leading-[1.9] text-slate-800 text-sm font-serif whitespace-pre-wrap max-h-[420px] overflow-y-auto pl-1">
                                      {translations[bilingualTargetLang]}
                                    </div>
                                  ) : (
                                    <div className="py-16 text-center space-y-3">
                                      <p className="text-xs text-slate-500">
                                        لم يتم توليد الترجمة {bilingualTargetLang === 'fr' ? 'الفرنسية' : 'الإنجليزية'} بعد.
                                      </p>
                                      <button
                                        onClick={() => handleTranslate(bilingualTargetLang)}
                                        className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                                      >
                                        ترجمة الآن ({bilingualTargetLang === 'fr' ? 'Français' : 'English'})
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Library / History Tab */
            <motion.div 
              key="library"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute top-3.5 right-3.5 text-slate-400" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث في الأرشيف والنصوص والترجمات..."
                    className="w-full pr-10 pl-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-slate-800 placeholder:text-slate-400"
                  />
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  إجمالي النصوص المحفوظة: <span className="font-bold text-amber-700">{filteredHistory.length}</span>
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <div className="py-24 text-center space-y-4 border-2 border-dashed border-stone-200 rounded-3xl bg-white/50">
                  <BookOpen className="w-12 h-12 text-stone-300 mx-auto" />
                  <p className="text-slate-500 text-sm font-medium">لا توجد نصوص محفوظة في الأرشيف طابق بحثك.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredHistory.map((item) => (
                    <motion.div 
                      key={item.id}
                      layout
                      className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-3 mb-3">
                          <h4 className="font-display font-bold text-lg text-slate-900 leading-snug">{item.topic}</h4>
                          <button 
                            onClick={() => deleteEntry(item.id)}
                            className="text-stone-300 hover:text-red-500 p-1 transition-colors"
                            title="حذف من الأرشيف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mb-4 text-[10px] text-amber-700 font-bold">
                          <span className="bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/60">
                            {item.styleName}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-400 font-mono">
                            {new Date(item.timestamp).toLocaleDateString('ar-EG')}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-400">{item.wordCount} كلمة</span>
                          
                          {/* Translation Badges */}
                          {item.translations?.fr && (
                            <span className="bg-blue-50 text-blue-800 border border-blue-200/70 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                              <span>🇫🇷</span>
                              <span>FR</span>
                            </span>
                          )}
                          {item.translations?.en && (
                            <span className="bg-rose-50 text-rose-800 border border-rose-200/70 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                              <span>🇬🇧</span>
                              <span>EN</span>
                            </span>
                          )}
                        </div>

                        <p className="text-xs leading-relaxed text-slate-600 bg-stone-50 p-4 rounded-xl line-clamp-4 mb-4 border border-stone-100 font-medium">
                          {item.content}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-stone-100">
                        <button
                          onClick={() => handleLoadHistoryItem(item)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold transition-all border border-amber-200/60"
                          title="فتح النص في استوديو التحرير والترجمة"
                        >
                          <Feather className="w-3.5 h-3.5" />
                          <span>فتح في الاستوديو</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => copyToClipboard(item.content)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
                            title="نسخ النص العربي"
                          >
                            <Copy className="w-3.5 h-3.5 text-amber-700" />
                            <span>نسخ</span>
                          </button>
                          <button
                            onClick={() => downloadTextFile(item.topic, item.content)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-stone-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                            title="تنزيل كملف نصي"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>تنزيل</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-stone-200/60 py-8 text-center bg-white/60 backdrop-blur-sm mt-16">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">
          منصة النخبة لتوليد النصوص الفلسفية والسردية &copy; 2026
        </p>
      </footer>
    </div>
  );
}
