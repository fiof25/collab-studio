import { Check } from 'lucide-react';
import { clsx } from 'clsx';
import type { BlueprintFeature } from '@/types/blueprint';

interface FeatureOverlayProps {
  features: BlueprintFeature[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}

/**
 * Renders clickable regions on top of a source prototype iframe.
 * Each feature occupies an equal vertical band. In Phase 4, these will
 * be positioned via real DOM selector analysis from the Scout agent.
 */
export function FeatureOverlay({ features, selectedIds, onToggle }: FeatureOverlayProps) {
  if (!features.length) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {features.map((feature, index) => {
        const top = (index / features.length) * 100;
        const height = (1 / features.length) * 100;
        const isSelected = selectedIds.has(feature.id);
        const label = feature.visualRegion?.label ?? feature.name;

        return (
          <div
            key={feature.id}
            onClick={() => onToggle(feature.id)}
            className="absolute left-0 right-0 pointer-events-auto cursor-pointer group"
            style={{ top: `${top}%`, height: `${height}%` }}
          >
            {/* Region highlight */}
            <div
              className={clsx(
                'absolute inset-0 border-2 transition-all duration-150',
                isSelected
                  ? 'border-accent-violet/70 bg-accent-violet/12'
                  : 'border-transparent group-hover:border-white/50 group-hover:bg-white/8'
              )}
            />

            {/* Label badge — always visible when selected, on-hover otherwise */}
            <div
              className={clsx(
                'absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold select-none transition-all',
                isSelected
                  ? 'bg-accent-violet text-white opacity-100 shadow-sm'
                  : 'bg-black/65 text-white/90 opacity-0 group-hover:opacity-100'
              )}
            >
              {isSelected && <Check size={8} className="flex-shrink-0" />}
              {label}
            </div>

            {/* Separator line between bands */}
            {index < features.length - 1 && (
              <div className="absolute bottom-0 left-2 right-2 h-px bg-white/10 pointer-events-none" />
            )}
          </div>
        );
      })}
    </div>
  );
}
