'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, mediaUrl } from '@/lib/api';
import { mapUser } from '@/lib/api-users';
import type { FeedUser, PublicUser } from '@/lib/api-users';
import { useAuth } from '@/lib/auth-context';
import { Avatar, VerifiedIcon, PremiumBadge, CreatorBadge } from '@/components/ui/Avatar';
import { Button, Spinner } from '@/components/ui/Button';
import { ArrowLeftIcon, FlagIcon, CoinIcon, PhoneIcon, VideoIcon, GiftIcon, ChatIcon } from '@/components/ui/Icons';

export default function OtherProfilePage() {
  const params = useParams();
  const id = String(params.id);
  const { user: me } = useAuth();
  const [user, setUser] = useState<FeedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [following, setFollowing] = useState(false);
  const [followPending, setFollowPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api<{ user: PublicUser }>(`/users/${id}`, { auth: true })
      .then((data) => {
        if (cancelled) return;
        setUser(mapUser(data.user));
        setFollowing(!!data.user.isFollowing);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Could not load profile');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const toggleFollow = async () => {
    if (!user) return;
    setFollowPending(true);
    try {
      if (following) {
        const r = await api<{ followers?: number }>(`/users/${user.id}/follow`, { method: 'DELETE', auth: true });
        setFollowing(false);
        setUser((prev) => (prev ? { ...prev, followers: r.followers ?? prev.followers } : prev));
      } else {
        const r = await api<{ followers?: number }>(`/users/${user.id}/follow`, { method: 'POST', auth: true });
        setFollowing(true);
        setUser((prev) => (prev ? { ...prev, followers: r.followers ?? prev.followers } : prev));
      }
    } catch {
      /* server rejected the toggle - keep the current state */
    } finally {
      setFollowPending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-6 w-6 text-white/50" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="px-4 pt-4 pb-4">
        <header className="flex items-center justify-between mb-4">
          <Link href="/app/home" className="p-2 -ml-2 rounded-full hover:bg-surface-overlay text-white/80"><ArrowLeftIcon /></Link>
          <h1 className="font-bold text-lg">Profile</h1>
          <div className="w-9" />
        </header>
        <div className="py-20 text-center">
          <p className="font-semibold">Profile unavailable</p>
          <p className="text-sm text-white/50 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const isOwn = !!me && me.id === id;
  const src = mediaUrl(user.avatarUrl);

  return (
    <div className="relative min-h-dvh bg-[#0a0a0c] pb-[100px]">
      {/* Immersive Header Image */}
      <div className="relative h-[400px] w-full">
        {src ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={src} alt={user.displayName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-bold text-brand-300 text-6xl bg-gradient-to-br from-surface-overlay to-surface-raised">
            {(user.displayName || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-black/30 to-transparent" />
        
        <div className="absolute top-0 inset-x-0 pt-safe px-4 py-3 flex items-center justify-between z-10">
          <Link href="/app/home" className="h-10 w-10 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white hover:bg-black/50 active:scale-95 transition-all"><ArrowLeftIcon size={18} /></Link>
          <Link href="/app/safety" className="h-10 w-10 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white/70 hover:text-red-400 active:scale-95 transition-all">
            <FlagIcon size={18} />
          </Link>
        </div>

        <div className="absolute bottom-6 left-5 right-5 flex flex-col justify-end">
          <div className="flex gap-2 mb-3">
            {user.isPremium && <PremiumBadge tier={user.premiumTier} />}
            {user.badges.includes('TRENDING') && <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-500 text-black font-bold tracking-wider uppercase shadow-glow">🔥 Hot</span>}
            {user.isCreator && <CreatorBadge />}
          </div>
          
          <div className="flex items-center gap-4">
             <Avatar src={user.avatarUrl} name={user.displayName} size="xl" online={user.onlineStatus} verified={user.isVerified} className="ring-4 ring-black/40 shadow-xl" />
             <div>
               <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-md">{user.displayName}{user.age ? `, ${user.age}` : ''}</h1>
               <p className="text-sm text-white/80 font-medium drop-shadow-sm flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-400"></span>
                  {user.city} · Speaks {user.languages[0] || ''}
               </p>
             </div>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-2 relative z-10">
        {/* Action Buttons */}
        <div className="flex gap-2 mb-6">
          <Link href={`/app/chat/${user.id}`} className="flex-1">
            <Button variant="gradient" size="md" full icon={<ChatIcon size={18} />} className="shadow-glow">Message</Button>
          </Link>
          <Link href={`/app/call/${user.id}?type=video&name=${encodeURIComponent(user.displayName)}`}>
             <button className="h-[46px] w-[46px] rounded-2xl glass flex items-center justify-center text-white border-white/10 active:scale-95 transition-transform"><VideoIcon size={20} /></button>
          </Link>
          <Link href={`/app/call/${user.id}?type=audio&name=${encodeURIComponent(user.displayName)}`}>
             <button className="h-[46px] w-[46px] rounded-2xl glass flex items-center justify-center text-white border-white/10 active:scale-95 transition-transform"><PhoneIcon size={20} /></button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="text-center py-3 rounded-2xl bg-surface-raised border border-transparent">
            <p className="text-lg font-bold text-white">{(user.followers ?? 0).toLocaleString()}</p>
            <p className="text-[10px] uppercase font-bold tracking-wider text-white/40 mt-0.5">Followers</p>
          </div>
          <div className="text-center py-3 rounded-2xl bg-surface-raised border border-transparent">
            <p className="text-lg font-bold text-white">{(user.following ?? 0).toLocaleString()}</p>
            <p className="text-[10px] uppercase font-bold tracking-wider text-white/40 mt-0.5">Following</p>
          </div>
          <div className="text-center py-3 rounded-2xl bg-surface-raised border border-transparent">
            <p className="text-lg font-bold text-white">{(user.profileViews ?? 0).toLocaleString()}</p>
            <p className="text-[10px] uppercase font-bold tracking-wider text-white/40 mt-0.5">Views</p>
          </div>
        </div>

        {/* About */}
        <div className="mb-8">
          <h3 className="font-bold text-lg mb-2">About</h3>
          <p className="text-sm text-white/70 leading-relaxed font-medium">{user.bio}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {user.interests.map((it) => (
              <span key={it} className="text-[11px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/80">{it}</span>
            ))}
          </div>
        </div>

        {/* Interactions */}
        <div className="flex gap-3">
          <Link href={`/app/gifts?receiverId=${user.id}`} className="flex-1">
            <Button variant="secondary" size="md" full icon={<GiftIcon size={18} />} className="bg-surface-raised border-transparent">Gift</Button>
          </Link>
          <div className="flex-[2]">
            <Button
              variant={following ? 'secondary' : 'primary'}
              size="md"
              full
              loading={followPending}
              onClick={toggleFollow}
              className={following ? 'bg-surface-raised border-transparent text-brand-300' : 'shadow-glow'}
            >
              {following ? 'Following' : 'Follow'}
            </Button>
          </div>
        </div>
        
        <div className="mt-8 flex justify-center">
           {user.totalCoins && (
             <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full glass-panel border border-amber-500/20 text-amber-400 font-bold text-sm shadow-glass">
                <CoinIcon size={16} /> {(user.totalCoins || 0).toLocaleString()} coins earned
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
