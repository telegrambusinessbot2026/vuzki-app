import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  DEFAULT_INTERESTS,
  SUPPORTED_LANGUAGES,
  GiftStatus,
  SubscriptionCycle,
  PremiumTier,
} from '@vuzki/shared';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

async function hash(pw: string) {
  return bcrypt.hash(pw, SALT_ROUNDS);
}

const gifts = [
  { name: 'Heart', priceCoins: 10, category: 'love', image: '/gifts/heart.svg', animation: '/gifts/heart-anim.svg' },
  { name: 'Rose', priceCoins: 25, category: 'love', image: '/gifts/rose.svg', animation: '/gifts/rose-anim.svg' },
  { name: 'Star', priceCoins: 40, category: 'general', image: '/gifts/star.svg', animation: '/gifts/star-anim.svg' },
  { name: 'Crown', priceCoins: 100, category: 'premium', image: '/gifts/crown.svg', animation: '/gifts/crown-anim.svg' },
  { name: 'Fire', priceCoins: 150, category: 'hot', image: '/gifts/fire.svg', animation: '/gifts/fire-anim.svg' },
  { name: 'Diamond', priceCoins: 300, category: 'premium', image: '/gifts/diamond.svg', animation: '/gifts/diamond-anim.svg' },
  { name: 'Thumbs Up', priceCoins: 5, category: 'general', image: '/gifts/thumbsup.svg', animation: '/gifts/thumbsup-anim.svg' },
  { name: 'Party', priceCoins: 200, category: 'celebration', image: '/gifts/party.svg', animation: '/gifts/party-anim.svg' },
];

const coinPackages = [
  { name: 'Starter', coins: 100, bonusCoins: 0, price: 25.0 },
  { name: 'Popular', coins: 500, bonusCoins: 50, price: 120.0, isPopular: true },
  { name: 'Pro', coins: 1000, bonusCoins: 150, price: 230.0 },
  { name: 'Mega', coins: 5000, bonusCoins: 1000, price: 1100.0 },
];

const subscriptionPlans = [
  { tier: PremiumTier.PLUS, cycle: SubscriptionCycle.MONTHLY, name: 'VUZKI Plus Monthly', price: 199.0, features: { discovery: 'extended', calls: 100, boosts: 2, superLikes: 10 } },
  { tier: PremiumTier.PLUS, cycle: SubscriptionCycle.YEARLY, name: 'VUZKI Plus Yearly', price: 1990.0, features: { discovery: 'extended', calls: 1200, boosts: 24, superLikes: 120 } },
  { tier: PremiumTier.PREMIUM, cycle: SubscriptionCycle.MONTHLY, name: 'VUZKI Premium Monthly', price: 499.0, features: { priority: true, unlimitedCalls: true, boosts: 6, superLikes: 30, badge: true } },
  { tier: PremiumTier.PREMIUM, cycle: SubscriptionCycle.YEARLY, name: 'VUZKI Premium Yearly', price: 4990.0, features: { priority: true, unlimitedCalls: true, boosts: 72, superLikes: 360, badge: true } },
  { tier: PremiumTier.VIP, cycle: SubscriptionCycle.MONTHLY, name: 'VUZKI VIP Monthly', price: 1499.0, features: { exclusive: true, support: 'priority', boosts: 20, superLikes: 100, badge: true, placement: true } },
  { tier: PremiumTier.VIP, cycle: SubscriptionCycle.YEARLY, name: 'VUZKI VIP Yearly', price: 14900.0, features: { exclusive: true, support: 'priority', boosts: 240, superLikes: 1200, badge: true, placement: true } },
];

async function main() {
  console.log('Seeding database...');

  // Create demo users
  const pw = await hash('Vuzki@12345');

  const demoUsers = [
    {
      username: 'demo_ananya',
      displayName: 'Ananya',
      email: 'demo_ananya@vuzki.app',
      gender: 'FEMALE',
      isCreator: true,
      creatorStatus: 'AVAILABLE',
      bio: 'Singer & storyteller. Here to chat and connect.',
    },
    {
      username: 'demo_arjun',
      displayName: 'Arjun',
      email: 'demo_arjun@vuzki.app',
      gender: 'MALE',
      isCreator: true,
      creatorStatus: 'AVAILABLE',
      bio: 'Cricket lover, foodie, always up for fun conversations.',
    },
    {
      username: 'demo_meera',
      displayName: 'Meera',
      email: 'demo_meera@vuzki.app',
      gender: 'FEMALE',
      bio: 'Travel photographer exploring new places.',
    },
    {
      username: 'demo_vaishnav',
      displayName: 'Vaishnav',
      email: 'demo_vaishnav@vuzki.app',
      gender: 'MALE',
      isVerified: true,
      bio: 'Coffee enthusiast and movie buff.',
    },
    {
      username: 'demo_reyansh',
      displayName: 'Reyansh',
      email: 'demo_reyansh@vuzki.app',
      gender: 'MALE',
      isCreator: true,
      creatorStatus: 'BUSY',
      bio: 'Listener. Here to lend an ear.',
    },
  ];

  const created = [];
  for (const du of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: du.email! },
      update: {},
      create: {
        email: du.email,
        emailVerified: true,
        passwordHash: pw,
        username: du.username,
        displayName: du.displayName,
        gender: du.gender,
        bio: du.bio,
        isCreator: du.isCreator ?? false,
        creatorStatus: du.creatorStatus,
        isVerified: du.isVerified ?? false,
        onboardingStep: 'COMPLETE',
        status: 'ACTIVE',
        wallet: { create: { balance: 1000 } },
        profile: { create: { interests: ['Music', 'Travel', 'Food'], languages: ['en'] } },
      },
    });
    created.push(user);
  }

  // Coin packages
  for (const p of coinPackages) {
    await prisma.coinPackage.upsert({
      where: { id: p.name },
      update: {},
      create: {
        id: p.name,
        name: p.name,
        coins: p.coins,
        bonusCoins: p.bonusCoins,
        price: p.price,
        isPopular: p.isPopular ?? false,
      },
    });
  }

  // Gifts
  for (const g of gifts) {
    await prisma.gift.upsert({
      where: { id: g.name },
      update: {},
      create: {
        id: g.name,
        name: g.name,
        priceCoins: g.priceCoins,
        category: g.category,
        imageUrl: g.image,
        animationUrl: g.animation,
        status: GiftStatus.ACTIVE,
      },
    });
  }

  // Subscription plans
  for (const sp of subscriptionPlans) {
    await prisma.subscriptionPlan.upsert({
      where: { tier_cycle: { tier: sp.tier, cycle: sp.cycle } },
      update: {},
      create: { ...sp, features: sp.features as unknown as object },
    });
  }

  // Admin
  await prisma.admin.upsert({
    where: { email: 'admin@vuzki.app' },
    update: {},
    create: {
      email: 'admin@vuzki.app',
      passwordHash: await hash('Admin@12345'),
      name: 'VUZKI Super Admin',
      role: 'SUPER_ADMIN',
    },
  });

  console.log(`Created ${created.length} demo users, gifts, packages, plans, admin.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
