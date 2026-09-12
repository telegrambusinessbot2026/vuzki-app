import Link from 'next/link';
import MarketingHeader from '@/components/marketing/Header';
import MarketingFooter from '@/components/marketing/Footer';

const POSTS = [
  {
    title: '5 Essential Safety Tips for New Connections',
    excerpt: 'Stay protected while making new friends online. From privacy settings to spotting red flags, here’s your go-to safety checklist.',
    date: 'Aug 28, 2026',
    readTime: '5 min read',
    category: 'Safety',
    gradient: 'from-brand-500 to-brand-700',
  },
  {
    title: 'Announcing VUZKI Live Rooms 2.0',
    excerpt: 'We’ve rebuilt live rooms from the ground up with crystal-clear audio, new hosting tools, and better discovery. Here’s what’s new.',
    date: 'Aug 21, 2026',
    readTime: '4 min read',
    category: 'Product',
    gradient: 'from-pink-500 to-brand-600',
  },
  {
    title: 'How Creators Earn on VUZKI: A Complete Guide',
    excerpt: 'From coins to subscriptions, learn how our creator economy works and the best strategies to grow your audience and income.',
    date: 'Aug 14, 2026',
    readTime: '8 min read',
    category: 'Creators',
    gradient: 'from-blue-500 to-brand-600',
  },
  {
    title: 'Video Chat Etiquette: 7 Rules for Better Calls',
    excerpt: 'Nail your lighting, respect boundaries, and keep conversations flowing. These etiquette tips make every video call great.',
    date: 'Aug 7, 2026',
    readTime: '6 min read',
    category: 'Community',
    gradient: 'from-brand-600 to-pink-500',
  },
  {
    title: 'Community Stories: Friendships Born on VUZKI',
    excerpt: 'From Mumbai to Toronto, hear heartwarming stories of real friendships and connections that started with a single hello.',
    date: 'Jul 30, 2026',
    readTime: '7 min read',
    category: 'Community',
    gradient: 'from-brand-500 to-pink-500',
  },
  {
    title: 'Creative Date Ideas to Share in Live Rooms',
    excerpt: 'Stuck on what to talk about? These fun virtual date ideas work perfectly in live rooms and private video calls.',
    date: 'Jul 23, 2026',
    readTime: '5 min read',
    category: 'Lifestyle',
    gradient: 'from-pink-500 to-pink-600',
  },
];

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
          {POSTS.map((post) => (
            <div
              key={post.title}
              className="rounded-3xl bg-surface-raised border border-surface-border overflow-hidden hover:border-brand-500/40 hover:shadow-glow transition-all flex flex-col"
            >
              <div className={`h-40 bg-gradient-to-br ${post.gradient} relative`}>
                <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur">
                  {post.category}
                </span>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-lg font-bold leading-snug">{post.title}</h3>
                <p className="mt-3 text-sm text-white/55 leading-relaxed flex-1">{post.excerpt}</p>
                <div className="mt-6 pt-4 border-t border-surface-border flex items-center justify-between text-xs text-white/40">
                  <span>{post.date}</span>
                  <span>{post.readTime}</span>
                </div>
              </div>
            </div>
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
              href="/auth/login"
              className="inline-flex items-center mt-8 px-8 py-4 rounded-2xl bg-white text-brand-700 font-bold shadow-lg hover:opacity-90 transition-opacity"
            >
              Subscribe Free
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
