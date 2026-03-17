import 'dotenv/config';

export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'development-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  auth: {
    apiKey: process.env.AUTH_API_KEY || '',
  },  
  hugging: {
    apiKey: process.env.HUGGINGFACE_API_KEY || '',
    model: 'moonshotai/Kimi-K2-Instruct:novita'
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
    timeout: parseInt(process.env.ANTHROPIC_TIMEOUT || '30000', 10),
  },
  rateLimit: {
    limit: parseInt(process.env.RATE_LIMIT || '10', 10),
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60000', 10),
  },
  nutrition: {
    maxPendingRequestsPerClient: parseInt(
      process.env.NUTRITION_MAX_PENDING_REQUESTS_PER_CLIENT || '3',
      10,
    ),
    defaultLanguage: process.env.NUTRITION_DEFAULT_LANGUAGE || 'es',
  },
});
