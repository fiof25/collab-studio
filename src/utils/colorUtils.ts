const ACCENT_COLORS = [
  '#8B5CF6', // violet
  '#06B6D4', // cyan
  '#EC4899', // pink
  '#10B981', // emerald
  '#F59E0B', // amber
  '#A855F7', // purple
  '#3B82F6', // blue
  '#F97316', // orange
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function branchColorFromId(id: string): string {
  const idx = hashString(id) % ACCENT_COLORS.length;
  return ACCENT_COLORS[idx] ?? '#8B5CF6';
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1]!, 16),
        g: parseInt(result[2]!, 16),
        b: parseInt(result[3]!, 16),
      }
    : null;
}

export function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(139,92,246,${alpha})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

export function branchGradient(color: string, angle = 135): string {
  const rgb = hexToRgb(color);
  if (!rgb) return `linear-gradient(${angle}deg, ${color}, ${color})`;
  // Darken by ~30%
  const darker = `rgb(${Math.max(0, rgb.r - 50)},${Math.max(0, rgb.g - 50)},${Math.max(0, rgb.b - 50)})`;
  return `linear-gradient(${angle}deg, ${color} 0%, ${darker} 100%)`;
}
