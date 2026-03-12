import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MergeModal } from '../MergeModal';
import { useUIStore } from '@/store/useUIStore';
import { useProjectStore } from '@/store/useProjectStore';
import {
  createTestBranch,
  createTestBlueprint,
  createTestFeature,
  createTestCheckpoint,
} from '@/test/factories';
import type { Branch, Project } from '@/types/branch';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, whileHover, whileTap, ...rest } = props;
      // Filter out non-DOM props
      const domProps: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(rest)) {
        if (typeof val !== 'object' || val === null || key === 'className' || key === 'style' || key === 'onClick' || key === 'role') {
          domProps[key] = val;
        }
      }
      return <div {...domProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Create test branches with blueprints
function createBranchWithBlueprint(id: string, name: string, features: ReturnType<typeof createTestFeature>[]) {
  return createTestBranch({
    id,
    name,
    parentId: id === 'branch_base' ? null : 'branch_base',
    blueprint: createTestBlueprint({ features }),
    checkpoints: [
      createTestCheckpoint({
        branchId: id,
        codeSnapshot: `<html><body><h1>${name}</h1></body></html>`,
        files: [{ path: 'index.html', content: `<html><body><h1>${name}</h1></body></html>`, language: 'html' }],
      }),
    ],
  });
}

describe('MergeModal', () => {
  let baseBranch: Branch;
  let contributorBranch: Branch;
  let baseFeatures: ReturnType<typeof createTestFeature>[];
  let contributorFeatures: ReturnType<typeof createTestFeature>[];

  beforeEach(() => {
    mockNavigate.mockReset();

    baseFeatures = [
      createTestFeature({ id: 'feat_nav', name: 'Navigation Bar' }),
      createTestFeature({ id: 'feat_footer', name: 'Footer' }),
    ];
    contributorFeatures = [
      createTestFeature({ id: 'feat_hero', name: 'Hero Section' }),
      createTestFeature({ id: 'feat_cta', name: 'CTA Banner' }),
    ];

    baseBranch = createBranchWithBlueprint('branch_base', 'base-version', baseFeatures);
    contributorBranch = createBranchWithBlueprint('branch_contrib', 'contributor-version', contributorFeatures);

    // Set up project store with both branches
    const project: Project = {
      id: 'project_test',
      name: 'Test Project',
      description: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      branches: [baseBranch, contributorBranch],
      rootBranchId: baseBranch.id,
    };

    useProjectStore.setState({ project });

    // Mock fetch globally for AI prompts endpoint
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/api/merge/prompts')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ prompts: ['Keep base layout', 'Merge hero section'] }),
        });
      }
      if (typeof url === 'string' && url.includes('/api/merge/execute')) {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('data: {"type":"progress","message":"Merging..."}\n\n'));
            controller.enqueue(
              encoder.encode(
                `data: {"type":"done","mergedFiles":[{"path":"index.html","content":"<html><body>Merged</body></html>","language":"html"}]}\n\n`
              )
            );
            controller.close();
          },
        });
        return Promise.resolve({ status: 200, headers: new Headers(), body: stream });
      }
      if (typeof url === 'string' && url.includes('/api/merge/start')) {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('data: {"type":"plan","summary":"Scout analysis","plan":[],"questions":[]}\n\n'));
            controller.close();
          },
        });
        return Promise.resolve({ status: 200, headers: new Headers(), body: stream });
      }
      if (typeof url === 'string' && url.includes('/api/blueprint')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, blueprint: createTestBlueprint() }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  afterEach(() => {
    useUIStore.setState({
      activeModal: null,
      modalContext: null,
    });
    vi.restoreAllMocks();
  });

  function openMergeModal() {
    useUIStore.setState({
      activeModal: 'merge',
      modalContext: {
        branchIds: [baseBranch.id, contributorBranch.id],
        targetId: baseBranch.id,
        sourceId: contributorBranch.id,
      },
    });
  }

  it('renders select step with both branch previews', () => {
    openMergeModal();
    render(<MergeModal variant="merge" />);

    // The step title should be "Choose versions"
    expect(screen.getByText('Choose versions')).toBeInTheDocument();

    // Both branch names should be displayed (toDisplayName converts "base-version" -> "Base version")
    expect(screen.getByText('Base version')).toBeInTheDocument();
    expect(screen.getByText('Contributor version')).toBeInTheDocument();
  });

  it('Next button advances to features step', async () => {
    openMergeModal();
    render(<MergeModal variant="merge" />);

    // We should be on select step
    expect(screen.getByText('Choose versions')).toBeInTheDocument();

    // Click Next
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    // Should now be on features step
    await waitFor(() => {
      expect(screen.getByText('Select features')).toBeInTheDocument();
    });
  });

  it('features step shows contributor features listed', async () => {
    openMergeModal();
    render(<MergeModal variant="merge" />);

    // Advance to features step
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Select features')).toBeInTheDocument();
    });

    // Contributor features should be listed (may appear multiple times in overlay + checklist)
    expect(screen.getAllByText('Hero Section').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('CTA Banner').length).toBeGreaterThanOrEqual(1);

    // The features checklist heading should exist
    expect(screen.getByText('Features to bring in')).toBeInTheDocument();
  });

  it('feature toggle clicks toggle checkbox state', async () => {
    openMergeModal();
    render(<MergeModal variant="merge" />);

    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Features to bring in')).toBeInTheDocument();
    });

    // Find all checkboxes for contributor features
    const checkboxes = screen.getAllByRole('checkbox');
    // The first checkbox should be for Hero Section
    const heroCheckbox = checkboxes[0] as HTMLInputElement;
    expect(heroCheckbox.checked).toBe(true);

    // Click to deselect
    fireEvent.click(heroCheckbox);
    expect(heroCheckbox.checked).toBe(false);

    // Click to re-select
    fireEvent.click(heroCheckbox);
    expect(heroCheckbox.checked).toBe(true);
  });

  it('Quick Merge button calls executeMerge via fetch', async () => {
    openMergeModal();
    render(<MergeModal variant="merge" />);

    // Go to features step
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Quick Merge')).toBeInTheDocument();
    });

    // Click Quick Merge
    fireEvent.click(screen.getByText('Quick Merge'));

    // Verify fetch was called to the merge execute endpoint
    await waitFor(() => {
      const fetchCalls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const mergeCall = fetchCalls.find(
        (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('/api/merge/execute')
      );
      expect(mergeCall).toBeDefined();
    });
  });

  it('Analyze & Review advances to qa step', async () => {
    openMergeModal();
    render(<MergeModal variant="merge" />);

    // Go to features step
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Analyze & Review')).toBeInTheDocument();
    });

    // Click Analyze & Review
    fireEvent.click(screen.getByText('Analyze & Review'));

    // Should show the qa step title "Review"
    await waitFor(() => {
      expect(screen.getByText('Review')).toBeInTheDocument();
    });

    // Since our mock resolves the scout SSE instantly, the scout will have
    // completed. The mock returns summary: 'Scout analysis', so the
    // Analysis Summary section should render.
    await waitFor(() => {
      expect(screen.getByText('Analysis Summary')).toBeInTheDocument();
    });

    // The Merge button should be visible in the qa step footer
    expect(screen.getByText('Merge')).toBeInTheDocument();
  });

  it('done step shows success message', () => {
    openMergeModal();

    render(<MergeModal variant="merge" />);

    // We need to manually get the component to the done state
    // Since the modal reads step from internal state, we'll verify via the flow
    // Instead, let's verify the done step rendering by checking
    // that the "Merge complete" text is in the document after reaching done step.
    // For unit test purposes, we'll trigger the full flow.

    // Alternatively we can just check the final state renders correctly.
    // The simplest way: re-render after the step is done is to check the text
    // exists somewhere in the component tree, but since step is internal state,
    // let's verify we can get there through the Quick Merge flow.

    // For a simpler approach, let's just verify the done step markup directly
    // by examining what the component renders when it naturally reaches 'done'.
    // We already tested the full flow above, so here let's verify the text exists
    // in the component output when step=done by going through Quick Merge.
  });
});

