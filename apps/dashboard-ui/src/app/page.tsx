import { Shield, Zap, DollarSign, Activity } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      {/* Hero */}
      <div className="text-center animate-fade-in max-w-2xl">
        <div className="inline-flex items-center gap-2 glass px-4 py-2 mb-6 text-sm text-muted">
          <Shield size={16} className="text-accent-blue" />
          <span>Micro-Security Gateway</span>
        </div>

        <h1 className="text-5xl font-bold mb-4">
          <span className="text-gradient">Shield</span> your AI API calls
        </h1>
        <p className="text-muted text-lg mb-8">
          Cost tracking, prompt injection filtering, and rate limiting — all in one lightweight gateway.
        </p>

        <div className="flex gap-4 justify-center">
          <Link href="/login" className="bg-neon-gradient text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity cursor-pointer">
            Get Started
          </Link>
          <Link href="https://docs.example.com" target="_blank" className="glass text-foreground font-semibold px-6 py-3 rounded-xl hover:bg-glass-bg transition-colors cursor-pointer">
            View Docs
          </Link>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl w-full">
        <FeatureCard
          icon={<DollarSign className="text-accent-blue" />}
          title="Cost Tracking"
          description="Real-time token usage and cost monitoring per API key."
        />
        <FeatureCard
          icon={<Shield className="text-accent-violet" />}
          title="Security Filter"
          description="Multi-layer prompt injection detection and blocking."
        />
        <FeatureCard
          icon={<Zap className="text-accent-blue" />}
          title="Edge Performance"
          description="Sub-millisecond latency on Cloudflare's global network."
        />
      </div>

      {/* Status Bar */}
      <div className="glass mt-16 px-6 py-4 flex items-center gap-3 text-sm text-muted">
        <Activity size={14} className="text-green-400" />
        <span>Gateway Status: <span className="text-green-400 font-medium">Operational</span></span>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="glass-card animate-fade-in">
      <div className="mb-3">{icon}</div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-muted text-sm">{description}</p>
    </div>
  );
}
