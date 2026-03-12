import express from 'express';
import { runBlueprintAgent } from '../agents/blueprintAgent.js';
import { runSnapshotAgent } from '../agents/snapshotAgent.js';
import { config } from '../config/models.js';

export const blueprintRouter = express.Router();

// Mock blueprints used when no API key is configured
function mockBlueprint(branchName, parentBranchName) {
  return {
    title: branchName,
    summary: 'A web prototype built with HTML and CSS',
    purpose: 'Landing page prototype for exploration and iteration.',
    architecture: {
      pattern: 'Static single page',
      initFlow: 'DOMContentLoaded → render',
      stateModel: [],
      eventModel: [],
    },
    techStack: ['HTML', 'Inline CSS'],
    fileStructure: [{ path: 'index.html', description: 'Single-file prototype with all markup and styles' }],
    features: [
      {
        id: 'navigation',
        name: 'Navigation Bar',
        description: 'Top navigation bar with logo and links',
        behavior: 'Renders a fixed nav bar with logo and anchor links for page sections',
        state: [],
        entryPoints: [{ type: 'element', name: 'nav', direction: 'in', description: 'Navigation container element' }],
        codeRegions: [{ file: 'index.html', anchor: 'nav', label: 'Navigation markup' }],
        files: ['index.html'],
        dependencies: [],
        visualRegion: { selector: 'nav', label: 'Navigation' },
      },
      {
        id: 'hero',
        name: 'Hero Section',
        description: 'Main hero with headline and call-to-action button',
        behavior: 'Displays a hero banner with headline text and a CTA button that scrolls to content',
        state: [],
        entryPoints: [{ type: 'element', name: '.hero', direction: 'in', description: 'Hero section container' }],
        codeRegions: [{ file: 'index.html', anchor: '.hero, header, section:first-of-type', label: 'Hero section markup' }],
        files: ['index.html'],
        dependencies: [],
        visualRegion: { selector: '.hero, header, section:first-of-type', label: 'Hero' },
      },
    ],
    designTokens: {
      primaryColor: '#111111',
      backgroundColor: '#ffffff',
      textColor: '#333333',
      fontFamily: 'system-ui',
    },
    changeHistory: ['Initial creation'],
    parent: parentBranchName ? { branch: parentBranchName, relationship: 'Direct child' } : null,
    generatedAt: Date.now(),
    raw: `# ${branchName}\n\n> A web prototype built with HTML and CSS`,
  };
}

// POST /api/blueprint/generate
// Body: { branchId, branchName, parentBranchName?, files: ProjectFile[] }
// Returns: { success, blueprint } | { success: false, error }
blueprintRouter.post('/generate', async (req, res) => {
  const { branchId, branchName, parentBranchName, files, conversationContext, existingBlueprint, forceFullRegenerate } = req.body;

  if (!branchId || !branchName || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const apiKey = config.apiKey;
  if (!apiKey || apiKey === 'your_key_here') {
    return res.json({ success: true, blueprint: mockBlueprint(branchName, parentBranchName) });
  }

  const result = await runBlueprintAgent({ branchId, branchName, parentBranchName, files, apiKey, conversationContext, existingBlueprint, forceFullRegenerate });
  res.json(result);
});

// POST /api/blueprint/snapshot
// Body: { branchId, branchName, files: ProjectFile[] }
// Returns: { success, description } | { success: false, error }
blueprintRouter.post('/snapshot', async (req, res) => {
  const { branchId, branchName, files, screenshotBase64, userPrompt, aiSummary } = req.body;

  if (!branchId || !branchName || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const apiKey = config.apiKey;
  if (!apiKey || apiKey === 'your_key_here') {
    // Mock: use the user prompt directly if available
    const description = userPrompt
      ? userPrompt.slice(0, 60) + (userPrompt.length > 60 ? '…' : '')
      : `${branchName} — prototype`;
    return res.json({ success: true, description });
  }

  const result = await runSnapshotAgent({ branchId, branchName, files, apiKey, screenshotBase64, userPrompt, aiSummary });
  res.json(result);
});

