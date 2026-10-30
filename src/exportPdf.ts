import { createBookletPdf, type PdfDraft, type PdfFontFiles } from './pdf.ts';

// Vite packages these local files as versioned static assets for GitHub Pages.
const FONT_URLS = {
  mouseMemoirs: new URL('../fonts/MouseMemoirs-Regular.ttf', import.meta.url).href,
  nunitoSans: new URL('../fonts/NunitoSans-VariableFont_YTLC,opsz,wdth,wght.ttf', import.meta.url).href,
} as const;

async function loadFont(url: string, name: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Unable to load the ' + name + ' font. Check your connection and try again.');
  }
  return new Uint8Array(await response.arrayBuffer());
}

function fileName(title: string): string {
  const safe = title.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return (safe || 'bible-worksheet') + '-booklet.pdf';
}

export async function downloadBookletPdf(draft: PdfDraft): Promise<void> {
  const files: PdfFontFiles = {
    mouseMemoirs: await loadFont(FONT_URLS.mouseMemoirs, 'Mouse Memoirs'),
    nunitoSans: await loadFont(FONT_URLS.nunitoSans, 'Nunito Sans'),
  };
  const bytes = await createBookletPdf(draft, files);
  // Create an owned ArrayBuffer to avoid SharedArrayBuffer/Blob type mismatches.
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName(draft.title);
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
}
