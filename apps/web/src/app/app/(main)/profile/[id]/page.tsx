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
    <div className="px-4 pt-4 pb-4">
      <header className="flex items-center justify-between mb-4">
        <Link href="/app/home" className="p-2 -ml-2 rounded-full hover:bg-surface-overlay text-white/80"><ArrowLeftIcon /></Link>
        <h1 className="font-bold text-lg">{isOwn ? 'Your profile' : 'Profile'}</h1>
        <Link href="/app/safety" className="p-2 -mr-2 rounded-full hover:bg-surface-overlay text-white/70">
          <FlagIcon />
        </Link>
      </header>

      <div className="relative h-56 rounded-3xl overflow-hidden border border-surface-border mb-4 bg-surface-overlay">
        {src ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={src} alt={user.displayName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-bold text-brand-300 text-6xl bg-gradient-to-br from-surface-overlay to-surface-raised">
            {(user.displayName || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <div className="absolute top-3 left-3 flex gap-1.5">
          {user.isPremium && <PremiumBadge tier={user.premiumTier} />}
          {user.badges.includes('TRENDING') && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/80 text-black font-bold">🔥 Hot</span>}
        </div>
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
          <div className="flex items-center gap-2">
            <Avatar src={user.avatarUrl} name={user.displayName} size="lg" online={user.onlineStatus} verified={user.isVerified} className="ring-4 ring-black/40" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold">{user.displayName}{user.age ? `, ${user.age}` : ''}</span>
                {user.isVerified && <VerifiedIcon size={15} />}
              </div>
              <p className="text-xs text-white/80">{user.city} · Speaks {user.languages[0] || ''}</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {user.isCreator && <CreatorBadge />}
            {user.totalCoins && (
              <span className="flex items-center gap-1 text-[11px] text-amber-400">
                <CoinIcon size={13} /> {user.totalCoins.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center py-2 rounded-xl bg-surface-raised border border-surface-border">
          <p className="font-bold">{(user.followers ?? 0).toLocaleString()}</p>
          <p className="text-[11px] text-white/50">Followers</p>
        </div>
        <div className="text-center py-2 rounded-xl bg-surface-raised border border-surface-border">
          <p className="font-bold">{(user.following ?? 0).toLocaleString()}</p>
          <p className="text-[11px] text-white/50">Following</p>
        </div>
        <div className="text-center py-2 rounded-xl bg-surface-raised border border-surface-border">
          <p className="font-bold">{(user.profileViews ?? 0).toLocaleString()}</p>
          <p className="text-[11px] text-white/50">Views</p>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="font-semibold mb-1.5">About</h3>
        <p className="text-sm text-white/60 leading-relaxed">{user.bio}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {user.interests.map((it) => (
            <span key={it} className="text-[11px] px-3 py-1 rounded-full bg-surface-overlay border border-surface-border text-white/70">{it}</span>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Link href={`/app/chat/${user.id}`} className="flex-1">
          <Button variant="gradient" size="md" full icon={<ChatIcon size={18} />}>Message</Button>
        </Link>
        <Link href={`/app/call/${user.id}?type=audio&name=${encodeURIComponent(user.displayName)}`}>
          <Button variant="secondary" size="md" icon={<PhoneIcon size={18} />} className="px-4">Audio</Button>
        </Link>
        <Link href={`/app/call/${user.id}?type=video&name=${encodeURIComponent(user.displayName)}`}>
          <Button variant="secondary" size="md" icon={<VideoIcon size={18} />} className="px-4">Video</Button>
        </Link>
      </div>

      <div className="flex gap-2">
        <Link href={`/app/gifts?receiverId=${user.id}`} className="flex-1">
          <Button variant="outline" size="md" full icon={<GiftIcon size={18} />}>Send Gift</Button>
        </Link>
        <Button
          variant={following ? 'secondary' : 'primary'}
          size="md"
          full
          loading={followPending}
          onClick={toggleFollow}
        >
          {following ? 'Following' : 'Follow'}
        </Button>
      </div>

      <Link href="/app/safety" className="mt-4 flex items-center justify-center gap-1.5 text-xs text-white/40 hover:text-red-400 transition-colors">
        <FlagIcon size={13} /> Report {user.displayName}
      </Link>
    </div>
  );
}
