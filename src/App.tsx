import { useEffect, useRef, useState } from 'react';
import pkg from '../package.json';
import {markWordSelection} from './storySelection.ts';
import {fieldExceedsLength} from './fieldLengthFeedback.ts';
import { downloadBookletPdf } from './exportPdf';
import ModulePreview from './ModulePreview';
import SmallModuleEditor from './SmallModuleEditor';
import { isSmallModule } from './smallModules';
import { isStoryVerseModule } from './storyVerseModules';
import StoryVerseEditor from './StoryVerseEditor';
import { isPuzzleId, isPuzzleModule } from './puzzleEngines';
import PuzzleEditor from './PuzzleEditor';
import {isCryptogram,isCryptogramId} from './cryptograms.ts';
import CryptogramEditor from './CryptogramEditor';
import {isSpecialtyModule} from './specialtyModules.ts';
import SpecialtyEditor from './SpecialtyEditor';
import {
  blankModule, moduleForSize, readAssignments, slotKey, validateModule,
  type ActivityModule, type ModuleAssignments, type ModuleId,
} from './modules';
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
  modules: ModuleAssignments;
};

type EditorTab = 'details' | 'layouts' | 'activities';
type PreviewMode = 'page' | 'sheet';

const KEY = 'worksheet-studio:draft:v1';
const blank: Draft = {
  title: '',
  scripture: '',
  bigIdea: '',
  verseReference: '',
  verseText: '',
  layouts: { ...DEFAULT_LAYOUTS },
  modules: {},
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
      modules: readAssignments(value.modules),
    };
  } catch {
    // Storage can be unavailable, and old user content could be malformed.
    return blank;
  }
}

function RegionContents({ region, draft, module, showSolution = false }: { region: Region; draft: Draft; module?: ActivityModule; showSolution?: boolean }) {
  if (region.kind === 'title') {
    return (
      <div className="cover-content">
        <span className="cover-title">{draft.title.trim() || 'Your story title'}</span>
        <span className="cover-reference">{draft.scripture.trim() || 'Scripture reference'}</span>
      </div>
    );
  }

  // Older Medium Connect Verse placements remain visible, editable and
  // printable without moving a saved assignment or changing its layout.
  const legacyMedium=region.size==='medium'&&module?.type==='connect-verse';
  if (module && (legacyMedium||moduleForSize(region.size).some((item) => item.id === module.type)))
    return <ModulePreview module={module} showSolution={showSolution} legacyMedium={legacyMedium}/>;

  return (
    <div className="region-content">
      <span className="region-tag">{region.size.toUpperCase()}</span>
      <strong>Activity space</strong>
      <small>{region.width.toFixed(1)} × {region.height.toFixed(1)} in</small>
    </div>
  );
}

