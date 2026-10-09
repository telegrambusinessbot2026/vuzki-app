export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string[];
  date: string;
  readTime: string;
  category: string;
  gradient: string;
  author: {
    name: string;
    role: string;
  };
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: '5-essential-safety-tips-for-new-connections',
    title: '5 Essential Safety Tips for New Connections',
    excerpt: 'Stay protected while making new friends online. From privacy settings to spotting red flags, here’s your go-to safety checklist.',
    date: 'Aug 28, 2026',
    readTime: '5 min read',
    category: 'Safety',
    gradient: 'from-brand-500 to-brand-700',
    author: {
      name: 'VUZKI Trust & Safety Team',
      role: 'Community Protection',
    },
    content: [
      'Meeting new people online should be exciting, genuine, and above all, safe. At VUZKI, our mission is to build the world’s friendliest connection platform while providing robust tools to safeguard our community.',
      '1. Keep Conversations on the Platform: When getting to know someone new, keep your messages, audio, and video calls within VUZKI. Our platform features encrypted WebRTC signaling and automated fraud detection that protect you from scams and unwanted solicitations.',
      '2. Guard Your Personal and Financial Information: Never share sensitive personal details such as your home address, financial accounts, passwords, or government identification with people you just met. VUZKI will never ask you for your password or payment details over chat.',
      '3. Use Profile Verification: Look for the verified badge on profiles. Photo verification helps ensure that the person you are communicating with matches their photos and is who they claim to be.',
      '4. Trust Your Instincts: If a conversation makes you uncomfortable or someone crosses boundaries, you can end the call or chat immediately. You have full control over who can interact with you.',
      '5. Report and Block Without Hesitation: If you experience harassment, impersonation, or abusive behavior, use our one-tap Block and Report features. Our 24/7 moderation team reviews reports promptly to keep our community safe.',
    ],
  },
  {
    slug: 'announcing-vuzki-live-rooms-2',
    title: 'Announcing VUZKI Live Rooms 2.0',
    excerpt: 'We’ve rebuilt live rooms from the ground up with crystal-clear audio, new hosting tools, and better discovery. Here’s what’s new.',
    date: 'Aug 21, 2026',
    readTime: '4 min read',
    category: 'Product',
    gradient: 'from-pink-500 to-brand-600',
    author: {
      name: 'Elena Rostova',
      role: 'Head of Product',
    },
    content: [
      'We are thrilled to unveil VUZKI Live Rooms 2.0 — our largest update yet to group real-time voice and video conversations.',
      'Over the past six months, we listened to feedback from creators and community hosts worldwide. Live Rooms 2.0 delivers unprecedented reliability, minimal latency, and rich interactivity.',
      'Ultra-Low Latency Audio: Powered by our upgraded WebRTC selective forwarding architecture, audio latency is reduced by over 40%, ensuring fluid, spontaneous conversations without awkward pauses.',
      'Host Controls and Moderation: Creators and hosts now have advanced moderation panels to manage speakers, mute disruptions, and invite audience members to the virtual stage seamlessly.',
      'Animated Gifts and Creator Earnings: Audiences can now support their favorite hosts in real-time with brand-new animated virtual gifts that credit coins directly into the creator’s wallet.',
      'Try out Live Rooms 2.0 today directly from the Live tab in your VUZKI app!',
    ],
  },
  {
    slug: 'how-creators-earn-on-vuzki',
    title: 'How Creators Earn on VUZKI: A Complete Guide',
    excerpt: 'From coins to subscriptions, learn how our creator economy works and the best strategies to grow your audience and income.',
    date: 'Aug 14, 2026',
    readTime: '8 min read',
    category: 'Creators',
    gradient: 'from-blue-500 to-brand-600',
    author: {
      name: 'Marcus Chen',
      role: 'Creator Partnerships',
    },
    content: [
      'The VUZKI Creator Economy empowers conversationalists, entertainers, coaches, and hosts to turn their charisma and expertise into a sustainable income stream.',
      'How the System Works: Creators receive virtual coins from private 1-on-1 audio and video calls, virtual gifts sent during chat or live sessions, and subscriber patronage.',
      'Creator Verification: To maintain quality and protect all participants from fraud, creator accounts undergo a formal verification review. Verified creators receive a special badge and instant access to earnings dashboards.',
      'Transparent Rates and Wallet: Every billable minute of audio and video conversation is tracked server-side with atomic precision. Your earnings accumulate in your VUZKI wallet in real time.',
      'Fast, Secure Withdrawals: Creators can request withdrawals directly through supported payment methods once minimum thresholds are met. Detailed transaction histories are always available in your dashboard.',
    ],
  },
  {
    slug: 'video-chat-etiquette-rules',
    title: 'Video Chat Etiquette: 7 Rules for Better Calls',
    excerpt: 'Nail your lighting, respect boundaries, and keep conversations flowing. These etiquette tips make every video call great.',
    date: 'Aug 7, 2026',
    readTime: '6 min read',
    category: 'Community',
    gradient: 'from-brand-600 to-pink-500',
    author: {
      name: 'Aisha Patel',
      role: 'Community Ambassador',
    },
    content: [
      'Live video calls are one of the most intimate and effective ways to build rapport online. A few simple habits can make a dramatic difference in your experience.',
      '1. Mind Your Lighting: Position light in front of your face rather than directly behind you. Natural window light or a warm desk lamp makes you look welcoming and vibrant.',
      '2. Audio Clarity: Use headphones or earbuds when possible to prevent echo and pick up your voice crisply. Check your microphone settings before initiating calls.',
      '3. Be Present: Put away distractions and make eye contact with your camera. Giving someone your full attention signals respect and creates genuine connection.',
      '4. Respect Comfort Levels: Everyone opens up at their own pace. If a match prefers audio-only initially, respect their preference.',
      '5. Keep It Positive and Courteous: Kindness goes a long way. Treat every person you meet with dignity and good cheer.',
    ],
  },
  {
    slug: 'community-stories-friendships-born-on-vuzki',
    title: 'Community Stories: Friendships Born on VUZKI',
    excerpt: 'From Mumbai to Toronto, hear heartwarming stories of real friendships and connections that started with a single hello.',
    date: 'Jul 30, 2026',
    readTime: '7 min read',
    category: 'Community',
    gradient: 'from-brand-500 to-pink-500',
    author: {
      name: 'Liam O’Connor',
      role: 'Stories Editor',
    },
    content: [
      'Every day, thousands of meaningful interactions happen across the globe on VUZKI. Here are a few remarkable stories from our community members.',
      'Bridging Continents: Priya in Mumbai and Sarah in London connected through Talk Now based on their shared passion for indie music and photography. Today, they collaborate on creative projects and exchange postcards monthly.',
      'Language Exchange: Carlos in Madrid and Kenji in Tokyo practiced conversational English and Japanese together through daily 15-minute voice calls. Both recently passed their respective fluency examinations.',
      'Have your own story to share? Reach out to our community team to be featured in our monthly community spotlight.',
    ],
  },
  {
    slug: 'creative-date-ideas-in-live-rooms',
    title: 'Creative Date Ideas to Share in Live Rooms',
    excerpt: 'Stuck on what to talk about? These fun virtual date ideas work perfectly in live rooms and private video calls.',
    date: 'Jul 23, 2026',
    readTime: '5 min read',
    category: 'Lifestyle',
    gradient: 'from-pink-500 to-pink-600',
    author: {
      name: 'Sofia Gomez',
      role: 'Lifestyle Writer',
    },
    content: [
      'Virtual dates don’t have to feel like routine check-ins. With a bit of creativity, distance disappears.',
      'Cook the Same Recipe: Pick a simple recipe with accessible ingredients, set up your camera in the kitchen, and cook together step-by-step.',
      'Playlist Exchange: Curate a five-song playlist for each other, play the tracks during your call, and share why each song resonates with you.',
      'Two Truths and a Dream: Put a fun spin on the classic icebreaker game by sharing two true life stories and one wild future dream.',
      'Virtual Museum Walkthrough: Share your screen and explore world-class galleries together, from the Louvre to the Smithsonian.',
    ],
  },
];
