'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import MarketingHeader from '@/components/marketing/Header';
import MarketingFooter from '@/components/marketing/Footer';
import { StarIcon, ChevronRightIcon } from '@/components/ui/Icons';
import { Spinner } from '@/components/ui/Button';
import { api } from '@/lib/api';

interface Plan {
  id: string;
  tier: string;
  cycle: string;
  name: string;
  price: number;
  currency: string;
  features: string[];
}

interface PlanCard {
  id: string;
  name: string;
  price: number;
  billing: string;
  perks: string[];
  highlighted: boolean;
}

const billingLabel = (cycle: string) => (cycle === 'YEARLY' ? 'year' : cycle === 'WEEKLY' ? 'week' : 'month');

const FAQ = [
  {
    q: 'How do subscriptions work?',
    a: 'Subscriptions renew automatically each month and can be managed anytime in your account settings. Cancel whenever you like — your perks stay active until the end of the billing period.',
  },
  {
    q: 'Can I pay yearly and save?',
    a: 'Yes! We offer annual billing at a discount on select plans, and VIP members enjoy up to 20% savings. Look for the yearly option at checkout.',
  },
  {
    q: 'Are my payments secure?',
    a: 'Absolutely. All payments are processed securely over encrypted connections, and we never store your full payment details on our servers.',
  },
  {
    q: 'What is included in the free plan?',
    a: 'The free plan includes basic matching, messaging, and access to public live rooms. Paid plans unlock extras like unlimited likes, verified badges, and advanced filters.',
  },
  {
    q: 'Can I upgrade or downgrade anytime?',
    a: 'Yes, you can change your plan at any time. Upgrades take effect immediately, and downgrades apply at your next billing cycle.',
  },
];

export default function PricingPage() {
  const [plans, setPlans] = useState<PlanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api<{ plans: Record<string, Plan[]> }>('/subscriptions/plans', { auth: true })
      .then((data) => {
        if (cancelled) return;
        const order = ['PLUS', 'PREMIUM', 'VIP'];
        const cards: PlanCard[] = [];
        order.forEach((tier) => {
          const list = (data.plans?.[tier] || []).slice();
          if (!list.length) return;
          const pick = list.find((p) => p.cycle === 'MONTHLY') || list[0];
          cards.push({
            id: pick.id,
            name: pick.name || tier,
            price: pick.price,
            billing: billingLabel(pick.cycle),
            perks: pick.features || [],
            highlighted: tier === 'PREMIUM',
          });
        });
        setPlans(cards);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Could not load plans');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-surface">
      <MarketingHeader />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-gradient-soft opacity-60" />
        <div className="relative max-w-6xl mx-auto px-4 pt-24 pb-16 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-brand-400 to-pink-500 bg-clip-text text-transparent">
              Choose your plan
            </span>
          </h1>
          <p className="mt-6 text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
            Unlock more ways to connect, stand out, and grow. Every plan starts free — upgrade anytime.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-8 w-8 text-white/40" />
          </div>
        ) : error ? (
          <p className="text-center text-sm text-white/50 py-16">{error} — sign in to view plans.</p>
        ) : plans.length === 0 ? (
          <p className="text-center text-sm text-white/50 py-16">No plans available right now.</p>
        ) : (
        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-3xl border p-8 flex flex-col ${
                plan.highlighted
                  ? 'border-brand-500 bg-brand-gradient-soft shadow-glow'
                  : 'border-surface-border bg-surface-raised'
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-brand-gradient text-white text-xs font-bold shadow-glow">
                  Most Popular
                </span>
              )}

              <h3 className="text-xl font-extrabold tracking-wide text-white/90">{plan.name}</h3>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-5xl font-extrabold">${plan.price}</span>
                <span className="text-white/50 mb-1.5">/ {plan.billing}</span>
              </div>

              <ul className="mt-8 space-y-3 flex-1">
                {plan.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-3 text-sm text-white/70">
                    <span className={`mt-0.5 shrink-0 ${plan.highlighted ? 'text-brand-400' : 'text-brand-500'}`}>
                      <StarIcon size={16} />
                    </span>
                    {perk}
                  </li>
                ))}
              </ul>

              <Link
                href="/auth/login"
                className={`mt-8 inline-flex items-center justify-center px-6 py-3 rounded-2xl font-semibold transition-opacity ${
                  plan.highlighted
                    ? 'bg-brand-gradient text-white shadow-glow hover:opacity-95'
                    : 'bg-surface-overlay text-white border border-surface-border hover:border-brand-500/50'
                }`}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>
        )}

        <p className="mt-8 text-center text-sm text-white/40">
          Prices in USD. All plans include free daily matches. Upgrade or cancel anytime.
        </p>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 pb-24">
        <h2 className="text-center text-3xl md:text-4xl font-extrabold tracking-tight mb-12">
          <span className="bg-gradient-to-r from-brand-400 to-pink-500 bg-clip-text text-transparent">
            Frequently asked questions
          </span>
        </h2>
        <div className="space-y-4">
          {FAQ.map((item) => (
            <div key={item.q} className="rounded-2xl bg-surface-raised border border-surface-border p-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-semibold text-white/90">{item.q}</h3>
                <ChevronRightIcon size={18} className="text-brand-400 shrink-0" />
              </div>
              <p className="mt-3 text-sm text-white/55 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
