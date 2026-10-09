import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import MarketingHeader from '@/components/marketing/Header';
import MarketingFooter from '@/components/marketing/Footer';
import { BLOG_POSTS } from '../posts';

interface BlogPostPageProps {
  params: {
    slug: string;
  };
}

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({
    slug: post.slug,
  }));
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const post = BLOG_POSTS.find((p) => p.slug === params.slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <MarketingHeader />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-16 w-full">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 font-semibold mb-8 transition-colors text-sm"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Blog
        </Link>

        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-bold border border-brand-500/30">
              {post.category}
            </span>
            <span className="text-white/40 text-xs">{post.readTime}</span>
            <span className="text-white/40 text-xs">•</span>
            <span className="text-white/40 text-xs">{post.date}</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight tracking-tight mb-6">
            {post.title}
          </h1>

          <div className="flex items-center gap-3 py-4 border-y border-surface-border">
            <div className="h-10 w-10 rounded-full bg-brand-gradient flex items-center justify-center font-bold text-white text-sm shadow-glow">
              {post.author.name[0]}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{post.author.name}</p>
              <p className="text-xs text-white/50">{post.author.role}</p>
            </div>
          </div>
        </header>

        <article className="prose prose-invert prose-brand max-w-none space-y-6 text-white/80 leading-relaxed text-base md:text-lg">
          {post.content.map((paragraph, index) => (
            <p key={index} className="font-normal leading-relaxed">
              {paragraph}
            </p>
          ))}
        </article>

        <div className="mt-16 pt-8 border-t border-surface-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-white font-bold text-lg">Ready to make real connections?</h4>
            <p className="text-white/50 text-sm">Join millions discovering genuine friendships on VUZKI today.</p>
          </div>
          <Link
            href="/auth/register"
            className="px-6 py-3 rounded-2xl bg-brand-gradient text-white font-bold shadow-glow hover:opacity-95 transition-all text-sm shrink-0"
          >
            Get Started Free
          </Link>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
