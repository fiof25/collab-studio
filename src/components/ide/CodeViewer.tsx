import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { clsx } from 'clsx';
import type { CodeBlock } from '@/types/chat';

interface CodeViewerProps {
  block: CodeBlock;
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeViewer({ block, showLineNumbers = true, className }: CodeViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(block.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = block.code.split('\n');

  return (
    <div
      className={clsx(
        'rounded-xl overflow-hidden border border-line bg-surface-0',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-line bg-surface-1">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-surface-4" />
            <div className="w-2.5 h-2.5 rounded-full bg-surface-4" />
            <div className="w-2.5 h-2.5 rounded-full bg-surface-4" />
          </div>
          {block.filename && (
            <span className="text-xs text-ink-muted font-mono">{block.filename}</span>
          )}
          {block.language && !block.filename && (
            <span className="text-xs text-ink-muted capitalize">{block.language}</span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink-primary transition-colors"
        >
          {copied ? (
            <>
              <Check size={12} className="text-status-active" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="group hover:bg-surface-2/50">
                {showLineNumbers && (
                  <td className="pl-4 pr-3 py-0 text-right select-none text-2xs text-ink-muted font-mono w-8 align-top pt-px">
                    {i + 1}
                  </td>
                )}
                <td className="pr-4 py-0 font-mono text-xs text-ink-primary leading-5 whitespace-pre">
                  <ColorizedLine line={line} language={block.language} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Simple syntax colorization (no external library)
function ColorizedLine({ line, language }: { line: string; language: string }) {
  if (!line) return <span>&nbsp;</span>;

  // Very basic colorization for HTML/CSS
  if (language === 'html') {
    return <span dangerouslySetInnerHTML={{ __html: colorizeHtml(line) }} />;
  }
  if (language === 'css') {
    return <span dangerouslySetInnerHTML={{ __html: colorizeCss(line) }} />;
  }

  return <span>{line}</span>;
}

function colorizeHtml(line: string): string {
  return line
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /(&lt;\/?)([\w-]+)/g,
      '<span style="color:#A78BFA">$1</span><span style="color:#22D3EE">$2</span>'
    )
    .replace(
      /([\w-]+)=(&quot;|")(.*?)(&quot;|")/g,
      '<span style="color:#94A3B8">$1</span>=<span style="color:#86EFAC">"$3"</span>'
    )
    .replace(/&lt;!--(.*?)--&gt;/g, '<span style="color:#5A5A72">$1</span>');
}

function colorizeCss(line: string): string {
  return line
    .replace(/&/g, '&amp;')
    .replace(/(\/\*.*?\*\/)/g, '<span style="color:#5A5A72">$1</span>')
    .replace(/([\w-]+)\s*:/g, '<span style="color:#A78BFA">$1</span>:')
    .replace(/(#[0-9a-fA-F]{3,8})/g, '<span style="color:#86EFAC">$1</span>')
    .replace(/'([^']*)'/g, '<span style="color:#86EFAC">\'$1\'</span>')
    .replace(/"([^"]*)"/g, '<span style="color:#86EFAC">"$1"</span>');
}

// Full-page code viewer variant
interface FullCodeViewerProps {
  code: string;
  language: string;
}

export function FullCodeViewer({ code, language }: FullCodeViewerProps) {
  return (
    <CodeViewer
      block={{ language, code }}
      showLineNumbers
      className="h-full rounded-none border-0 border-t border-line"
    />
  );
}
