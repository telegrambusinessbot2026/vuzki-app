import Link from 'next/link';
import MarketingHeader from '@/components/marketing/Header';
import MarketingFooter from '@/components/marketing/Footer';
import { BLOG_POSTS } from './posts';

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-surface">
      <MarketingHeader />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-gradient-soft opacity-60" />
        <div className="relative max-w-6xl mx-auto px-4 pt-24 pb-16 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-brand-400 to-pink-500 bg-clip-text text-transparent">
              The VUZKI Blog
            </span>
          </h1>
          <p className="mt-6 text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
            Stories, tips, and product updates from the team behind the world’s friendliest connection platform.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {BLOG_POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="rounded-3xl bg-surface-raised border border-surface-border overflow-hidden hover:border-brand-500/50 hover:shadow-glow transition-all flex flex-col group"
            >
              <div className={`h-40 bg-gradient-to-br ${post.gradient} relative overflow-hidden`}>
                <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur">
                  {post.category}
                </span>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-lg font-bold leading-snug group-hover:text-brand-300 transition-colors">
                  {post.title}
                </h3>
                <p className="mt-3 text-sm text-white/55 leading-relaxed flex-1">
                  {post.excerpt}
                </p>
                <div className="mt-6 pt-4 border-t border-surface-border flex items-center justify-between text-xs text-white/40">
                  <span>{post.date}</span>
                  <span>{post.readTime}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-24">
        <div className="relative rounded-3xl overflow-hidden bg-brand-gradient p-10 md:p-14 text-center shadow-glow">
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">Stay in the loop</h2>
            <p className="mt-3 text-white/85 max-w-xl mx-auto">Get the latest VUZKI news, tips, and community stories delivered to your inbox.</p>
            <Link
              href="/auth/register"
              className="inline-flex items-center mt-8 px-8 py-4 rounded-2xl bg-white text-brand-700 font-bold shadow-lg hover:opacity-90 transition-opacity"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
