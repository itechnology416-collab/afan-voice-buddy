import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { clearHistory } from "@/lib/history";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

const Settings = () => {
  const { toast } = useToast();
  return (
    <div className="container max-w-3xl mx-auto px-4 py-8 md:py-12 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Customize your experience.</p>
      </div>

      <Card className="p-6 flex items-center justify-between">
        <div>
          <p className="font-medium">Appearance</p>
          <p className="text-sm text-muted-foreground">Switch between light and dark mode.</p>
        </div>
        <ThemeToggle />
      </Card>

      <Card className="p-6 flex items-center justify-between">
        <div>
          <p className="font-medium">Clear local history</p>
          <p className="text-sm text-muted-foreground">Remove all stored conversions on this device.</p>
        </div>
        <Button
          variant="destructive"
          onClick={() => { clearHistory(); toast({ title: "History cleared" }); }}
        >
          <Trash2 className="w-4 h-4 mr-2" /> Clear
        </Button>
      </Card>

      <Card className="p-6">
        <p className="font-medium mb-2">About</p>
        <p className="text-sm text-muted-foreground">
          Afaan Oromo Natural Voice — AI-powered speech-to-text and text-to-speech for the Oromo language.
          Phase 1: core conversion features. Cloud auth, translation, exports, and more coming next.
        </p>
      </Card>
    </div>
  );
};

export default Settings;
