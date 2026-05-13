import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { AudioWaveform } from "./AudioWaveform";
import { VoiceSelector } from "./VoiceSelector";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import {
  Play, Pause, Square, Volume2, Sparkles, Settings2, ChevronDown, ChevronUp,
  Loader2, Download, Languages, Crown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { addHistory } from "@/lib/history";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

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

const PREMIUM_VOICES = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", gender: "female" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", gender: "female" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice", gender: "female" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", gender: "female" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", gender: "female" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", gender: "male" },
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", gender: "male" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", gender: "male" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", gender: "male" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", gender: "male" },
];

type Engine = "browser" | "premium";

export const TextToSpeechConverter = () => {
  const [text, setText] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [engine, setEngine] = useState<Engine>("browser");
  const [premiumVoice, setPremiumVoice] = useState(PREMIUM_VOICES[0].id);
  const [premiumSpeed, setPremiumSpeed] = useState(1);
  const [premiumStability, setPremiumStability] = useState(0.55);
  const [premiumBusy, setPremiumBusy] = useState(false);
  const [premiumPlaying, setPremiumPlaying] = useState(false);
  const [premiumAudioUrl, setPremiumAudioUrl] = useState<string | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const navigate = useNavigate();

  const {
    speak, stop, pause, resume,
    isSpeaking, isPaused, isSupported, error,
    voices, selectedVoice, setSelectedVoice,
    rate, setRate, pitch, setPitch,
  } = useSpeechSynthesis();
  const { toast } = useToast();

  const handleBrowserSpeak = () => {
    if (!text.trim()) {
      toast({ title: "Barreeffama galchi", description: "Maaloo barreeffama dubbisuu barbaaddu galchi.", variant: "destructive" });
      return;
    }
    speak(text);
    addHistory({ kind: "tts", text });
  };

  const handlePremiumSpeak = async () => {
    if (!text.trim()) return;
    setPremiumBusy(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("tts-elevenlabs", {
        body: { text, voiceId: premiumVoice, speed: premiumSpeed, stability: premiumStability },
      });
      if (fnErr) throw fnErr;
      const r = data as { audioContent?: string; mimeType?: string; error?: string };
      if (r.error) throw new Error(r.error);
      const url = `data:${r.mimeType ?? "audio/mpeg"};base64,${r.audioContent}`;
      setPremiumAudioUrl(url);
      const a = new Audio(url);
      audioElRef.current = a;
      a.onplay = () => setPremiumPlaying(true);
      a.onended = () => setPremiumPlaying(false);
      a.onpause = () => setPremiumPlaying(false);
      await a.play();
      addHistory({ kind: "tts", text });
    } catch (err: any) {
      toast({ title: "Premium TTS failed", description: err?.message ?? "", variant: "destructive" });
    } finally {
      setPremiumBusy(false);
    }
  };

  const handleTogglePlayPause = () => {
    if (engine === "premium") {
      if (premiumPlaying) audioElRef.current?.pause();
      else if (audioElRef.current && audioElRef.current.currentTime > 0) audioElRef.current.play();
      else handlePremiumSpeak();
      return;
    }
    if (isPaused) resume();
    else if (isSpeaking) pause();
    else handleBrowserSpeak();
  };

  const handleStop = () => {
    if (engine === "premium") {
      audioElRef.current?.pause();
      if (audioElRef.current) audioElRef.current.currentTime = 0;
      setPremiumPlaying(false);
    } else stop();
  };

  const downloadPremium = () => {
    if (!premiumAudioUrl) return;
    const a = document.createElement("a");
    a.href = premiumAudioUrl;
    a.download = `tts-${Date.now()}.mp3`;
    a.click();
  };

  const handleSampleText = () => {
    setText(SAMPLE_TEXTS[Math.floor(Math.random() * SAMPLE_TEXTS.length)]);
  };

  const goTranslate = () => {
    if (!text) return;
    sessionStorage.setItem("translate_input", text);
    navigate("/translate");
  };

  const isPlaying = engine === "premium" ? premiumPlaying : (isSpeaking && !isPaused);

  if (!isSupported && engine === "browser") {
    // still allow premium
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">Afaan Oromoo</h1>
        <p className="text-lg text-muted-foreground">Barreeffama gara sagaleetti jijjiiri</p>
        <p className="text-sm text-muted-foreground">Text to Voice Converter</p>
      </div>

      <Card className="p-6 md:p-8 bg-card border-border shadow-soft">
        <div className="space-y-6">
          <Tabs value={engine} onValueChange={(v) => setEngine(v as Engine)}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="browser">Browser</TabsTrigger>
              <TabsTrigger value="premium">
                <Crown className="w-3.5 h-3.5 mr-1.5" /> Premium AI
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Barreeffama galchi (Enter your text)</label>
              <Button variant="ghost" size="sm" onClick={handleSampleText} className="text-muted-foreground hover:text-foreground">
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
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={goTranslate} disabled={!text}>
                <Languages className="w-4 h-4 mr-1" /> Translate
              </Button>
              <p className="text-xs text-muted-foreground">{text.length} characters</p>
            </div>
          </div>

          <Collapsible open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  Qindaa'ina sagalee (Voice Settings)
                </span>
                {isSettingsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                {engine === "browser" ? (
                  <VoiceSelector
                    voices={voices}
                    selectedVoice={selectedVoice}
                    onVoiceChange={setSelectedVoice}
                    rate={rate}
                    onRateChange={setRate}
                    pitch={pitch}
                    onPitchChange={setPitch}
                  />
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Premium Voice</label>
                      <Select value={premiumVoice} onValueChange={setPremiumVoice}>
                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PREMIUM_VOICES.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.name} · {v.gender === "female" ? "Dubartii" : "Dhiira"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Speed</span><span className="text-muted-foreground">{premiumSpeed.toFixed(2)}x</span>
                      </div>
                      <Slider min={0.7} max={1.2} step={0.05} value={[premiumSpeed]} onValueChange={(v) => setPremiumSpeed(v[0])} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Stability</span><span className="text-muted-foreground">{premiumStability.toFixed(2)}</span>
                      </div>
                      <Slider min={0} max={1} step={0.05} value={[premiumStability]} onValueChange={(v) => setPremiumStability(v[0])} />
                    </div>
                  </>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-4">
              <AudioWaveform isActive={isPlaying} />
              {(isSpeaking || premiumPlaying || premiumBusy) && (
                <span className="text-sm text-primary font-medium animate-pulse-slow">
                  {premiumBusy ? "Generating..." : isPaused ? "Dhaabbate (Paused)" : "Dubbisaa jira... (Speaking)"}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Button
              variant="icon"
              size="icon-xl"
              onClick={handleTogglePlayPause}
              disabled={(!text.trim() && !isSpeaking && !premiumPlaying) || premiumBusy}
              className="transition-transform hover:scale-105"
            >
              {premiumBusy ? <Loader2 className="w-6 h-6 animate-spin" />
                : isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </Button>

            {(isSpeaking || premiumPlaying) && (
              <Button variant="outline" size="icon-lg" onClick={handleStop} className="transition-transform hover:scale-105">
                <Square className="w-5 h-5" />
              </Button>
            )}

            {engine === "premium" && premiumAudioUrl && !premiumBusy && (
              <Button variant="outline" size="icon-lg" onClick={downloadPremium} title="Download MP3">
                <Download className="w-5 h-5" />
              </Button>
            )}
          </div>

          {error && engine === "browser" && (
            <p className="text-sm text-destructive text-center animate-fade-in">{error}</p>
          )}
        </div>
      </Card>

      <div className="text-center space-y-2 px-4">
        <p className="text-sm text-muted-foreground">
          🎯 <span className="font-medium">Tips:</span> Dubbisa sirrii ta'eef, tuqaalee (aa, ee, ii, oo, uu) fi qubee lama (kk, ff, jj) sirritti barreessi.
        </p>
        <p className="text-xs text-muted-foreground">
          For accurate pronunciation, write long vowels and geminated consonants correctly.
        </p>
      </div>
    </div>
  );
};
