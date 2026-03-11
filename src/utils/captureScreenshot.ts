import html2canvas from 'html2canvas';

/** Renders HTML in a hidden same-origin iframe and returns a base64 JPEG screenshot. */
export async function captureHtmlScreenshot(html: string): Promise<string | null> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText =
      'position:fixed;top:-9999px;left:-9999px;width:1280px;height:720px;border:none;visibility:hidden;';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    document.body.appendChild(iframe);

    const cleanup = () => { try { document.body.removeChild(iframe); } catch { /* noop */ } };

    iframe.onload = async () => {
      try {
        // Give the page a moment to render (fonts, layout)
        await new Promise((r) => setTimeout(r, 600));
        const canvas = await html2canvas(iframe.contentDocument!.body, {
          width: 1280,
          height: 720,
          scale: 0.5,
          useCORS: true,
          logging: false,
        });
        const base64 = canvas.toDataURL('image/jpeg', 0.75).split(',')[1];
        cleanup();
        resolve(base64);
      } catch {
        cleanup();
        resolve(null);
      }
    };

    iframe.onerror = () => { cleanup(); resolve(null); };
    iframe.srcdoc = html;
  });
}
