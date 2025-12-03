import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { AudioWaveform } from "./AudioWaveform";
import { VoiceSelector } from "./VoiceSelector";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { Play, Pause, Square, Volume2, Sparkles, Settings2, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const SAMPLE_TEXTS = [
  "Akkam jirta? Nagaatti.",
  "Oromiyaan biyya keenya.",
  "Afaan Oromoo afaan guddaa fi bareedaa dha.",
  "Galata qabda.",
  "Maqaan koo Oromoo dha.",
  "Ani Afaan Oromoo nan jaalladha.",
  "Baga nagaan dhufte.",
  "Guyyaan kee gaarii haa ta'u.",
];

export const TextToSpeechConverter = () => {
  const [text, setText] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { 
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
  } = useSpeechSynthesis();
  const { toast } = useToast();

  const handleSpeak = () => {
    if (!text.trim()) {
      toast({
        title: "Barreeffama galchi",
        description: "Maaloo barreeffama dubbisuu barbaaddu galchi.",
        variant: "destructive",
      });
      return;
    }
    speak(text);
  };

  const handleTogglePlayPause = () => {
    if (isPaused) {
      resume();
    } else if (isSpeaking) {
      pause();
    } else {
      handleSpeak();
    }
  };

  const handleSampleText = () => {
    const randomIndex = Math.floor(Math.random() * SAMPLE_TEXTS.length);
    setText(SAMPLE_TEXTS[randomIndex]);
  };

  if (!isSupported) {
    return (
      <Card className="p-8 text-center bg-card border-border">
        <Volume2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Browser Not Supported
        </h3>
        <p className="text-muted-foreground">
          Your browser doesn't support speech synthesis. Please try Chrome, Firefox, or Safari.
        </p>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
          Afaan Oromoo
        </h1>
        <p className="text-lg text-muted-foreground">
          Barreeffama gara sagaleetti jijjiiri
        </p>
        <p className="text-sm text-muted-foreground">
          Text to Voice Converter
        </p>
      </div>

      {/* Main Card */}
      <Card className="p-6 md:p-8 bg-card border-border shadow-soft">
        <div className="space-y-6">
          {/* Text Input */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                Barreeffama galchi (Enter your text)
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSampleText}
                className="text-muted-foreground hover:text-foreground"
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Fakkeenya (Sample)
              </Button>
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Barreeffama Afaan Oromoo asitti barreessi..."
              className="min-h-[140px] resize-none bg-background border-input text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <p className="text-xs text-muted-foreground text-right">
              {text.length} characters
            </p>
          </div>

          {/* Voice Settings Collapsible */}
          <Collapsible open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  Qindaa'ina sagalee (Voice Settings)
                  {selectedVoice && (
                    <span className="text-xs text-muted-foreground">
                      - {selectedVoice.gender === 'female' ? 'Dubartii' : 'Dhiira'}
                    </span>
                  )}
                </span>
                {isSettingsOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <VoiceSelector
                  voices={voices}
                  selectedVoice={selectedVoice}
                  onVoiceChange={setSelectedVoice}
                  rate={rate}
                  onRateChange={setRate}
                  pitch={pitch}
                  onPitchChange={setPitch}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Audio Visualization */}
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-4">
              <AudioWaveform isActive={isSpeaking && !isPaused} />
              {isSpeaking && (
                <span className="text-sm text-primary font-medium animate-pulse-slow">
                  {isPaused ? "Dhaabbate (Paused)" : "Dubbisaa jira... (Speaking)"}
                </span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="icon"
              size="icon-xl"
              onClick={handleTogglePlayPause}
              disabled={!text.trim() && !isSpeaking}
              className="transition-transform hover:scale-105"
            >
              {isSpeaking && !isPaused ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-1" />
              )}
            </Button>
            
            {isSpeaking && (
              <Button
                variant="outline"
                size="icon-lg"
                onClick={stop}
                className="transition-transform hover:scale-105"
              >
                <Square className="w-5 h-5" />
              </Button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <p className="text-sm text-destructive text-center animate-fade-in">
              {error}
            </p>
          )}
        </div>
      </Card>

      {/* Info Section */}
      <div className="text-center space-y-2 px-4">
        <p className="text-sm text-muted-foreground">
          🎯 <span className="font-medium">Tips:</span> Dubbisa sirrii ta'eef, 
          tuqaalee (aa, ee, ii, oo, uu) fi qubee lama (kk, ff, jj) sirritti barreessi.
        </p>
        <p className="text-xs text-muted-foreground">
          For accurate pronunciation, write long vowels and geminated consonants correctly.
        </p>
      </div>
    </div>
  );
};
