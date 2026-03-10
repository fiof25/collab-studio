import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, ChevronRight, Loader2, FileCode } from 'lucide-react';
import { useProjectStore } from '@/store/useProjectStore';
import type { Blueprint, BlueprintFeature } from '@/types/blueprint';
import type { ProjectFile } from '@/types/branch';

interface BlueprintPanelProps {
  branchId: string;
  accentColor: string;
}

const SERVER_URL = 'http://localhost:3001';

function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{3,8}$/.test(value.trim());
}

function FeatureRow({ feature }: { feature: BlueprintFeature }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg bg-surface-2 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-3 transition-colors"
      >
        {open ? <ChevronDown size={11} className="text-ink-muted flex-shrink-0" /> : <ChevronRight size={11} className="text-ink-muted flex-shrink-0" />}
        <span className="text-xs font-medium text-ink-primary truncate">{feature.name}</span>
      </button>
      {open && (
        <div className="px-3 pb-2.5 space-y-2 border-t border-line/50">
          <p className="text-xs text-ink-secondary leading-relaxed pt-2">{feature.description}</p>
          {feature.files.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {feature.files.map((f) => (
                <span key={f} className="text-[10px] font-mono bg-surface-0 text-ink-muted rounded px-1.5 py-0.5 border border-line">
                  {f}
                </span>
              ))}
            </div>
          )}
          {feature.dependencies.length > 0 && (
            <p className="text-[10px] text-ink-muted">
              Depends on: {feature.dependencies.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[10px] font-semibold text-ink-muted uppercase tracking-widest mb-2">{title}</h4>
      {children}
    </div>
  );
}

export function BlueprintPanel({ branchId, accentColor }: BlueprintPanelProps) {
  const branch = useProjectStore((s) => s.project?.branches.find((b) => b.id === branchId));
  const getBranchById = useProjectStore((s) => s.getBranchById);
  const updateBlueprint = useProjectStore((s) => s.updateBlueprint);
  const updateBranch = useProjectStore((s) => s.updateBranch);
  const [generating, setGenerating] = useState(false);
  const generatingRef = useRef(false);

  const blueprint: Blueprint | null | undefined = branch?.blueprint;
  const latestCheckpoint = branch?.checkpoints.at(-1);
  const latestFiles: ProjectFile[] | undefined = latestCheckpoint?.files;
  const isDrift =
    blueprint?.generatedAt !== undefined &&
    latestCheckpoint?.timestamp !== undefined &&
    blueprint.generatedAt < latestCheckpoint.timestamp;

  // Build effective files array, falling back to codeSnapshot for legacy mock branches
  const effectiveFiles: ProjectFile[] =
    latestFiles?.length
      ? latestFiles
      : latestCheckpoint?.codeSnapshot
        ? [{ path: 'index.html', content: latestCheckpoint.codeSnapshot, language: 'html' }]
        : [];

  const generate = useCallback(async () => {
    if (!branch || !effectiveFiles.length || generatingRef.current) return;
    generatingRef.current = true;
    setGenerating(true);

    try {
      const parentBranch = branch.parentId ? getBranchById(branch.parentId) : undefined;

      const [bpRes, snapRes] = await Promise.allSettled([
        fetch(`${SERVER_URL}/api/blueprint/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            branchId,
            branchName: branch.name,
            parentBranchName: parentBranch?.name,
            files: effectiveFiles,
          }),
        }).then((r) => r.json()),
        fetch(`${SERVER_URL}/api/blueprint/snapshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ branchId, branchName: branch.name, files: effectiveFiles }),
        }).then((r) => r.json()),
      ]);

      if (bpRes.status === 'fulfilled' && bpRes.value?.success) {
        updateBlueprint(branchId, bpRes.value.blueprint);
      }
      if (snapRes.status === 'fulfilled' && snapRes.value?.success && snapRes.value.description && !branch.descriptionPinned) {
        updateBranch(branchId, { description: snapRes.value.description });
      }
    } catch {
      // Server not running — silently skip
    } finally {
      generatingRef.current = false;
      setGenerating(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, branchId, effectiveFiles.length]);

  // Auto-generate whenever there's no blueprint or the code has changed since last generation
  useEffect(() => {
    if (!effectiveFiles.length || generatingRef.current) return;
    if (!blueprint || isDrift) {
      generate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!blueprint, isDrift, latestCheckpoint?.id]);

  // No code yet
  if (!effectiveFiles.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
        <FileCode size={28} className="text-ink-muted opacity-40" />
        <p className="text-xs text-ink-muted leading-relaxed">
          Chat with AI to generate code first, then the Blueprint Agent will analyze the result.
        </p>
      </div>
    );
  }

  // No blueprint yet — show loading while auto-generating
  if (!blueprint) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
        <Loader2 size={20} className="text-ink-muted animate-spin" />
        <p className="text-xs text-ink-muted">Analyzing blueprint…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-line flex-shrink-0 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-semibold text-ink-primary truncate">{blueprint.title}</p>
            {isDrift && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium flex-shrink-0">
                Outdated
              </span>
            )}
          </div>
          <p className="text-[11px] text-ink-muted leading-relaxed mt-0.5">{blueprint.summary}</p>
        </div>
        {generating && (
          <Loader2 size={12} className="animate-spin text-ink-muted flex-shrink-0" />
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* Purpose */}
        {blueprint.purpose && (
          <Section title="Purpose">
            <p className="text-xs text-ink-secondary leading-relaxed">{blueprint.purpose}</p>
          </Section>
        )}

        {/* Features */}
        {blueprint.features.length > 0 && (
          <Section title="Features">
            <div className="space-y-1.5">
              {blueprint.features.map((f) => (
                <FeatureRow key={f.id} feature={f} />
              ))}
            </div>
          </Section>
        )}

        {/* Tech Stack */}
        {blueprint.techStack.length > 0 && (
          <Section title="Tech Stack">
            <div className="flex flex-wrap gap-1.5">
              {blueprint.techStack.map((t) => (
                <span
                  key={t}
                  className="text-[11px] bg-surface-2 text-ink-secondary px-2 py-0.5 rounded-full border border-line"
                >
                  {t}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Design Tokens */}
        {Object.keys(blueprint.designTokens).length > 0 && (
          <Section title="Design Tokens">
            <div className="space-y-1.5">
              {Object.entries(blueprint.designTokens).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  {isHexColor(value) && (
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-line/60 flex-shrink-0"
                      style={{ background: value }}
                    />
                  )}
                  <span className="text-[11px] text-ink-muted capitalize">{key}:</span>
                  <span className="text-[11px] font-mono text-ink-secondary">{value}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* File Structure */}
        {blueprint.fileStructure.length > 0 && (
          <Section title="File Structure">
            <div className="space-y-1">
              {blueprint.fileStructure.map((f) => (
                <div key={f.path} className="flex items-start gap-2">
                  <span className="text-[10px] font-mono bg-surface-2 text-ink-muted rounded px-1.5 py-0.5 border border-line flex-shrink-0 mt-0.5">
                    {f.path}
                  </span>
                  <span className="text-[11px] text-ink-muted leading-snug">{f.description}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Change History */}
        {blueprint.changeHistory.length > 0 && (
          <Section title="Change History">
            <ol className="space-y-1">
              {blueprint.changeHistory.map((entry, i) => (
                <li key={i} className="text-[11px] text-ink-muted flex gap-2">
                  <span className="text-ink-muted/50 flex-shrink-0">{i + 1}.</span>
                  <span>{entry}</span>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* Parent */}
        {blueprint.parent && (
          <Section title="Parent">
            <p className="text-[11px] text-ink-secondary">
              Branched from <span className="font-medium text-ink-primary">{blueprint.parent.branch}</span>
              {' '}— {blueprint.parent.relationship}
            </p>
          </Section>
        )}

      </div>
    </div>
  );
}
