'use client';

import { useState, useCallback } from 'react';
import { Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from './Modal';
import { joinWaitlist } from '@/utils/waitlist';

interface WaitlistFormData {
  name: string;
  email: string;
  useCase: string;
}

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WaitlistModal({ isOpen, onClose }: WaitlistModalProps) {
  const [formData, setFormData] = useState<WaitlistFormData>({
    name: '',
    email: '',
    useCase: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onClose();
      // Reset form state after modal closes
      setTimeout(() => {
        setFormData({ name: '', email: '', useCase: '' });
        setSuccess(false);
        setError('');
      }, 300);
    }
  }, [isSubmitting, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const data = await joinWaitlist(formData);

      if (data.success) {
        setSuccess(true);
        setFormData({ name: '', email: '', useCase: '' });

        // Close modal after showing success state
        setTimeout(() => {
          handleClose();
          setSuccess(false);
        }, 3000);
      } else {
        setError(data.message || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setError('Failed to join waitlist. Please try again.');
      console.error('Waitlist form error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Join the Waitlist">
      <div className="space-y-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        {success ? (
          <div className="space-y-4 py-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-center text-white">You're on the list! 🎉</h3>
            <p className="text-muted text-center text-sm">
              We'll email you when the managed version launches.
            </p>
            <div className="pt-4 space-y-2">
              <p className="text-xs text-muted text-center">
              ✓ Enhanced security features
              </p>
              <p className="text-xs text-muted text-center">
              ✓ Priority support
              </p>
              <p className="text-xs text-muted text-center">
              ✓ 99.9% uptime SLA
              </p>
            </div>
            <p className="text-xs text-muted text-center mt-4">
              No spam, we promise. Only important updates.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted mb-4">
              Join the waitlist for our managed version with enhanced security features,
              priority support, and 99.9% uptime SLA.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="waitlist-name" className="text-sm font-medium text-muted block mb-1">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="waitlist-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 rounded-lg border border-glass-border bg-background focus:outline-none focus:border-accent-blue transition-colors disabled:opacity-50"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="waitlist-email" className="text-sm font-medium text-muted block mb-1">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  id="waitlist-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 rounded-lg border border-glass-border bg-background focus:outline-none focus:border-accent-blue transition-colors disabled:opacity-50"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="waitlist-usecase" className="text-sm font-medium text-muted block mb-1">
                  Use case <span className="text-xs text-muted font-normal">(optional)</span>
                </label>
                <textarea
                  id="waitlist-usecase"
                  value={formData.useCase}
                  onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                  disabled={isSubmitting}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-lg border border-glass-border bg-background focus:outline-none focus:border-accent-blue transition-colors disabled:opacity-50 resize-none"
                  placeholder="Briefly describe how you'd use the managed version..."
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-400/10 border border-red-400/20 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-6 py-3 rounded-lg font-semibold bg-neon-gradient text-white hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Join Waitlist
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-glass-border space-y-2">
              <p className="text-sm text-muted text-center">
                Get enterprise features without enterprise complexity. <strong>Simple pricing, transparent costs.</strong>
              </p>
              <p className="text-xs text-muted text-center">
                We'll email you when early access opens. No spam, ever.
              </p>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
