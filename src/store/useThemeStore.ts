import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface ThemeStore {
  theme: Theme;
  toggle: () => void;
}

// Apply the saved theme immediately (before React renders)
const saved = (localStorage.getItem('theme') as Theme) ?? 'dark';
if (saved === 'light') document.documentElement.classList.add('light');

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: saved,
  toggle: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    if (next === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('theme', next);
    set({ theme: next });
  },
}));
