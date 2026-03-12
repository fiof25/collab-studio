const configs = {
  claude: {
    provider: 'claude',
    get apiKey() { return process.env.ANTHROPIC_API_KEY; },
    models: {
      large: 'claude-opus-4-6',
      small: 'claude-haiku-4-5-20251001',
    },
  },
  gemini: {
    provider: 'gemini',
    get apiKey() { return process.env.GEMINI_API_KEY; },
    models: {
      large: 'gemini-3.1-pro-preview',
      small: 'gemini-3.1-flash-lite-preview',
    },
  },
};

/** Lazy proxy — all reads resolve after dotenv has loaded .env */
export const config = new Proxy({}, {
  get(_target, prop) {
    const provider = (process.env.AI_PROVIDER ?? 'claude').toLowerCase();
    const active = configs[provider] ?? configs.claude;
    return active[prop];
  },
});
