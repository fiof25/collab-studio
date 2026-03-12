import { useState, useEffect } from 'react';

interface AIConfig {
  provider: string;
  models: { large: string; small: string };
  mock: boolean;
}

const DEFAULT: AIConfig = { provider: 'claude', models: { large: 'claude-sonnet-4-6', small: 'claude-haiku-4-5' }, mock: true };

let cached: AIConfig | null = null;

export function useAIConfig() {
  const [config, setConfig] = useState<AIConfig>(cached ?? DEFAULT);

  useEffect(() => {
    if (cached) return;
    fetch('/api/config')
      .then((r) => r.json())
      .then((data: AIConfig) => {
        cached = data;
        setConfig(data);
      })
      .catch(() => {}); // server not running — keep defaults
  }, []);

  return config;
}
