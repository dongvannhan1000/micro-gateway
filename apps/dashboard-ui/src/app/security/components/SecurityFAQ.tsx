'use client';

import { useState } from 'react';

export default function SecurityFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'Can you see my API keys?',
      answer: 'Your provider API keys (OpenAI, Anthropic, etc.) are encrypted at REST in our database using AES-256-GCM with a master encryption key. However, to function as a proxy gateway, we MUST temporarily decrypt keys in memory when forwarding your requests to AI providers. Keys are never logged to disk or stored in plain text. Each key uses a unique initialization vector (IV), and the decrypted key exists only briefly in memory during request processing (typically < 1 second).',
    },
    {
      question: 'What if you get hacked?',
      answer: 'If our database is compromised, attackers would only find encrypted API keys. We use per-key encryption with HKDF key derivation, meaning each key is encrypted uniquely - there is no master key. However, keys are temporarily decrypted in memory during active requests. This is a necessary trade-off for a proxy gateway. We mitigate this risk by: (1) Using Cloudflare Workers isolated environments, (2) Never logging keys, (3) Keeping decryption window minimal (<1 second), (4) Auto-rotating encryption keys.',
    },
    {
      question: 'Do you log my prompts?',
      answer: 'No. We do NOT log your prompt content or AI responses. We only log usage metrics (request count, tokens used, costs) for billing and analytics. Your actual prompts and responses pass through our gateway transparently without being stored.',
    },
    {
      question: 'Why do you need to decrypt my keys?',
      answer: 'As a proxy gateway, we must decrypt your provider API keys temporarily to forward requests to AI providers like OpenAI. The flow is: (1) Your app sends request with your gateway key, (2) We validate your gateway key, (3) We decrypt your provider key in memory, (4) We forward request to OpenAI with the provider key, (5) The decrypted key is immediately discarded from memory. This decryption is necessary for the gateway to function - there is no way to proxy requests without accessing the API key.',
    },
    {
      question: 'Is this open source?',
      answer: 'Yes! The entire gateway codebase is open source on GitHub. You can audit the encryption implementation, security middleware, and all other code yourself. We believe transparency is essential for security tools.',
    },
    {
      question: 'Do you have a security audit?',
      answer: 'We are currently in the process of scheduling a professional security audit. In the meantime, our code is open for public review, and we welcome responsible disclosure of any vulnerabilities found. Please report security issues to security@your-gateway.com.',
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => (
        <div
          key={index}
          className={`border rounded-lg overflow-hidden transition-all duration-200 ${
            openIndex === index
              ? 'border-blue-300 dark:border-blue-700 shadow-md'
              : 'border-gray-200 dark:border-gray-700'
          }`}
        >
          <button
            onClick={() => toggleFAQ(index)}
            className="w-full px-6 py-4 text-left flex items-center justify-between bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            aria-expanded={openIndex === index}
          >
            <span className="font-semibold text-gray-900 dark:text-white pr-4">
              {faq.question}
            </span>
            <span
              className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full transition-transform duration-200 ${
                openIndex === index
                  ? 'bg-blue-500 text-white transform rotate-180'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>

          <div
            className={`overflow-hidden transition-all duration-200 ease-in-out ${
              openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {faq.answer}
              </p>
            </div>
          </div>
        </div>
      ))}

      <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          Still Have Questions?
        </h4>
        <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
          We're happy to answer any security questions you have.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="mailto:security@your-gateway.com"
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email Security Team
          </a>
          <a
            href="https://github.com/your-org/micro-gateway/discussions"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            GitHub Discussion
          </a>
        </div>
      </div>
    </div>
  );
}
