import { useEffect, useState } from 'react';
import { downloadBookletPdf } from './exportPdf';
import {
  BOOKLET, DEFAULT_LAYOUTS, LAYOUTS, SHEETS, getRegions,
  isLayoutId, regionStyle,
  type LayoutId, type PageNumber, type Region,
} from './booklet';

type Draft = {
  title: string;
  scripture: string;
  bigIdea: string;
  verseReference: string;
  verseText: string;
  layouts: Record<2 | 3 | 4, LayoutId>;
};

type EditorTab = 'details' | 'layouts';
type PreviewMode = 'page' | 'sheet';

const KEY = 'worksheet-studio:draft:v1';
const blank: Draft = {
  title: '',
  scripture: '',
  bigIdea: '',
  verseReference: '',
  verseText: '',
  layouts: { ...DEFAULT_LAYOUTS },
};

const pages: { number: PageNumber; label: string }[] = [
  { number: 1, label: 'Front cover' },
  { number: 2, label: 'Inside left' },
  { number: 3, label: 'Inside right' },
  { number: 4, label: 'Back cover' },
];

function readDraft(): Draft {
  try {
    const stored = window.localStorage.getItem(KEY);
    if (!stored) return blank;

    const data: unknown = JSON.parse(stored);
    if (!data || typeof data !== 'object') return blank;
    const value = data as Partial<Draft>;
    const storedLayouts = value.layouts && typeof value.layouts === 'object'
      ? value.layouts as Record<number, unknown>
      : {};

    const text = (key: 'title' | 'scripture' | 'bigIdea' | 'verseReference' | 'verseText') =>
      typeof value[key] === 'string' ? value[key] : '';

    // PR 1 drafts have no layouts field. Load their text without losing it.
    return {
      title: text('title'),
      scripture: text('scripture'),
      bigIdea: text('bigIdea'),
      verseReference: text('verseReference'),
      verseText: text('verseText'),
      layouts: {
        2: isLayoutId(storedLayouts[2]) ? storedLayouts[2] : DEFAULT_LAYOUTS[2],
        3: isLayoutId(storedLayouts[3]) ? storedLayouts[3] : DEFAULT_LAYOUTS[3],
        4: isLayoutId(storedLayouts[4]) ? storedLayouts[4] : DEFAULT_LAYOUTS[4],
      },
    };
  } catch {
    // Storage can be unavailable, and old user content could be malformed.
    return blank;
  }
}

function RegionContents({ region, draft }: { region: Region; draft: Draft }) {
  if (region.kind === 'title') {
    return (
      <div className="cover-content">
        <span className="cover-overline">BIBLE STORY REVIEW</span>
        <span className="cover-title">{draft.title.trim() || 'Your story title'}</span>
        <span className="cover-reference">{draft.scripture.trim() || 'Scripture reference'}</span>
      </div>
    );
  }

  return (
    <div className="region-content">
      <span className="region-tag">{region.size.toUpperCase()}</span>
      <strong>Activity space</strong>
      <small>{region.width.toFixed(1)} × {region.height.toFixed(1)} in</small>
    </div>
  );
}

function BookletPage({ page, draft }: { page: PageNumber; draft: Draft }) {
  const layoutId = page === 1 ? DEFAULT_LAYOUTS[2] : draft.layouts[page];
  const regions = getRegions(page, layoutId);

  return (
    <div className="booklet-page" aria-label={'Booklet page ' + page + ' layout'}>
      <div className="booklet-page-number" aria-hidden="true">{page}</div>
      {regions.map((region) => (
        <div
          className={'booklet-region ' + (region.kind === 'title' ? 'title-region' : 'activity-region') + ' size-' + region.size}
          key={region.id}
          style={{ ...regionStyle(region), padding: String((BOOKLET.padding / BOOKLET.page.width) * 100) + '%' }}
          aria-label={region.kind === 'title' ? 'Title area' : region.size + ' activity area'}
        >
          <RegionContents region={region} draft={draft} />
        </div>
      ))}
    </div>
  );
}

function LayoutDiagram({ id }: { id: LayoutId }) {
  return (
    <div className="layout-diagram" aria-hidden="true">
      {getRegions(2, id).map((region) => (
        <span
          key={region.id}
          className={'diagram-region diagram-' + region.size}
          style={{
            gridColumn: String(region.col + 1) + ' / span ' + region.cols,
            gridRow: String(region.row + 1) + ' / span ' + region.rows,
          }}
        >
          {region.size.charAt(0).toUpperCase()}
        </span>
      ))}
    </div>
  );
}

