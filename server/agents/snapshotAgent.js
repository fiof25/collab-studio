import { callClaude } from './tools.js';
import { config } from '../config/models.js';

const CONVERSATION_PROMPT = `You are a Snapshot Agent for a collaborative prototyping tool.

A user just chatted with an AI to build or update a web prototype. Your job: write a SHORT description for the canvas node that captures what this prototype IS and what it's for — based on the conversation.

Rules:
- Focus on PURPOSE and CONTENT, not visual design or UI elements
- Lead with what the page/app is about: the topic, goal, or user need it serves
- 8–16 words max
- Examples of GOOD descriptions:
  - "BTS fan page with member profiles, discography, and tour dates"
  - "SaaS landing page for an AI-powered code review tool"
  - "Personal portfolio showcasing design work and a contact form"
  - "E-commerce storefront for handmade ceramics with product listings"
  - "Dashboard for tracking team sprint velocity and open issues"
  - "Pricing page for a subscription app with three tiers"
- DO NOT describe visual design, colors, layout, or UI components
- DO NOT say things like "dark gradient hero" or "3-column card grid"
- No technical jargon, no quotes, no trailing punctuation

Respond with ONLY the description.`;

const VISION_PROMPT = `You are a Snapshot Agent for a collaborative prototyping tool.

Look at this screenshot of a web prototype and write a SHORT description for a canvas card that captures what this page IS and what it's for.

Rules:
- Focus on PURPOSE and CONTENT — what is this page about?
- 10–16 words max
- Examples:
  - "BTS fan page with member profiles and tour dates"
  - "AI startup landing page with feature overview and pricing"
  - "Portfolio site for a freelance photographer"
  - "Team analytics dashboard for tracking sprint progress"
- DO NOT describe colors, layouts, fonts, or UI patterns
- No technical jargon, no quotes, no trailing punctuation

Respond with ONLY the description.`;

const CODE_PROMPT = `You are a Snapshot Agent for a collaborative prototyping tool.

Read this web prototype's code and write a SHORT description for a canvas card that captures what this page IS and what it's for.

Rules:
- Focus on PURPOSE and CONTENT — what is this page/app about?
- 10–16 words max
- Examples:
  - "Startup landing page for a project management SaaS tool"
  - "BTS fan site with member bios and latest album info"
  - "Recipe blog homepage with featured dishes and category filters"
- DO NOT describe colors, layout types, or UI components
- No technical jargon (no 'CSS', 'HTML', 'div'), no quotes

Respond with ONLY the description. No punctuation at the end.`;

export async function runSnapshotAgent({ branchName, files, apiKey, screenshotBase64, userPrompt, aiSummary }) {
  try {
    let claudePayload;

    if (userPrompt || aiSummary) {
      // Conversation-based: most accurate — describes what actually changed this iteration
      const context = [
        userPrompt && `User request: "${userPrompt}"`,
        aiSummary && `AI summary of changes: "${aiSummary}"`,
      ].filter(Boolean).join('\n');

      claudePayload = {
        system: CONVERSATION_PROMPT,
        messages: [{ role: 'user', content: context }],
      };
    } else if (screenshotBase64) {
      // Vision-based fallback: describe the rendered screenshot
      claudePayload = {
        system: VISION_PROMPT,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: screenshotBase64 } },
            { type: 'text', text: `Branch: "${branchName}"` },
          ],
        }],
      };
    } else {
      // Last resort: describe from HTML source
      const mainFile = files.find((f) => f.path === 'index.html') ?? files[0];
      if (!mainFile) return { success: false, error: 'No files to analyze' };

      claudePayload = {
        system: CODE_PROMPT,
        messages: [{ role: 'user', content: `Branch: "${branchName}"\n\n${mainFile.content.slice(0, 8000)}` }],
      };
    }

    const description = await callClaude(apiKey, config.models.small, claudePayload, {
      temperature: 0.3,
      maxOutputTokens: 80,
    });

    return { success: true, description: description.trim() };
  } catch (err) {
    console.error('[SnapshotAgent] error:', err.message);
    return { success: false, error: err.message };
  }
}
