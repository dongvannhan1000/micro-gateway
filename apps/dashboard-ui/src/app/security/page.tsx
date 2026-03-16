import { Metadata } from 'next';
import EncryptionDiagram from './components/EncryptionDiagram';
import CodeSnippet from './components/CodeSnippet';
import ComparisonTable from './components/ComparisonTable';
import SecurityFAQ from './components/SecurityFAQ';

export const metadata: Metadata = {
  title: 'Security - How We Protect Your API Keys',
  description: 'Learn how we encrypt and protect your API keys with AES-256-GCM encryption. Open source, transparent, and secure.',
};

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-6">
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Your API Keys, Encrypted & Secure
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
              We believe transparency builds trust. Here's exactly what happens to your API keys
              from the moment you paste them until they're used to make requests.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="https://github.com/your-org/micro-gateway"
                target="_blank"
                rel="noopener"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                View Source Code
              </a>
              <a
                href="/dashboard"
                className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Try It Now
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Encryption Overview */}
        <section className="mb-16">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <span className="mr-3">🔒</span>
              Encryption in Transit and at Rest
            </h2>

            <div className="prose prose-lg dark:prose-invert max-w-none mb-8">
              <p className="text-gray-600 dark:text-gray-300 text-lg">
                Your provider API keys are encrypted at REST using <strong>AES-256-GCM</strong> with
                <strong>HKDF key derivation</strong> from a master encryption key. Keys are
                <strong>temporarily decrypted in memory</strong> only when proxying requests to AI providers
                (typically &lt;1 second). Each key uses a <strong>unique initialization vector (IV)</strong>
                for encryption.
              </p>
            </div>

            <EncryptionDiagram />

            <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg">
              <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Encryption flow: Browser → Database → Temporary Decryption → AI Provider
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Algorithm: AES-256-GCM • Key Derivation: HKDF (from master key) • Unique IV per key
              </p>
            </div>
          </div>
        </section>

        {/* Open Source Code */}
        <section className="mb-16">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <span className="mr-3">👁️</span>
              Open Source Implementation
            </h2>

            <p className="text-gray-600 dark:text-gray-300 text-lg mb-6">
              Don't trust us? Verify it yourself. Here's the exact code we use to encrypt your keys:
            </p>

            <CodeSnippet />

            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <a
                href="https://github.com/your-org/micro-gateway/blob/main/apps/gateway-api/src/utils/crypto.ts"
                target="_blank"
                rel="noopener"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                View full source on GitHub →
              </a>
            </div>
          </div>
        </section>

        {/* What We Log */}
        <section className="mb-16">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <span className="mr-3">📊</span>
              What We Log vs Don't Log
            </h2>

            <ComparisonTable />

            <div className="mt-8 p-6 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-r-lg">
              <p className="font-semibold text-green-900 dark:text-green-100">
                ✅ We NEVER store your prompts or responses
              </p>
              <p className="text-sm text-green-800 dark:text-green-200 mt-2">
                Your privacy is paramount. We only log usage metrics for billing and analytics.
              </p>
            </div>
          </div>
        </section>

        {/* Key Revocation */}
        <section className="mb-16">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <span className="mr-3">🚫</span>
              You're Always in Control
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Revoke Your Keys Anytime
                </h3>
                <ol className="space-y-3 text-gray-600 dark:text-gray-300">
                  <li className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mr-3 mt-0.5">1</span>
                    <span>Go to your Dashboard</span>
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mr-3 mt-0.5">2</span>
                    <span>Select the project</span>
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mr-3 mt-0.5">3</span>
                    <span>Click &quot;Revoke&quot; next to the key</span>
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mr-3 mt-0.5">4</span>
                    <span>Immediately stops working (within 1 second)</span>
                  </li>
                </ol>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  What Happens When You Revoke
                </h3>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 font-mono text-sm">
                  <div className="text-red-600 dark:text-red-400 mb-2">Key: sk-gw-xxx123</div>
                  <div className="text-gray-600 dark:text-gray-400 mb-2">Status: Active → Revoked</div>
                  <div className="text-gray-600 dark:text-gray-400 mb-2">All requests return 401</div>
                  <div className="text-gray-600 dark:text-gray-400">Encrypted key deleted from DB</div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  Note: After revocation, the encrypted key is deleted from our database
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Security Layers */}
        <section className="mb-16">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <span className="mr-3">🛡️</span>
              Additional Security Layers
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="text-3xl mb-3">⚡</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Rate Limiting
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Per-key rate limits prevent abuse. IP-based blocking detects malicious patterns.
                </p>
              </div>

              <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="text-3xl mb-3">🔍</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Anomaly Detection
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Spike detection (100 req/min vs avg of 10). Pattern analysis for prompt injection.
                </p>
              </div>

              <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="text-3xl mb-3">🌐</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Edge Infrastructure
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Cloudflare Workers for &lt;50ms global latency. D1 Database encrypted at rest.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-16">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <span className="mr-3">❓</span>
              Frequently Asked Questions
            </h2>

            <SecurityFAQ />
          </div>
        </section>

        {/* Contact CTA */}
        <section className="text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-white mb-4">
              Security Concerns?
            </h2>
            <p className="text-blue-100 mb-6">
              Found a vulnerability or have questions? We&apos;d love to hear from you.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="mailto:security@your-gateway.com"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 transition-colors"
              >
                Report Vulnerability
              </a>
              <a
                href="mailto:support@your-gateway.com"
                className="inline-flex items-center px-6 py-3 border border-white text-base font-medium rounded-md text-white hover:bg-white/10 transition-colors"
              >
                Contact Support
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
