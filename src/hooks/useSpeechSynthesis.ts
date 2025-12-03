import { useState, useEffect, useCallback, useRef } from 'react';

export interface VoiceOption {
  voice: SpeechSynthesisVoice;
  name: string;
  lang: string;
  gender: 'male' | 'female' | 'unknown';
}

interface UseSpeechSynthesisReturn {
  speak: (text: string) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  error: string | null;
  voices: VoiceOption[];
  selectedVoice: VoiceOption | null;
  setSelectedVoice: (voice: VoiceOption) => void;
  rate: number;
  setRate: (rate: number) => void;
  pitch: number;
  setPitch: (pitch: number) => void;
}

// Detect gender from voice name (heuristic)
const detectGender = (voice: SpeechSynthesisVoice): 'male' | 'female' | 'unknown' => {
  const name = voice.name.toLowerCase();
  const femaleIndicators = ['female', 'woman', 'girl', 'zira', 'hazel', 'susan', 'karen', 'samantha', 'victoria', 'fiona', 'moira', 'tessa', 'veena', 'alice', 'ellen', 'monica', 'paulina', 'helena', 'laura', 'nora', 'sara', 'anna', 'marie', 'kate', 'ava', 'allison', 'lisa', 'amelie', 'milena', 'luciana', 'joana', 'ioana', 'catarina', 'kanya', 'kyoko', 'yuna', 'lekha', 'meijia', 'sinji', 'tingting', 'mei-jia', 'sin-ji', 'ting-ting', 'damayanti', 'leilani', 'zosia'];
  const maleIndicators = ['male', 'man', 'boy', 'david', 'mark', 'james', 'daniel', 'tom', 'alex', 'jorge', 'juan', 'diego', 'felipe', 'carlos', 'rishi', 'thomas', 'fred', 'ralph', 'junior', 'luca', 'oliver', 'xander', 'aaron', 'albert', 'gordon', 'jacques', 'eddy', 'nathan'];
  
  if (femaleIndicators.some(indicator => name.includes(indicator))) {
    return 'female';
  }
  if (maleIndicators.some(indicator => name.includes(indicator))) {
    return 'male';
  }
  return 'unknown';
};

export const useSpeechSynthesis = (): UseSpeechSynthesisReturn => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption | null>(null);
  const [rate, setRate] = useState(0.9);
  const [pitch, setPitch] = useState(1);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const supported = 'speechSynthesis' in window;
    setIsSupported(supported);

    if (supported) {
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        const voiceOptions: VoiceOption[] = availableVoices.map(voice => ({
          voice,
          name: voice.name,
          lang: voice.lang,
          gender: detectGender(voice),
        }));
        
        // Sort by language relevance and gender
        const sortedVoices = voiceOptions.sort((a, b) => {
          // Prioritize English voices for better quality
          const aIsEnglish = a.lang.startsWith('en');
          const bIsEnglish = b.lang.startsWith('en');
          if (aIsEnglish && !bIsEnglish) return -1;
          if (!aIsEnglish && bIsEnglish) return 1;
          return a.name.localeCompare(b.name);
        });

        setVoices(sortedVoices);
        
        // Set default voice
        if (sortedVoices.length > 0 && !selectedVoice) {
          const defaultVoice = sortedVoices.find(v => v.gender === 'female' && v.lang.startsWith('en')) 
            || sortedVoices.find(v => v.lang.startsWith('en'))
            || sortedVoices[0];
          setSelectedVoice(defaultVoice);
        }
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!isSupported) {
      setError('Speech synthesis is not supported in this browser');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    setError(null);

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Configure voice settings
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 1;

    if (selectedVoice) {
      utterance.voice = selectedVoice.voice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = (event) => {
      setError(`Speech error: ${event.error}`);
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onpause = () => {
      setIsPaused(true);
    };

    utterance.onresume = () => {
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  }, [isSupported, selectedVoice, rate, pitch]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }, [isSupported]);

  const pause = useCallback(() => {
    if (isSupported && isSpeaking) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isSupported, isSpeaking]);

  const resume = useCallback(() => {
    if (isSupported && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [isSupported, isPaused]);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isPaused,
    isSupported,
    error,
    voices,
    selectedVoice,
    setSelectedVoice,
    rate,
    setRate,
    pitch,
    setPitch,
  };
};
