import React from 'react';
import Link from 'next/link';
import MarketingHeader from '@/components/marketing/Header';
import MarketingFooter from '@/components/marketing/Footer';
import { ArrowLeftIcon } from '@/components/ui/Icons';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-dvh bg-[#0a0a0c] flex flex-col relative">
      <MarketingHeader />
      
      <main className="flex-1 max-w-4xl mx-auto px-4 py-24 relative z-10">
        <div className="mb-8">
          <Link href="/app/settings" className="inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 transition-colors font-bold tracking-wide text-sm">
            <ArrowLeftIcon size={16} /> Back to Settings
          </Link>
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-white drop-shadow-md">Privacy Policy</h1>
        <p className="text-white/50 mb-12 font-medium uppercase tracking-wider text-sm">Last Updated: September 22, 2026</p>

        <div className="glass-panel p-6 md:p-10 rounded-[32px] border border-white/10 shadow-float">
          <div className="prose prose-invert prose-brand max-w-none space-y-10">
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">1. Introduction</h2>
              <p className="text-white/70 leading-relaxed font-medium">
                At VUZKI, your privacy and safety are our top priorities. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our application. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the application.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">2. Information We Collect</h2>
              <p className="text-white/70 leading-relaxed font-medium">
                We collect information that you voluntarily provide to us when you register on the application, express an interest in obtaining information about us or our products and services, when you participate in activities on the application (such as sending messages, making calls, or making purchases), or otherwise when you contact us.
              </p>
              <ul className="list-disc pl-6 mt-4 text-white/70 space-y-3 font-medium">
                <li><strong className="text-white">Personal Information:</strong> Name, email address, phone number, date of birth, gender, and avatar.</li>
                <li><strong className="text-white">Usage Data:</strong> Information about your interactions with the app, such as match history, block lists, reports, and feature usage.</li>
                <li><strong className="text-white">Financial Data:</strong> Transaction history for coins and gifts (processed securely by third-party payment providers like Stripe and Razorpay). We do not store your full credit card details.</li>
                <li><strong className="text-white">Media and Audio:</strong> When you use our Talk Now or video call features, audio and video streams are transmitted securely. We do not record or store these streams unless explicitly stated for moderation purposes.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">3. How We Use Your Information</h2>
              <p className="text-white/70 leading-relaxed font-medium">
                We use the information we collect or receive to:
              </p>
              <ul className="list-disc pl-6 mt-4 text-white/70 space-y-3 font-medium">
                <li>Facilitate account creation and logon process.</li>
                <li>Provide and manage the services (e.g., matching, chat, calls).</li>
                <li>Fulfill and manage purchases, orders, payments, and other transactions.</li>
                <li>Protect our services (e.g., fraud monitoring and prevention, trust and safety moderation).</li>
                <li>Respond to user inquiries/offer support to users.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">4. Sharing Your Information</h2>
              <p className="text-white/70 leading-relaxed font-medium">
                We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations. Other users can see your public profile information, online status (if enabled), and any content you voluntarily share in chats or calls.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">5. Security of Your Information</h2>
              <p className="text-white/70 leading-relaxed font-medium">
                We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">6. Your Privacy Rights</h2>
              <p className="text-white/70 leading-relaxed font-medium">
                Depending on your location, you may have the right to request access to the personal information we collect from you, change that information, or delete it in some circumstances. You can update your privacy settings directly within the app under Settings &gt; Privacy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">7. Contact Us</h2>
              <p className="text-white/70 leading-relaxed font-medium">
                If you have questions or comments about this policy, you may email our Privacy Officer at <a href="mailto:privacy@vuzki.com" className="text-brand-400 hover:text-brand-300 underline">privacy@vuzki.com</a>.
              </p>
            </section>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
