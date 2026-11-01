import { createBookletPdf, type PdfDraft, type PdfFontFiles } from './pdf.ts';
import {coverBorderUrl} from './coverBorders.ts';
import {activityBorderUrl,isActivityBorderReady,readActivityBorders} from './activityBorders.ts';
import {getPrintableSheetRegions} from './pdf.ts';
import {slotKey} from './modules.ts';

// Vite packages these local files as versioned static assets for GitHub Pages.
const FONT_URLS = {
  mouseMemoirs: new URL('../fonts/MouseMemoirs-Regular.ttf', import.meta.url).href,
  nunitoMedium: new URL('../fonts/Nunito-Medium.ttf', import.meta.url).href,
  nunitoBold: new URL('../fonts/Nunito-Bold.ttf', import.meta.url).href,
  nunitoExtraBold: new URL('../fonts/Nunito-ExtraBold.ttf', import.meta.url).href,
  // Normalized copy; the original Zilla font is still used in the browser UI.
  zillaSlab: new URL('../fonts/ZillaSlab-Bold-pdf.ttf', import.meta.url).href,
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
  const [mouseMemoirs,nunitoSans,nunitoSans750,nunitoSans900,zillaSlab]=await Promise.all([
    loadFont(FONT_URLS.mouseMemoirs,'Mouse Memoirs'),
    loadFont(FONT_URLS.nunitoMedium,'Nunito Medium'),
    loadFont(FONT_URLS.nunitoBold,'Nunito Bold'),
    loadFont(FONT_URLS.nunitoExtraBold,'Nunito ExtraBold'),
    loadFont(FONT_URLS.zillaSlab,'Zilla Slab Bold'),
  ]);
  const files:PdfFontFiles={mouseMemoirs,nunitoSans,nunitoSans750,nunitoSans900,zillaSlab};
  const borderUrl=coverBorderUrl(draft.coverBorder);
  const borderPng=borderUrl?await loadFont(borderUrl,'selected cover border'):undefined;
  // Fetch only the selected, certified Small and Medium artwork. Repeat selections share
  // the same URL/bytes, but are keyed by region in the PDF renderer.
  const activityPngs:Record<string,Uint8Array>={};
  const cached=new Map<string,Promise<Uint8Array>>();
  const activityBorders=readActivityBorders(draft.activityBorders);
  for(const sheet of getPrintableSheetRegions(draft))for(const region of sheet){
    const key=slotKey(region.bookletPage,region.id);
    const module=draft.modules?.[key];
    const id=activityBorders[key];
    if(!id||region.size==='large'||!isActivityBorderReady(module?.type))continue;
    const url=activityBorderUrl(region.size,id);
    if(!url)continue;
    if(!cached.has(url))cached.set(url,loadFont(url,'selected '+region.size+' activity border'));
    activityPngs[key]=await cached.get(url)!;
  }
  const bytes = await createBookletPdf(draft, files,borderPng,activityPngs);
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
