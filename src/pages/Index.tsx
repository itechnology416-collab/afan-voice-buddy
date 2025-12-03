import { TextToSpeechConverter } from "@/components/TextToSpeechConverter";
import { Volume2 } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Decorative Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-12 md:py-20">
        {/* Logo/Icon */}
        <div className="flex justify-center mb-8">
          <div className="p-4 bg-primary/10 rounded-2xl">
            <Volume2 className="w-10 h-10 text-primary" />
          </div>
        </div>

        {/* Converter Component */}
        <TextToSpeechConverter />

        {/* Footer */}
        <footer className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            Afaan Oromoo Text-to-Speech Converter
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Built with ❤️ for Oromo language preservation
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
