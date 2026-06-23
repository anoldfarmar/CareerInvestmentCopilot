const DEFAULT_JWT_SECRETS = new Set([
  'replace-with-a-random-secret',
  'your-jwt-secret',
  'secret',
]);

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(`缺少必需环境变量：${name}`);
  }
  return value;
}

function normalizeDeepseekApiKey() {
  const canonicalKey = process.env.DEEPSEEK_API_KEY?.trim();
  const legacyKey = process.env.Deepseek_API_KEY?.trim();

  if (canonicalKey) {
    return canonicalKey;
  }

  if (legacyKey) {
    process.env.DEEPSEEK_API_KEY = legacyKey;
    console.warn(
      '[env] 检测到旧环境变量 Deepseek_API_KEY，已临时兼容。建议改为 DEEPSEEK_API_KEY。',
    );
    return legacyKey;
  }

  throw new Error('缺少必需环境变量：DEEPSEEK_API_KEY');
}

export function validateEnv() {
  requireEnv('DATABASE_URL');
  const jwtSecret = requireEnv('JWT_SECRET');
  normalizeDeepseekApiKey();

  if (jwtSecret.length < 24) {
    throw new Error('JWT_SECRET 长度至少需要 24 个字符');
  }

  if (process.env.NODE_ENV === 'production') {
    if (DEFAULT_JWT_SECRETS.has(jwtSecret)) {
      throw new Error('生产环境禁止使用默认 JWT_SECRET');
    }
  }
}
