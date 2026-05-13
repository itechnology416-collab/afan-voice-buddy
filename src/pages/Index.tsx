import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, Volume2, History, Sparkles, ArrowRight } from "lucide-react";

const Index = () => {
  return (
    <div className="container max-w-5xl mx-auto px-4 py-10 md:py-16 space-y-10 animate-fade-in">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 text-accent-foreground text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" /> AI-powered for Afaan Oromo
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          <span className="text-gradient-hero">Afaan Oromo</span>
          <br />
          Natural Voice
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Convert Afaan Oromo speech to text and text to speech with high accuracy.
          Record live, upload audio, and save your work — all in one place.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button asChild size="lg" className="rounded-full px-6 shadow-glow">
            <Link to="/speech-to-text"><Mic className="w-4 h-4 mr-2" /> Try Speech to Text</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full px-6">
            <Link to="/text-to-speech"><Volume2 className="w-4 h-4 mr-2" /> Try Text to Speech</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { to: "/speech-to-text", icon: Mic, title: "Speech to Text", desc: "Record or upload audio and get accurate Afaan Oromo transcripts." },
          { to: "/text-to-speech", icon: Volume2, title: "Text to Speech", desc: "Hear Afaan Oromo text spoken with natural male and female voices." },
          { to: "/history", icon: History, title: "History", desc: "Revisit, copy, and download your past conversions." },
        ].map((f) => (
          <Link key={f.to} to={f.to}>
            <Card className="p-6 h-full bg-gradient-to-br from-card to-secondary/40 hover:shadow-glow hover:-translate-y-1 transition-all duration-300 border-border">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
              <div className="mt-4 inline-flex items-center text-sm text-primary font-medium">
                Open <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Index;
