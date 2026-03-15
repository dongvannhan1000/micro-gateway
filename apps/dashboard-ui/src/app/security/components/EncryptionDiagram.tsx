'use client';

import { useState } from 'react';

export default function EncryptionDiagram() {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: 'Paste Your Key',
      description: 'You paste your OpenAI key into the dashboard',
      icon: '📋',
      color: 'bg-blue-500',
    },
    {
      title: 'Client-Side Encryption',
      description: 'Key is encrypted with AES-256-GCM in your browser',
      icon: '🔒',
      color: 'bg-purple-500',
    },
    {
      title: 'Sent to Server',
      description: 'Only the encrypted key is sent to our servers',
      icon: '🌐',
      color: 'bg-green-500',
    },
    {
      title: 'Stored Encrypted',
      description: 'Encrypted key stored in database (cannot be decrypted)',
      icon: '💾',
      color: 'bg-yellow-500',
    },
    {
      title: 'Temporarily Decrypted',
      description: 'Key decrypted in Cloudflare Workers to make API request',
      icon: '⚡',
      color: 'bg-orange-500',
    },
    {
      title: 'OpenAI API',
      description: 'Request forwarded to OpenAI with your key',
      icon: '🤖',
      color: 'bg-red-500',
    },
  ];

  return (
    <div className="my-8">
      <div className="flex justify-center mb-6">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg disabled:opacity-50 mr-2"
        >
          ← Previous
        </button>
        <span className="px-4 py-2 bg-blue-100 dark:bg-blue-900 rounded-lg font-semibold">
          Step {step + 1} of {steps.length}
        </span>
        <button
          onClick={() => setStep(Math.min(steps.length - 1, step + 1))}
          disabled={step === steps.length - 1}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg disabled:opacity-50 ml-2"
        >
          Next →
        </button>
      </div>

      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 -translate-y-1/2 hidden md:block" />
        <div
          className="absolute top-1/2 left-0 h-1 bg-blue-500 -translate-y-1/2 transition-all duration-300 hidden md:block"
          style={{ width: `${(step / (steps.length - 1)) * 100}%` }}
        />

        {/* Steps */}
        <div className="grid md:grid-cols-6 gap-4">
          {steps.map((s, index) => (
            <div
              key={index}
              className={`relative p-6 rounded-lg border-2 transition-all ${
                index === step
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105'
                  : index < step
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              <div className={`text-4xl mb-3 ${index === step ? 'animate-bounce' : ''}`}>
                {s.icon}
              </div>
              <h3 className={`font-semibold text-sm mb-2 ${
                index === step ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
              }`}>
                {s.title}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {s.description}
              </p>

              {index === step && (
                <div className={`absolute -top-2 -right-2 w-6 h-6 ${s.color} rounded-full flex items-center justify-center`}>
                  <span className="text-white text-xs">●</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Click through to see how your key flows through the system
        </p>
      </div>
    </div>
  );
}
