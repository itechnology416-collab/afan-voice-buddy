import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, Square, Upload, Loader2, Copy, Trash2, FileAudio, FileDown, FileText, FileType, Subtitles, Languages } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { addHistory } from "@/lib/history";
import { DIALECTS } from "@/lib/dialects";
import { cn } from "@/lib/utils";
import { exportTxt, exportDocx, exportPdf, exportSrt } from "@/lib/export";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

const ALLOWED = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave", "audio/mp4", "audio/x-m4a", "audio/m4a", "audio/webm", "audio/ogg"];

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function getAudioDuration(blob: Blob): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("audio");
    a.preload = "metadata";
    a.onloadedmetadata = () => {
      const d = isFinite(a.duration) ? a.duration : undefined;
      URL.revokeObjectURL(url);
      resolve(d);
    };
    a.onerror = () => { URL.revokeObjectURL(url); resolve(undefined); };
    a.src = url;
  });
}

const SpeechToText = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [text, setText] = useState("");
  const [dialect, setDialect] = useState("general");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [levels, setLevels] = useState<number[]>(Array(24).fill(4));
  const [dragOver, setDragOver] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef<string>("audio/webm");
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordStartRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      stopMeter();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startMeter = (stream: MediaStream) => {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    src.connect(analyser);
    analyserRef.current = analyser;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const bars: number[] = [];
      const step = Math.floor(data.length / 24) || 1;
      for (let i = 0; i < 24; i++) {
        const v = data[i * step] ?? 0;
        bars.push(Math.max(4, Math.min(48, (v / 255) * 48)));
      }
      setLevels(bars);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const stopMeter = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    setLevels(Array(24).fill(4));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mime = preferred.find((m) => MediaRecorder.isTypeSupported(m)) || "";
      mimeRef.current = mime || "audio/webm";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = rec;
      chunksRef.current = [];
      recordStartRef.current = Date.now();
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeRef.current });
        const recDuration = (Date.now() - recordStartRef.current) / 1000;
        const url = URL.createObjectURL(blob);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(url);
        const d = (await getAudioDuration(blob)) ?? recDuration;
        setDuration(d);
        await transcribeBlob(blob, d);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      rec.start();
      startMeter(stream);
      setRecording(true);
    } catch {
      toast({
        title: "Microphone error",
        description: "Please allow microphone access in your browser.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
    stopMeter();
  };

  const transcribeBlob = async (blob: Blob, dur?: number) => {
    setTranscribing(true);
    try {
      const base64 = await blobToBase64(blob);
      const { data, error } = await supabase.functions.invoke("transcribe", {
        body: { audio: base64, mimeType: blob.type, dialect },
      });
      if (error) throw error;
      const result = (data as { text?: string; error?: string }) ?? {};
      if (result.error) throw new Error(result.error);
      const transcript = result.text ?? "";
      setText(transcript);
      if (transcript) {
        await addHistory({ kind: "stt", text: transcript, dialect, durationSeconds: dur });
        toast({ title: "Transcription complete" });
      } else {
        toast({ title: "No speech detected", variant: "destructive" });
      }
    } catch (err: any) {
      toast({
        title: "Transcription failed",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setTranscribing(false);
    }
  };

  const handleFile = async (file: File) => {
    if (file.size > 100 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 100MB.", variant: "destructive" });
      return;
    }
    if (!ALLOWED.includes(file.type) && !/\.(mp3|wav|m4a|webm|ogg|mp4)$/i.test(file.name)) {
      toast({
        title: "Unsupported file",
        description: "Use MP3, WAV, M4A, WEBM, or OGG.",
        variant: "destructive",
      });
      return;
    }
    const url = URL.createObjectURL(file);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(url);
    const d = await getAudioDuration(file);
    setDuration(d);
    await transcribeBlob(file, d);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await handleFile(file);
  };

  const copyText = async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const goTranslate = () => {
    if (!text) return;
    sessionStorage.setItem("translate_input", text);
    navigate("/translate");
  };

  const safeExport = async (label: string, fn: () => void | Promise<void>) => {
    try {
      await fn();
      toast({ title: `Exported ${label}` });
    } catch (err: any) {
      toast({
        title: `Export failed (${label})`,
        description: err?.message ?? "Something went wrong.",
        variant: "destructive",
        action: (
          <ToastAction altText="Retry" onClick={() => safeExport(label, fn)}>
            Retry
          </ToastAction>
        ),
      });
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-6 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Speech to Text</h1>
        <p className="text-muted-foreground">
          Record your voice or upload an audio file to transcribe Afaan Oromo speech.
        </p>
      </div>

      <Card className="p-6 md:p-8 bg-gradient-to-br from-card to-secondary/40 border-border shadow-soft">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <label className="text-sm font-medium">Dialect</label>
            <Select value={dialect} onValueChange={setDialect}>
              <SelectTrigger className="sm:w-64 bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DIALECTS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end justify-center gap-1 h-16 bg-muted/40 rounded-xl p-3">
            {levels.map((h, i) => (
              <div
                key={i}
                className={cn(
                  "w-1.5 rounded-full transition-all duration-75",
                  recording ? "bg-primary" : "bg-muted-foreground/30"
                )}
                style={{ height: `${h}px` }}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {!recording ? (
              <Button
                size="lg"
                onClick={startRecording}
                disabled={transcribing}
                className="rounded-full px-6 h-14 text-base shadow-glow"
              >
                <Mic className="w-5 h-5 mr-2" />
                Start Recording
              </Button>
            ) : (
              <Button
                size="lg"
                variant="destructive"
                onClick={stopRecording}
                className="rounded-full px-6 h-14 text-base"
              >
                <Square className="w-5 h-5 mr-2" />
                Stop
              </Button>
            )}
          </div>

          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              "block border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
            )}
          >
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.currentTarget.value = "";
              }}
            />
            <Upload className="w-7 h-7 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">Drop audio file or click to upload</p>
            <p className="text-xs text-muted-foreground mt-1">MP3 · WAV · M4A · WEBM · OGG (max 100MB)</p>
          </label>

          {audioUrl && (
            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
              <FileAudio className="w-5 h-5 text-primary shrink-0" />
              <audio src={audioUrl} controls className="flex-1 h-9" />
            </div>
          )}

          {transcribing && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Transcribing Afaan Oromo audio...
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-sm font-medium">Transcription</label>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={copyText} disabled={!text}>
                  <Copy className="w-4 h-4 mr-1" /> Copy
                </Button>
                <Button variant="ghost" size="sm" onClick={goTranslate} disabled={!text}>
                  <Languages className="w-4 h-4 mr-1" /> Translate
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" disabled={!text}>
                      <FileDown className="w-4 h-4 mr-1" /> Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => exportTxt(text)}>
                      <FileText className="w-4 h-4 mr-2" /> .txt
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportDocx(text, "transcription", "Transcription")}>
                      <FileType className="w-4 h-4 mr-2" /> .docx
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportPdf(text, "transcription", "Transcription")}>
                      <FileType className="w-4 h-4 mr-2" /> .pdf
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportSrt(text, duration)}>
                      <Subtitles className="w-4 h-4 mr-2" /> .srt subtitles
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="sm" onClick={() => setText("")} disabled={!text}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Transcribed Afaan Oromo text will appear here..."
              className="min-h-[180px] resize-none bg-background"
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SpeechToText;
