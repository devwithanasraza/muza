import { PrismaClient, Role, UserStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Initial admin / owner user for development
  const email = 'admin@muza.ai';
  const existingUser = await prisma.user.findUnique({ where: { email } });

  let user = existingUser;
  if (!existingUser) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('MuzaAdmin123!', salt);
    user = await prisma.user.create({
      data: {
        name: 'MUZA Administrator',
        email,
        passwordHash,
        role: Role.OWNER,
        status: UserStatus.ACTIVE,
      },
    });
    console.log(`Created admin user: ${user.email} (${user.id})`);
  }

  // 2. Default Brand Profile
  if (user) {
    const existingProfile = await prisma.brandProfile.findFirst({
      where: { userId: user.id },
    });
    if (!existingProfile) {
      await prisma.brandProfile.create({
        data: {
          userId: user.id,
          brandName: 'TechVision Pulse',
          niche: 'Artificial Intelligence & Software Engineering',
          audience: 'Developers, tech enthusiasts, and digital creators looking for modern tools and workflows.',
          language: 'English',
          tone: 'Insightful, authoritative, energetic, and practical',
          descriptionStyle: 'Structured with key highlights, timestamps, and actionable takeaways.',
          captionStyle: 'Strong hook line, bullet points, question for engagement, and call-to-action.',
          defaultCTA: 'Subscribe to MUZA & drop a comment with your thoughts!',
          defaultHashtags: ['#AI', '#TechNews', '#SoftwareEngineering', '#Automation', '#Coding'],
          forbiddenWords: ['clickbait', 'scam', 'guaranteed profits', 'cheap'],
          preferredWords: ['production-grade', 'architecture', 'scalability', 'innovation'],
          emojiPolicy: 'STANDARD',
          isDefault: true,
        },
      });
      console.log('Created default Brand Profile');
    }
  }

  // 3. Default System Settings
  const defaultSettings = [
    { key: 'ai_provider', value: 'openai', description: 'Primary AI provider for video analysis and copywriting' },
    { key: 'ai_model', value: 'gpt-4o', description: 'Model identifier for analysis and copy generation' },
    { key: 'default_language', value: 'English', description: 'Default language for generated content' },
    { key: 'default_timezone', value: 'Asia/Kolkata', description: 'Application scheduling timezone' },
    { key: 'default_youtube_privacy', value: 'PRIVATE', description: 'Default privacy setting for uploaded videos' },
    { key: 'auto_processing', value: 'true', description: 'Automatically process newly discovered videos' },
    { key: 'auto_generate_content', value: 'true', description: 'Automatically generate social copy upon video processing' },
    { key: 'require_approval', value: 'true', description: 'Require user review and approval before publishing' },
    { key: 'auto_publish', value: 'false', description: 'Automatically publish approved posts (must default to false)' },
    { key: 'max_retry_limits', value: '4', description: 'Maximum retry attempts for failed publishing jobs' },
  ];

  for (const s of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: {
        key: s.key,
        value: s.value,
        description: s.description,
      },
    });
  }

  // 4. Default Seed Hashtags for Hashtag Engine
  const defaultTags = [
    { tag: 'AIAutomation', category: 'primary', relevanceScore: 0.95 },
    { tag: 'SoftwareArchitecture', category: 'niche', relevanceScore: 0.9 },
    { tag: 'DevCommunity', category: 'audience', relevanceScore: 0.85 },
    { tag: 'TechReels', category: 'discovery', relevanceScore: 0.88 },
    { tag: 'MuzaAI', category: 'brand', relevanceScore: 1.0 },
    { tag: 'FullStack', category: 'niche', relevanceScore: 0.82 },
    { tag: 'CloudComputing', category: 'primary', relevanceScore: 0.89 },
  ];

  for (const t of defaultTags) {
    await prisma.hashtag.upsert({
      where: { tag: t.tag },
      update: {},
      create: {
        tag: t.tag,
        category: t.category,
        relevanceScore: t.relevanceScore,
        source: 'curated',
      },
    });
  }

  console.log('✅ Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
