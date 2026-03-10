import express from 'express';
import { runBlueprintAgent } from '../agents/blueprintAgent.js';
import { runSnapshotAgent } from '../agents/snapshotAgent.js';

export const blueprintRouter = express.Router();

// Mock blueprints used when no API key is configured
function mockBlueprint(branchName, parentBranchName) {
  return {
    title: branchName,
    summary: 'A web prototype built with HTML and CSS',
    purpose: 'Landing page prototype for exploration and iteration.',
    techStack: ['HTML', 'Inline CSS'],
    fileStructure: [{ path: 'index.html', description: 'Single-file prototype with all markup and styles' }],
    features: [
      {
        id: 'navigation',
        name: 'Navigation Bar',
        description: 'Top navigation bar with logo and links',
        files: ['index.html'],
        dependencies: [],
        visualRegion: { selector: 'nav', label: 'Navigation' },
      },
      {
        id: 'hero',
        name: 'Hero Section',
        description: 'Main hero with headline and call-to-action button',
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
  const { branchId, branchName, parentBranchName, files } = req.body;

  if (!branchId || !branchName || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    // Mock mode
    return res.json({ success: true, blueprint: mockBlueprint(branchName, parentBranchName) });
  }

  const result = await runBlueprintAgent({ branchId, branchName, parentBranchName, files, apiKey });
  res.json(result);
});

// POST /api/blueprint/snapshot
// Body: { branchId, branchName, files: ProjectFile[] }
// Returns: { success, description } | { success: false, error }
blueprintRouter.post('/snapshot', async (req, res) => {
  const { branchId, branchName, files } = req.body;

  if (!branchId || !branchName || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    // Mock: use branch name as a simple description placeholder
    return res.json({ success: true, description: `${branchName} — prototype` });
  }

  const result = await runSnapshotAgent({ branchId, branchName, files, apiKey });
  res.json(result);
});
