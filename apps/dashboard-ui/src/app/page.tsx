'use client';

import Link from 'next/link';
import { Shield, Github, Lock, Zap, DollarSign, ArrowRight, CheckCircle2, Code, Server, Activity, Smile, Mail } from 'lucide-react';
import { WaitlistModal } from '@/components/waitlist-modal';
import { useState } from 'react';

export default function HomePage() {
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-sm font-medium">
            <Shield className="w-4 h-4" />
            Open Source & Self-Hosted
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Your AI Gateway.
            <span className="text-gradient block mt-2">Your Infrastructure.</span>
            <span className="block mt-2">Your Control.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-muted max-w-2xl mx-auto">
            Ship AI features without shipping security risks. Self-hosted, open-source gateway
            with enterprise security: anomaly detection, PII scrubbing, hard spending caps.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="https://github.com/dongvannhan1000/micro-gateway/blob/main/SELF_HOSTED.md"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 rounded-xl font-semibold bg-neon-gradient text-white hover:opacity-90 transition-all flex items-center gap-2"
            >
              <Server className="w-5 h-5" />
              Deploy Self-Hosted (Free)
              <ArrowRight className="w-5 h-5" />
            </a>

            <Link
              href="https://github.com/dongvannhan1000/micro-gateway"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 rounded-xl font-semibold glass hover:bg-glass-bg transition-all flex items-center gap-2"
            >
              <Github className="w-5 h-5" />
              View on GitHub
            </Link>
          </div>

          {/* Trust Badge */}
          <p className="text-sm text-muted">
            🔒 Your provider keys never leave your infrastructure
          </p>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          <div className="glass-card p-6 text-center">
            <Code className="w-8 h-8 mx-auto mb-3 text-accent-blue" />
            <h3 className="font-semibold mb-1">Open Source</h3>
            <p className="text-sm text-muted">Audit the code yourself</p>
          </div>

          <div className="glass-card p-6 text-center">
            <Lock className="w-8 h-8 mx-auto mb-3 text-green-500" />
            <h3 className="font-semibold mb-1">AES-256 Encrypted</h3>
            <p className="text-sm text-muted">Military-grade encryption</p>
          </div>

          <div className="glass-card p-6 text-center">
            <Server className="w-8 h-8 mx-auto mb-3 text-purple-500" />
            <h3 className="font-semibold mb-1">Self-Hosted</h3>
            <p className="text-sm text-muted">Keys stay on your servers</p>
          </div>

          <div className="glass-card p-6 text-center">
            <DollarSign className="w-8 h-8 mx-auto mb-3 text-yellow-500" />
            <h3 className="font-semibold mb-1">Free Forever</h3>
            <p className="text-sm text-muted">No feature gating</p>
          </div>
        </div>
      </section>

      {/* Why Self-Hosted Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Self-Hosted?
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-accent-blue/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-accent-blue" />
              </div>
              <h3 className="text-xl font-bold">Zero Trust Required</h3>
              <p className="text-muted">
                Your provider keys never leave your infrastructure.
                Deploy on Cloudflare Workers, VPS, or your own servers.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="text-xl font-bold">Enterprise Security</h3>
              <p className="text-muted">
                Anomaly detection, PII scrubbing, hard spending caps.
                Features competitors charge $100+/month for.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="text-xl font-bold">Prevent Bill Shock</h3>
              <p className="text-muted">
                Set hard spending caps per project. Never get a $5,000
                surprise bill again due to bugs or loops.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20 bg-glass-bg/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Security Features
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: "Prompt Injection Detection",
                description: "Automatically detect and block malicious prompt injection attacks (OWASP #1 LLM risk)",
              },
              {
                title: "PII Scrubbing",
                description: "Automatically redact emails, phone numbers, SSN before sending to AI providers (GDPR/HIPAA compliant)",
              },
              {
                title: "Hard Spending Caps",
                description: "Set monthly USD limits per project. Gateway blocks requests when limit reached",
              },
              {
                title: "Rate Limiting",
                description: "Per-key rate limits to prevent abuse. Configurable requests per minute/hour/day",
              },
              {
                title: "Multi-Provider Routing",
                description: "Switch between OpenAI, Anthropic, Google, DeepSeek, Groq, Together AI without code changes",
              },
              {
                title: "Cost Analytics",
                description: "Track costs per project, model, and provider. Understand where your AI budget goes",
              },
            ].map((feature, i) => (
              <div key={i} className="glass-card p-6 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Deployment Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl font-bold">
            Deploy in 5 Minutes
          </h2>

          <div className="glass-card p-8 text-left space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue font-bold">1</div>
                <h3 className="font-semibold">Clone & Install</h3>
              </div>
              <code className="block bg-background p-4 rounded-lg text-sm overflow-x-auto">
                git clone https://github.com/dongvannhan1000/micro-gateway.git<br/>
                cd micro-gateway && npm install
              </code>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue font-bold">2</div>
                <h3 className="font-semibold">Configure Supabase</h3>
              </div>
              <code className="block bg-background p-4 rounded-lg text-sm overflow-x-auto">
                cd apps/gateway-api<br/>
                # Add your Supabase credentials to wrangler.toml<br/>
                # Set secrets (SUPABASE_JWT_SECRET, ENCRYPTION_SECRET)
              </code>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue font-bold">3</div>
                <h3 className="font-semibold">Deploy & Add Provider Keys</h3>
              </div>
              <code className="block bg-background p-4 rounded-lg text-sm overflow-x-auto">
                npx wrangler deploy<br/>
                # ✨ Your gateway is live!<br/>
                # Add provider keys via dashboard UI
              </code>
            </div>
          </div>

          <div>
            <a
              href="https://github.com/dongvannhan1000/micro-gateway/blob/main/SELF_HOSTED.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold bg-neon-gradient text-white hover:opacity-90 transition-all"
            >
              View Full Deployment Guide
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>

          <p className="text-sm text-muted">
            Deploy to Cloudflare Workers, AWS Lambda, Docker, or your own infrastructure
          </p>
        </div>
      </section>

      {/* Managed Version CTA */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="glass-card p-8 md:p-12 text-center space-y-6 border-accent-blue/30">
            <h2 className="text-3xl font-bold">
              Want Us to Host It?
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Don't want to manage your own infrastructure? Join the waitlist for our managed version
              with enhanced security features, priority support, and 99.9% uptime SLA.
            </p>
            <div className="glass-card p-8 space-y-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setIsWaitlistModalOpen(true)}
                  className="flex-1 px-8 py-4 rounded-xl font-semibold bg-neon-gradient text-white hover:opacity-90 transition-all flex items-center justify-center gap-2 text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Mail className="w-5 h-5" />
                  Join the Waitlist
                </button>
                <Link
                  href="/register"
                  className="flex-1 px-8 py-4 rounded-xl font-semibold glass hover:bg-glass-bg transition-all flex items-center justify-center gap-2 text-lg shadow-lg hover:shadow-xl transform hover:scale-105 border-2 border-purple-500/30 hover:border-purple-500/50"
                >
                  <Smile className="w-5 h-5" />
                  Start Free Trial - if you trust me
                </Link>
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-muted">
                  Get enterprise features without enterprise complexity. <strong>Simple pricing, transparent costs.</strong>
                </p>
                <p className="text-xs text-muted">
                  We'll email you when early access opens. No spam, ever.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            {[
              {
                q: "Why should I trust you with my API keys?",
                a: "You shouldn't. That's why we offer self-hosted deployment. Your provider keys never leave your infrastructure. For our managed version, we use per-user encryption keys and security audit logging.",
              },
              {
                q: "What's the difference between self-hosted and managed?",
                a: "Self-hosted: Deploy on your own infra, your keys stay with you, FREE. Managed: We host it, enhanced security features, 99.9% SLA, $29/month.",
              },
              {
                q: "Can I migrate from self-hosted to managed?",
                a: "Yes! Export your config from self-hosted and import it to managed. Your provider keys are re-encrypted with managed encryption keys.",
              },
              {
                q: "What AI providers do you support?",
                a: "OpenAI, Anthropic, Google AI, DeepSeek, Groq, and Together AI. Switch between them without changing your code.",
              },
              {
                q: "How much does self-hosted cost?",
                a: "Free for most projects. Cloudflare Workers free tier: 100K requests/day. D1 database: 5M reads/day. You only pay if you exceed free tier limits.",
              },
            ].map((faq, i) => (
              <details key={i} className="glass-card group">
                <summary className="p-6 cursor-pointer font-semibold flex items-center justify-between">
                  {faq.q}
                  <ArrowRight className="w-5 h-5 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-6 pb-6 text-muted">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl font-bold">
            Ready to Secure Your AI APIs?
          </h2>
          <p className="text-lg text-muted">
            Join developers who trust Micro-Security Gateway for production AI deployments.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="https://github.com/dongvannhan1000/micro-gateway"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 rounded-xl font-semibold bg-neon-gradient text-white hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <Github className="w-5 h-5" />
              Star on GitHub
            </Link>
            <a
              href="https://github.com/dongvannhan1000/micro-gateway/blob/main/SELF_HOSTED.md"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 rounded-xl font-semibold glass hover:bg-glass-bg transition-all flex items-center justify-center gap-2"
            >
              <Server className="w-5 h-5" />
              Deploy Now
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-glass-border py-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted">
          <p>© 2026 Micro-Security Gateway. Open source under MIT License.</p>
          <div className="flex justify-center gap-6 mt-4">
            <a href="https://github.com/dongvannhan1000/micro-gateway/blob/main/SECURITY.md" target="_blank" rel="noopener noreferrer" className="hover:text-accent-blue">Security</a>
            <a href="https://github.com/dongvannhan1000/micro-gateway/blob/main/SELF_HOSTED.md" target="_blank" rel="noopener noreferrer" className="hover:text-accent-blue">Documentation</a>
            <a href="https://github.com/dongvannhan1000/micro-gateway" target="_blank" rel="noopener noreferrer" className="hover:text-accent-blue">GitHub</a>
          </div>
        </div>
      </footer>

      {/* Status Bar */}
      <div className="glass px-6 py-4 flex items-center justify-center gap-3 text-sm text-muted">
        <Activity size={14} className="text-green-400" />
        <span>Gateway Status: <span className="text-green-400 font-medium">Operational</span></span>
      </div>

      {/* Waitlist Modal */}
      <WaitlistModal
        isOpen={isWaitlistModalOpen}
        onClose={() => setIsWaitlistModalOpen(false)}
      />
    </div>
  );
}