function BookletPage({
  page, draft, selectedId, onSelect, showSolution = false,
}: {
  page: PageNumber;
  draft: Draft;
  selectedId?: string;
  showSolution?: boolean;
  onSelect: (page: PageNumber, regionId: string) => void;
}) {
  const layoutId = page === 1 ? DEFAULT_LAYOUTS[2] : draft.layouts[page];
  const regions = getRegions(page, layoutId);
  return (
    <div className="booklet-page" aria-label={'Booklet page ' + page + ' layout'}>

      {regions.map((region) => {
        const style = { ...regionStyle(region), padding: String((BOOKLET.padding / BOOKLET.page.width) * 100) + '%' };
        const className = 'booklet-region ' + (region.kind === 'title' ? 'title-region' : 'activity-region') +
          ' size-' + region.size + (region.id === selectedId ? ' selected-region' : '');
        const content = <RegionContents region={region} draft={draft} module={draft.modules[slotKey(page, region.id)]} showSolution={showSolution && region.id === selectedId} />;
        return region.kind === 'title'
          ? <div key={region.id} className={className} style={style} aria-label="Fixed title area">{content}</div>
          : <button type="button" key={region.id} className={className} style={style}
              aria-label={'Edit ' + region.size + ' activity on page ' + page}
              aria-pressed={region.id === selectedId}
              onClick={() => onSelect(page, region.id)}>{content}</button>;
      })}
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
  const storyInputRef = useRef<HTMLTextAreaElement>(null);
  const [page, setPage] = useState<PageNumber>(1);
  const [tab, setTab] = useState<EditorTab>('details');
  const [selectedRegionId, setSelectedRegionId] = useState<string>('cover-activity');
  const [solutionKey, setSolutionKey] = useState<string | null>(null);
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
    const layout = number === 1 ? DEFAULT_LAYOUTS[2] : draft.layouts[number];
    const first = getRegions(number, layout).find((region) => region.kind === 'activity');
    if (first) setSelectedRegionId(first.id);
  }

  function selectRegion(number: PageNumber, regionId: string) {
    setPage(number);
    setSelectedRegionId(regionId);
    setTab('activities');
  }

  function setModuleType(type: ModuleId | '') {
    if (!activeKey) return;
    setDraft((previous) => {
      const modules = { ...previous.modules };
      if (type === 'first-letters') {
        modules[activeKey] = { type, reference: previous.verseReference, verse: previous.verseText };
      } else if (type === 'finish-verse' || type === 'unscramble-verse') {
        modules[activeKey] = { type, reference: previous.verseReference, verse: previous.verseText, seed: 1 };
      } else if (type === 'verse-cryptogram') {
        modules[activeKey] = {type,reference:previous.verseReference,verse:previous.verseText,seed:1};
      } else if (type === 'big-idea-cryptogram' || type === 'connect-big-idea') {
        modules[activeKey] = {type,idea:previous.bigIdea,seed:1};
      } else if (type === 'spiral-verse' || type === 'upside-down-verse') {
        modules[activeKey] = {type,reference:previous.verseReference,verse:previous.verseText};
      } else if (type === 'connect-verse') {
        modules[activeKey] = {type,verse:previous.verseText,seed:1};
      } else if (type) modules[activeKey] = blankModule(type);
      else delete modules[activeKey];
      return { ...previous, modules };
    });
  }

  function editModule(update: Partial<ActivityModule>) {
    if (!activeKey) return;
    setDraft((previous) => {
      const original = previous.modules[activeKey];
      if (!original) return previous;
      return {
        ...previous,
        modules: { ...previous.modules, [activeKey]: { ...original, ...update } as ActivityModule },
      };
    });
  }

  /** Double-click selects an exact occurrence, even when a word repeats. */
  function markSelectedStoryWord() {
    const input=storyInputRef.current;
    if(!input||activeModule?.type!=='finish-story')return;
    const result=markWordSelection(activeModule.story,input.selectionStart,input.selectionEnd);
    if(!result)return;
    editModule({story:result.text});
    requestAnimationFrame(()=>{
      input.focus();
      input.setSelectionRange(result.selectionStart,result.selectionEnd);
    });
  }

  function regenerateModule() {
    if (!activeKey) return;
    setDraft((previous) => {
      const original = previous.modules[activeKey];
      if (!original || !('seed' in original)) return previous;
      return {
        ...previous,
        modules: { ...previous.modules, [activeKey]: { ...original, seed: original.seed + 1 } },
      };
    });
  }

  const currentLayout = page === 1 ? DEFAULT_LAYOUTS[2] : draft.layouts[page];
  const available = getRegions(page, currentLayout).filter((region) => region.kind === 'activity');
  const activeRegion = available.find((region) => region.id === selectedRegionId) ?? available[0];
  const activeKey = activeRegion ? slotKey(page, activeRegion.id) : '';
  const activeModule = draft.modules[activeKey];
  const showSolution = solutionKey === activeKey;
  const validation = activeModule ? validateModule(activeModule) : [];
  const activityFieldRef=useRef<HTMLDivElement>(null);
  // Shared immediate length feedback. The validation panel remains the
  // source of error explanations; styling identifies the exact input.
  useEffect(()=>{
    const root=activityFieldRef.current;
    if(!root)return;
    for(const field of root.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('input[id],textarea[id]')){
      const exceeded=!!activeModule&&fieldExceedsLength(activeModule,field.id,field.value);
      field.classList.toggle('over-character-limit',exceeded);
      if(exceeded)field.setAttribute('aria-invalid','true');
      else field.removeAttribute('aria-invalid');
    }
  },[activeModule,tab,page,selectedRegionId]);
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
          <button type="button" className={'step ' + (tab === 'activities' ? 'current' : '')} onClick={() => setTab('activities')}>
            <span className="step-number">03</span><span><strong>Activity modules</strong><small>Choose and edit activities</small></span>
          </button>
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
        <div className="sidebar-foot"><span aria-hidden="true">●</span> Specialty activities · PR 9b</div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <span className="breadcrumb">WORKSPACE <span>/</span> BOOKLET DESIGN <span>/</span> <strong className="app-version">v{pkg.version}{import.meta.env.VITE_BUILD_SHA?' · '+import.meta.env.VITE_BUILD_SHA.slice(0,7):''}</strong></span>
          <div className="topbar-right">
            <span className="save-indicator" role="status"><span className={saved ? 'dot saved' : 'dot'} />{saved ? 'Saved in this browser' : 'Browser saving unavailable'}</span>
            <button className="export-button export-ready" type="button" disabled={exporting} onClick={handleExport} aria-busy={exporting}>{exporting ? 'Creating PDF…' : 'Download PDF ↗'}</button>
          </div>
        </header>

        <main className="main">
          <div className="intro">
            <span className="eyebrow">YOUR NEXT BIBLE STORY RESOURCE</span>
            <h1>Design your <em>little</em> booklet.</h1>
            <p>Choose the page arrangement, click any activity area to add a module, and download a booklet with real activities.</p>
            {exportError && <p className="pdf-error" role="alert">{exportError}</p>}
          </div>
          <div className="columns">
            <section className="panel" aria-labelledby="editor-heading">
              <div className="panel-heading">
                <div><span className="eyebrow">{tab === 'details' ? 'STEP 01 OF 03' : tab === 'layouts' ? 'STEP 02 OF 03' : 'STEP 03 OF 03'}</span><h2 id="editor-heading">{tab === 'details' ? 'Worksheet details' : tab === 'layouts' ? 'Page layouts' : 'Activity modules'}</h2></div>
                <span className="panel-icon" aria-hidden="true">{tab === 'details' ? '✎' : tab === 'layouts' ? '▦' : '✦'}</span>
              </div>
              <div className="editor-tabs" role="tablist" aria-label="Worksheet editor sections">
                <button type="button" role="tab" aria-selected={tab === 'details'} onClick={() => setTab('details')}>Lesson details</button>
                <button type="button" role="tab" aria-selected={tab === 'layouts'} onClick={() => setTab('layouts')}>Page layouts</button>
                <button type="button" role="tab" aria-selected={tab === 'activities'} onClick={() => setTab('activities')}>Activities</button>
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
              ) : tab === 'layouts' ? (
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
              ) : (
                <div className="activity-editor" ref={activityFieldRef}>
                  <p className="activity-help">Choose a booklet page, then click an activity region in the preview or select a section below.</p>
                  <div className="activity-page-pickers" aria-label="Choose booklet page">
                    {pages.map((item) => <button key={item.number} type="button" onClick={() => selectPage(item.number)}
                      className={page === item.number ? 'active' : ''} aria-pressed={page === item.number}>Page {item.number}</button>)}
                  </div>
                  <label htmlFor="activity-region">Activity section</label>
                  <select id="activity-region" value={activeRegion?.id ?? ''}
                    onChange={(e) => setSelectedRegionId(e.target.value)}>
                    {available.map((region) =>
                      <option key={region.id} value={region.id}>{region.size.toUpperCase()} · {region.id.replaceAll('-', ' ')}</option>)}
                  </select>
                  <p className="activity-section-info">Page {page} · {activeRegion?.width.toFixed(1)} × {activeRegion?.height.toFixed(1)} inches</p>
                  <label htmlFor="activity-type">Module</label>
                  <select id="activity-type" value={activeModule?.type ?? ''}
                    onChange={(e) => setModuleType(e.target.value as ModuleId | '')}>
                    <option value="">No activity (placeholder)</option>
                    {activeRegion?.size==='medium'&&activeModule?.type==='connect-verse'&&
                      <option value="connect-verse">Connect the Verse (saved Medium)</option>}
                    {activeRegion && moduleForSize(activeRegion.size).map((definition) =>
                      <option key={definition.id} value={definition.id}>{definition.name}</option>)}
                  </select>
                  {activeModule?.type === 'draw-picture' && (
                    <div className="activity-inputs">
                      <label htmlFor="draw-prompt">Draw a picture of…</label>
                      <textarea id="draw-prompt" rows={3} value={activeModule.prompt} maxLength={130}
                        placeholder="David facing Goliath"
                        onChange={(e) => editModule({ prompt: e.target.value })} />
                      <p>The phrase “Draw a picture of” is added automatically.</p>
                    </div>
                  )}
                  {activeModule?.type === 'match-words' && (
                    <div className="activity-inputs">
                      <label htmlFor="matching-pairs">Matching pairs (3–6)</label>
                      <textarea id="matching-pairs" rows={7} value={activeModule.pairs}
                        placeholder={'Paul, Pharisee\nPeter, Fisherman\nJesus, Savior'}
                        onChange={(e) => editModule({ pairs: e.target.value })} />
                      <p>Enter one pair per line, with a comma between the two words. Left items stay in order; right items are shuffled.</p>
                    </div>
                  )}
                  {activeModule?.type === 'finish-story' && (
                    <div className="activity-inputs">
                      <label htmlFor="story-text">Story with 6–12 missing words</label>
                      <textarea id="story-text" rows={10} value={activeModule.story} ref={storyInputRef}
                        placeholder={'[David] was a young [shepherd]. He faced the giant [Goliath] with a [sling] and five [stones]. David trusted in [God].'}
                        onChange={(e) => editModule({ story: e.target.value })} />
                      <button type="button" className="mark-blank" onMouseDown={e=>e.preventDefault()}
                        onClick={markSelectedStoryWord}>Make selected word a blank</button>
                      <p>Double-click a word, then choose “Make selected word a blank.” You can still type [brackets] manually. Repeated words are marked one occurrence at a time.</p>
                    </div>
                  )}
                  {activeModule && isSmallModule(activeModule) && (
                    <SmallModuleEditor module={activeModule} onChange={(patch) => editModule(patch)} />
                  )}
                  {activeModule && isStoryVerseModule(activeModule) && (
                    <StoryVerseEditor module={activeModule} onChange={(patch) => editModule(patch)} />
                  )}
                  {activeModule && isPuzzleModule(activeModule) && (
                    <PuzzleEditor module={activeModule} onChange={(patch) => editModule(patch)} showSolution={showSolution} />
                  )}
                  {activeModule && isCryptogram(activeModule) && (
                    <CryptogramEditor module={activeModule} onChange={(patch) => editModule(patch)} />
                  )}
                  {activeRegion?.size==='medium'&&activeModule?.type==='connect-verse'&&
                    <p className="activity-section-info">This saved Medium Connect the Verse remains
                      editable and printable. New Connect the Verse activities use a Large space.</p>}
                  {activeModule && isSpecialtyModule(activeModule) && (
                    <SpecialtyEditor module={activeModule} onChange={(patch) => editModule(patch)} />
                  )}
                  {activeModule && isPuzzleModule(activeModule) && validation.length === 0 && (
                    <button type="button" className="puzzle-solution-toggle"
                      aria-pressed={showSolution} onClick={() => setSolutionKey(showSolution ? null : activeKey)}>
                      {showSolution ? 'Hide puzzle solution' : 'Show puzzle solution'}
                    </button>
                  )}
                  {activeModule && 'seed' in activeModule && (
                    <button type="button" className="regenerate-module" onClick={regenerateModule}>
                      {isCryptogramId(activeModule.type) ? 'Regenerate symbol key' : activeModule.type === 'crossword' ? 'Regenerate crossword' : isPuzzleId(activeModule.type) ? 'Regenerate puzzle' : 'Shuffle ' + (activeModule.type === 'match-words' ? 'matching answers'
                        : activeModule.type === 'finish-story' ? 'word bank'
                        : activeModule.type === 'multiple-choice' ? 'answer choices'
                        : activeModule.type === 'unscramble-words' || activeModule.type === 'unscramble-verse' ? 'letters'
                        : activeModule.type === 'finish-verse' ? 'verse word bank'
                        : activeModule.type === 'story-order' ? 'event order'
                        : activeModule.type === 'sort-story' ? 'statement order'
                        : activeModule.type === 'connect-verse' || activeModule.type === 'connect-big-idea' ? 'scattered words'
                        : 'word order')} ↻
                    </button>
                  )}
                  {validation.length > 0 && (
                    <div className="activity-validation" role="status">
                      {validation.map((error) => <p key={error}>{error}</p>)}
                    </div>
                  )}
                  {activeModule && validation.length === 0 && <p className="activity-ready">✓ Ready to export in the booklet PDF</p>}
                  {!activeModule && <p className="activity-section-info">Select a module above to begin.</p>}
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
                  <BookletPage page={page} draft={draft} selectedId={activeRegion?.id} onSelect={selectRegion} showSolution={showSolution} />
                ) : (
                  <div className="print-sheet" aria-label={activeSheet.name}>
                    {activeSheet.pages.map((number) => (
                      <div key={number} className={'sheet-half ' + (number === page ? 'selected-half' : '')}>
                        <BookletPage page={number} draft={draft} selectedId={number === page ? activeRegion?.id : undefined} onSelect={selectRegion} showSolution={showSolution && number === page} />
                      </div>
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
              <p className="preview-disclaimer">ⓘ This preview scales to your screen; Download PDF creates two landscape US Letter pages in booklet order. Print at 100% / Actual size, double-sided, and flip on the short edge. Empty regions remain placeholders; filled regions export real activities.</p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
