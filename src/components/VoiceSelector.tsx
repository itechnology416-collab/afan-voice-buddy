import { VoiceOption } from "@/hooks/useSpeechSynthesis";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { User, UserRound } from "lucide-react";

interface VoiceSelectorProps {
  voices: VoiceOption[];
  selectedVoice: VoiceOption | null;
  onVoiceChange: (voice: VoiceOption) => void;
  rate: number;
  onRateChange: (rate: number) => void;
  pitch: number;
  onPitchChange: (pitch: number) => void;
}

export const VoiceSelector = ({
  voices,
  selectedVoice,
  onVoiceChange,
  rate,
  onRateChange,
  pitch,
  onPitchChange,
}: VoiceSelectorProps) => {
  const maleVoices = voices.filter(v => v.gender === 'male');
  const femaleVoices = voices.filter(v => v.gender === 'female');
  const otherVoices = voices.filter(v => v.gender === 'unknown');

  const selectedGender = selectedVoice?.gender || 'female';

  const handleGenderSelect = (gender: 'male' | 'female') => {
    const voiceList = gender === 'male' ? maleVoices : femaleVoices;
    if (voiceList.length > 0) {
      // Find an English voice first, then fallback to first available
      const preferredVoice = voiceList.find(v => v.lang.startsWith('en')) || voiceList[0];
      onVoiceChange(preferredVoice);
    }
  };

  const currentGenderVoices = selectedGender === 'male' ? maleVoices : 
                              selectedGender === 'female' ? femaleVoices : 
                              otherVoices;

  return (
    <div className="space-y-5">
      {/* Gender Toggle */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Sagalee filadhu (Select Voice)
        </label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={selectedGender === 'female' ? 'default' : 'outline'}
            className={cn(
              "flex-1 gap-2 transition-all",
              selectedGender === 'female' && "shadow-soft"
            )}
            onClick={() => handleGenderSelect('female')}
          >
            <UserRound className="w-4 h-4" />
            Dubartii (Female)
          </Button>
          <Button
            type="button"
            variant={selectedGender === 'male' ? 'default' : 'outline'}
            className={cn(
              "flex-1 gap-2 transition-all",
              selectedGender === 'male' && "shadow-soft"
            )}
            onClick={() => handleGenderSelect('male')}
          >
            <User className="w-4 h-4" />
            Dhiira (Male)
          </Button>
        </div>
      </div>

      {/* Voice Selection Dropdown */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Maqaa sagalee (Voice Name)
        </label>
        <Select
          value={selectedVoice?.name || ''}
          onValueChange={(name) => {
            const voice = voices.find(v => v.name === name);
            if (voice) onVoiceChange(voice);
          }}
        >
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder="Select a voice" />
          </SelectTrigger>
          <SelectContent>
            {currentGenderVoices.length > 0 ? (
              currentGenderVoices.map((voice) => (
                <SelectItem key={voice.name} value={voice.name}>
                  {voice.name} ({voice.lang})
                </SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled>
                No {selectedGender} voices available
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Speed Control */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">
            Saffisa (Speed)
          </label>
          <span className="text-sm text-muted-foreground">{rate.toFixed(1)}x</span>
        </div>
        <Slider
          value={[rate]}
          onValueChange={([value]) => onRateChange(value)}
          min={0.5}
          max={1.5}
          step={0.1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Suuta (Slow)</span>
          <span>Ariifataa (Fast)</span>
        </div>
      </div>

      {/* Pitch Control */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">
            Ol-gadee (Pitch)
          </label>
          <span className="text-sm text-muted-foreground">{pitch.toFixed(1)}</span>
        </div>
        <Slider
          value={[pitch]}
          onValueChange={([value]) => onPitchChange(value)}
          min={0.5}
          max={1.5}
          step={0.1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Gadi (Low)</span>
          <span>Ol (High)</span>
        </div>
      </div>
    </div>
  );
};