export default function App() {
  const [draft, setDraft] = useState<Draft>(readDraft);
  const [page, setPage] = useState<PageNumber>(1);
  const [tab, setTab] = useState<EditorTab>('details');
  const [mode, setMode] = useState<PreviewMode>('page');
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(draft));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [draft]);

  function edit(field: 'title' | 'scripture' | 'bigIdea' | 'verseReference' | 'verseText', value: string) {
    setDraft((previous) => ({ ...previous, [field]: value }));
  }

  async function handleExport() {
    if (exporting) return;
    setExportError(null);
    setExporting(true);
    try {
      await downloadBookletPdf(draft);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Could not create the PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  function setLayout(layout: LayoutId) {
    if (page === 1) return;
    setDraft((previous) => ({
      ...previous,
      layouts: { ...previous.layouts, [page]: layout },
    }));
  }

  function selectPage(number: PageNumber) {
    setPage(number);
  }

  const selected = pages.find((item) => item.number === page) ?? pages[0];
  const activeSheet = SHEETS.find((sheet) => sheet.pages.includes(page)) ?? SHEETS[0];
  const layoutName = page === 1
    ? 'Fixed cover layout'
    : LAYOUTS.find((item) => item.id === draft.layouts[page])?.name ?? 'Page layout';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon" aria-hidden="true">W<span>✦</span></span>
          <div><strong>Worksheet Studio</strong><small>Bible booklet maker</small></div>
        </div>
        <div className="sidebar-group">
          <div className="nav-label">YOUR WORKSPACE</div>
          <button type="button" className={'step ' + (tab === 'details' ? 'current' : '')} onClick={() => setTab('details')}>
            <span className="step-number">01</span><span><strong>Worksheet details</strong><small>Title, Scripture & verse</small></span>
          </button>
          <button type="button" className={'step ' + (tab === 'layouts' ? 'current' : '')} onClick={() => setTab('layouts')}>
            <span className="step-number">02</span><span><strong>Page layouts</strong><small>Ready to customize</small></span>
          </button>
          <div className="step step-upcoming"><span className="step-number">03</span><span><strong>Activity modules</strong><small>Coming in PR 4</small></span></div>
        </div>
        <div className="sidebar-group page-nav">
          <div className="nav-label">BOOKLET PAGES</div>
          {pages.map((item) => (
            <button key={item.number} type="button" className={page === item.number ? 'page-link active' : 'page-link'}
              onClick={() => selectPage(item.number)} aria-current={page === item.number ? 'page' : undefined}>
              <span className="page-number">{item.number}</span>{item.label}
            </button>
          ))}
        </div>
        <div className="sidebar-foot"><span aria-hidden="true">●</span> Printable booklet release · PR 3</div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <span className="breadcrumb">WORKSPACE <span>/</span> BOOKLET DESIGN</span>
          <div className="topbar-right">
            <span className="save-indicator" role="status"><span className={saved ? 'dot saved' : 'dot'} />{saved ? 'Saved in this browser' : 'Browser saving unavailable'}</span>
            <button className="export-button export-ready" type="button" disabled={exporting} onClick={handleExport} aria-busy={exporting}>{exporting ? 'Creating PDF…' : 'Download PDF ↗'}</button>
          </div>
        </header>

        <main className="main">
          <div className="intro">
            <span className="eyebrow">YOUR NEXT BIBLE STORY RESOURCE</span>
            <h1>Design your <em>little</em> booklet.</h1>
            <p>Choose the page arrangement for your folded Bible worksheet, then download a two-sided, print-ready PDF with the correct booklet page order. Activity modules are coming next.</p>
            {exportError && <p className="pdf-error" role="alert">{exportError}</p>}
          </div>
          <div className="columns">
            <section className="panel" aria-labelledby="editor-heading">
              <div className="panel-heading">
                <div><span className="eyebrow">{tab === 'details' ? 'STEP 01 OF 03' : 'STEP 02 OF 03'}</span><h2 id="editor-heading">{tab === 'details' ? 'Worksheet details' : 'Page layouts'}</h2></div>
                <span className="panel-icon" aria-hidden="true">{tab === 'details' ? '✎' : '▦'}</span>
              </div>
              <div className="editor-tabs" role="tablist" aria-label="Worksheet editor sections">
                <button type="button" role="tab" aria-selected={tab === 'details'} onClick={() => setTab('details')}>Lesson details</button>
                <button type="button" role="tab" aria-selected={tab === 'layouts'} onClick={() => setTab('layouts')}>Page layouts</button>
              </div>
              {tab === 'details' ? (
                <div className="fields">
                  <div className="field">
                    <label htmlFor="title">Worksheet title</label>
                    <input id="title" value={draft.title} onChange={(e) => edit('title', e.target.value)} placeholder="e.g. David and Goliath" maxLength={100} />
                    <p>Appears as the main heading on the front cover.</p>
                  </div>
                  <div className="field">
                    <label htmlFor="scripture">Story Scripture reference</label>
                    <input id="scripture" value={draft.scripture} onChange={(e) => edit('scripture', e.target.value)} placeholder="e.g. 1 Samuel 17" maxLength={120} />
                  </div>
                  <div className="field separated">
                    <label htmlFor="bigIdea">Big Idea</label>
                    <textarea id="bigIdea" value={draft.bigIdea} onChange={(e) => edit('bigIdea', e.target.value)} placeholder="One sentence capturing the heart of the lesson" rows={2} maxLength={350} />
                  </div>
                  <div className="field">
                    <label htmlFor="verseReference">Memory verse reference</label>
                    <input id="verseReference" value={draft.verseReference} onChange={(e) => edit('verseReference', e.target.value)} placeholder="e.g. 1 Samuel 17:47" maxLength={120} />
                  </div>
                  <div className="field">
                    <label htmlFor="verseText">Memory verse text</label>
                    <textarea id="verseText" value={draft.verseText} onChange={(e) => edit('verseText', e.target.value)} placeholder="Type the exact verse from your chosen Bible translation" rows={3} maxLength={1500} />
                    <p>Text from your PR 1 draft is preserved, and layout selections save automatically too.</p>
                  </div>
                </div>
              ) : (
                <div className="layouts-panel">
                  <div className="layout-page-picker" aria-label="Choose page to arrange">
                    {pages.map((item) => (
                      <button type="button" key={item.number} className={page === item.number ? 'active' : ''} aria-pressed={page === item.number} onClick={() => selectPage(item.number)}>
                        Page {item.number}
                      </button>
                    ))}
                  </div>
                  {page === 1 ? (
                    <div className="fixed-layout-note">
                      <div className="fixed-layout-illustration"><LayoutDiagram id="medium-large" /></div>
                      <div>
                        <h3>Front cover · fixed layout</h3>
                        <p>The top medium area is reserved for the worksheet title and Scripture subtitle. The large area below will hold an activity.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="layout-selection-title">Select a layout for page {page}</h3>
                      <p className="layout-explainer">Pick one of the six arrangements below. Each booklet page uses two columns and three equal-height rows.</p>
                      <div className="layout-options">
                        {LAYOUTS.map((layout) => (
                          <button type="button" key={layout.id} onClick={() => setLayout(layout.id)}
                            className={'layout-option ' + (draft.layouts[page] === layout.id ? 'chosen' : '')}
                            aria-pressed={draft.layouts[page] === layout.id} aria-label={layout.description}>
                            <LayoutDiagram id={layout.id} />
                            <span className="layout-option-label">{layout.name}</span>
                            <span className="layout-option-description">{layout.description}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  <div className="dimension-guide">
                    <h3>Section sizes</h3>
                    <div><strong>Large</strong><span>4.8 × 5.2 in</span></div>
                    <div><strong>Medium</strong><span>4.8 × 2.6 in</span></div>
                    <div><strong>Small</strong><span>2.4 × 2.6 in</span></div>
                    <p>Every page has {BOOKLET.margin.toFixed(2)}-inch outer margins and a 4.8 × 7.8-inch usable area.</p>
                  </div>
                </div>
              )}
            </section>

            <section className="panel" aria-labelledby="preview-heading">
              <div className="panel-heading">
                <div><span className="eyebrow">LIVE LAYOUT</span><h2 id="preview-heading">Booklet preview</h2></div>
                <span className="paper-badge">US LETTER · BIFOLD</span>
              </div>
              <div className="preview-toolbar">
                <div className="preview-mode-switch" aria-label="Preview mode">
                  <button type="button" onClick={() => setMode('page')} className={mode === 'page' ? 'active' : ''} aria-pressed={mode === 'page'}>Single page</button>
                  <button type="button" onClick={() => setMode('sheet')} className={mode === 'sheet' ? 'active' : ''} aria-pressed={mode === 'sheet'}>Print sheets</button>
                </div>
                {mode === 'sheet' && (
                  <div className="sheet-selector" aria-label="Choose sheet side">
                    <button type="button" className={activeSheet.id === 'outside' ? 'active' : ''} onClick={() => selectPage(4)}>Outside</button>
                    <button type="button" className={activeSheet.id === 'inside' ? 'active' : ''} onClick={() => selectPage(2)}>Inside</button>
                  </div>
                )}
              </div>
              <div className={'preview-stage ' + (mode === 'sheet' ? 'sheet-stage' : '')}>
                {mode === 'page' ? (
                  <BookletPage page={page} draft={draft} />
                ) : (
                  <div className="print-sheet" aria-label={activeSheet.name}>
                    {activeSheet.pages.map((number) => (
                      <button key={number} type="button" className={'sheet-half ' + (number === page ? 'selected-half' : '')}
                        onClick={() => selectPage(number)} aria-label={'Select booklet page ' + number}>
                        <BookletPage page={number} draft={draft} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="preview-bottom">
                <div><strong>Page {page} · {selected.label}</strong><small>{layoutName}</small></div>
                <nav className="page-switcher" aria-label="Preview booklet page">
                  {pages.map((item) => (
                    <button key={item.number} type="button" className={page === item.number ? 'active' : ''}
                      aria-label={'Preview page ' + item.number} aria-pressed={page === item.number} onClick={() => selectPage(item.number)}>{item.number}</button>
                  ))}
                </nav>
              </div>
              <p className="preview-disclaimer">ⓘ This preview scales to your screen; Download PDF creates two landscape US Letter pages in booklet order. Print at 100% / Actual size, double-sided, and flip on the short edge. Activity regions are placeholders.</p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
