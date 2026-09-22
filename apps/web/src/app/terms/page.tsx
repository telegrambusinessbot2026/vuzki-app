import React from 'react';
import Link from 'next/link';
import MarketingHeader from '@/components/marketing/Header';
import MarketingFooter from '@/components/marketing/Footer';
import { ArrowLeftIcon } from '@/components/ui/Icons';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-dvh bg-[#0a0a0c] flex flex-col relative">
      <MarketingHeader />
      
      <main className="flex-1 max-w-4xl mx-auto px-4 py-24 relative z-10">
        <div className="mb-8">
          <Link href="/app/settings" className="inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 transition-colors font-bold tracking-wide text-sm">
            <ArrowLeftIcon size={16} /> Back to Settings
          </Link>
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-white drop-shadow-md">Terms of Service</h1>
        <p className="text-white/50 mb-12 font-medium uppercase tracking-wider text-sm">Last Updated: September 22, 2026</p>

        <div className="glass-panel p-6 md:p-10 rounded-[32px] border border-white/10 shadow-float">
          <div className="prose prose-invert prose-brand max-w-none space-y-10">
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">1. Agreement to Terms</h2>
              <p className="text-white/70 leading-relaxed font-medium">
                By accessing or using the VUZKI application, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service. You must be at least 18 years of age to create an account and use our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">2. Acceptable Use and Conduct</h2>
              <p className="text-white/70 leading-relaxed font-medium">
                You agree to use VUZKI responsibly and respectfully. You must not:
              </p>
              <ul className="list-disc pl-6 mt-4 text-white/70 space-y-3 font-medium">
                <li>Use the service for any unlawful purpose.</li>
                <li>Harass, abuse, threaten, or impersonate other users.</li>
                <li>Share explicit, offensive, or inappropriate content in chats, calls, or your profile.</li>
                <li>Attempt to circumvent our safety, moderation, or payment systems.</li>
                <li>Spam users or use automated bots to interact with the platform.</li>
              </ul>
              <p className="text-white/70 leading-relaxed mt-4 font-medium">
                We reserve the right to suspend or terminate your account immediately if you violate these rules.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">3. Virtual Currency and Purchases</h2>
              <p className="text-white/70 leading-relaxed font-medium">
                VUZKI offers virtual "Coins" and "Gifts". These are licensed to you, not sold.
              </p>
              <ul className="list-disc pl-6 mt-4 text-white/70 space-y-3 font-medium">
                <li>Coins and Gifts have no real-world monetary value and cannot be exchanged for cash (unless explicitly supported by our Creator Earnings program).</li>
                <li>All purchases are final and non-refundable, except where required by law.</li>
                <li>We reserve the right to manage, modify, or eliminate virtual currency systems at any time.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">4. Content Ownership</h2>
              <p className="text-white/70 leading-relaxed font-medium">
                You retain all rights to any content you submit, post, or display on or through the app. However, by uploading content, you grant VUZKI a worldwide, non-exclusive, royalty-free license to use, reproduce, and display that content in connection with the service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">5. Disclaimer of Warranties</h2>
              <p className="text-white/70 leading-relaxed font-medium">
                Your use of the service is at your sole risk. The service is provided on an "AS IS" and "AS AVAILABLE" basis. We do not guarantee that the service will be uninterrupted, secure, or error-free.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">6. Limitation of Liability</h2>
              <p className="text-white/70 leading-relaxed font-medium">
                In no event shall VUZKI, its directors, employees, or partners, be liable for any indirect, incidental, special, consequential or punitive damages resulting from your use of the service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">7. Changes to Terms</h2>
              <p className="text-white/70 leading-relaxed font-medium">
                We reserve the right to modify or replace these Terms at any time. We will notify users of any material changes via the application.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">8. Contact Us</h2>
              <p className="text-white/70 leading-relaxed font-medium">
                If you have any questions about these Terms, please contact us at <a href="mailto:legal@vuzki.com" className="text-brand-400 hover:text-brand-300 underline">legal@vuzki.com</a>.
              </p>
            </section>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