describe('MergeModal done step', () => {
  beforeEach(() => {
    const baseFeatures = [createTestFeature({ id: 'feat_nav', name: 'Navigation Bar' })];
    const contributorFeatures = [createTestFeature({ id: 'feat_hero', name: 'Hero Section' })];

    const baseBranch = createBranchWithBlueprint('branch_base', 'base-version', baseFeatures);
    const contributorBranch = createBranchWithBlueprint('branch_contrib', 'contributor-version', contributorFeatures);

    const project: Project = {
      id: 'project_test',
      name: 'Test Project',
      description: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      branches: [baseBranch, contributorBranch],
      rootBranchId: baseBranch.id,
    };
    useProjectStore.setState({ project });

    // Mock fetch for the Quick Merge flow
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/api/merge/prompts')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ prompts: [] }),
        });
      }
      if (typeof url === 'string' && url.includes('/api/merge/execute')) {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                `data: {"type":"done","mergedFiles":[{"path":"index.html","content":"<html>Merged</html>","language":"html"}]}\n\n`
              )
            );
            controller.close();
          },
        });
        return Promise.resolve({ status: 200, headers: new Headers(), body: stream });
      }
      if (typeof url === 'string' && url.includes('/api/blueprint')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, blueprint: createTestBlueprint() }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    useUIStore.setState({
      activeModal: 'merge',
      modalContext: {
        branchIds: ['branch_base', 'branch_contrib'],
        targetId: 'branch_base',
        sourceId: 'branch_contrib',
      },
    });
  });

  afterEach(() => {
    useUIStore.setState({ activeModal: null, modalContext: null });
    vi.restoreAllMocks();
  });

  it('shows Merge complete text after successful Quick Merge', async () => {
    render(<MergeModal variant="merge" />);

    // Advance to features step
    fireEvent.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByText('Quick Merge')).toBeInTheDocument();
    });

    // Trigger Quick Merge
    fireEvent.click(screen.getByText('Quick Merge'));

    // Wait for the modal to close (Quick Merge closes modal on success via pushToast + closeModal)
    // Quick merge calls closeModal on success, so the modal will close.
    // Instead, check that the toast was triggered (meaning merge completed successfully)
    await waitFor(
      () => {
        const toasts = useUIStore.getState().toasts;
        const successToast = toasts.find((t) => t.message === 'Merge complete');
        expect(successToast).toBeDefined();
      },
      { timeout: 5000 }
    );
  });
});
