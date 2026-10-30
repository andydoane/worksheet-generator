import { useEffect, useState } from 'react';

type PageNumber = 1 | 2 | 3 | 4;

type Draft = {
  title: string;
  scripture: string;
  bigIdea: string;
  verseReference: string;
  verseText: string;
};

const KEY = 'worksheet-studio:draft:v1';
const blank: Draft = {
  title: '',
  scripture: '',
  bigIdea: '',
  verseReference: '',
  verseText: '',
};

function readDraft(): Draft {
  try {
    const data = window.localStorage.getItem(KEY);
    if (!data) return blank;
    const parsed: unknown = JSON.parse(data);
    if (!parsed || typeof parsed !== 'object') return blank;
    const value = parsed as Partial<Draft>;
    return {
      title: typeof value.title === 'string' ? value.title : '',
      scripture: typeof value.scripture === 'string' ? value.scripture : '',
      bigIdea: typeof value.bigIdea === 'string' ? value.bigIdea : '',
      verseReference: typeof value.verseReference === 'string' ? value.verseReference : '',
      verseText: typeof value.verseText === 'string' ? value.verseText : '',
    };
  } catch {
    return blank;
  }
}

const pages: { number: PageNumber; label: string }[] = [
  { number: 1, label: 'Front cover' },
  { number: 2, label: 'Inside left' },
  { number: 3, label: 'Inside right' },
  { number: 4, label: 'Back cover' },
];

export default function App() {
  const [draft, setDraft] = useState<Draft>(readDraft);
  const [page, setPage] = useState<PageNumber>(1);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(draft));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [draft]);

  function edit(field: keyof Draft, text: string) {
    setDraft((previous) => ({ ...previous, [field]: text }));
  }

  const selected = pages.find((item) => item.number === page) ?? pages[0];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon" aria-hidden="true">W<span>✦</span></span>
          <div>
            <strong>Worksheet Studio</strong>
            <small>Bible booklet maker</small>
          </div>
        </div>

        <div className="sidebar-group">
          <div className="nav-label">YOUR WORKSPACE</div>
          <div className="step current"><span className="step-number">01</span><div><strong>Worksheet details</strong><small>Ready to edit</small></div></div>
          <div className="step"><span className="step-number">02</span><div><strong>Page layouts</strong><small>Coming in PR 2</small></div></div>
          <div className="step"><span className="step-number">03</span><div><strong>Activities & export</strong><small>Future milestones</small></div></div>
        </div>

        <div className="sidebar-group page-nav">
          <div className="nav-label">BOOKLET PAGES</div>
          {pages.map((item) => (
            <button key={item.number} type="button" className={page === item.number ? 'page-link active' : 'page-link'}
              onClick={() => setPage(item.number)} aria-current={page === item.number ? 'page' : undefined}>
              <span className="page-number">{item.number}</span>{item.label}
            </button>
          ))}
        </div>
        <div className="sidebar-foot"><span aria-hidden="true">●</span> Foundation release · PR 1</div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <span className="breadcrumb">WORKSPACE <span>/</span> NEW BOOKLET</span>
          <div className="topbar-right">
            <span className="save-indicator" role="status"><span className={saved ? 'dot saved' : 'dot'} />{saved ? 'Saved in this browser' : 'Browser saving unavailable'}</span>
            <button className="export-button" type="button" disabled title="PDF export is coming in PR 3">Export PDF ↗</button>
          </div>
        </header>

        <main className="main">
          <div className="intro">
            <span className="eyebrow">YOUR NEXT BIBLE STORY RESOURCE</span>
            <h1>Let's make a <em>great</em> booklet.</h1>
            <p>Start with your lesson details. Soon, you'll choose page layouts, add activities, and print a folded four-page worksheet.</p>
          </div>

          <div className="columns">
            <section className="panel" aria-labelledby="details-heading">
              <div className="panel-heading">
                <div><span className="eyebrow">STEP 01 OF 03</span><h2 id="details-heading">Worksheet details</h2></div>
                <span className="panel-icon" aria-hidden="true">✎</span>
              </div>
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
                  <p>Your edits stay in this browser. Module-specific inputs will be added in later releases.</p>
                </div>
              </div>
            </section>

            <section className="panel" aria-labelledby="preview-heading">
              <div className="panel-heading">
                <div><span className="eyebrow">A LOOK AHEAD</span><h2 id="preview-heading">Booklet preview</h2></div>
                <span className="paper-badge">US LETTER · BIFOLD</span>
              </div>
              <div className="preview-stage">
                <div className="paper" aria-label={'Placeholder preview of booklet page ' + page}>
                  <div className="safe-area">
                    {page === 1 ? (
                      <>
                        <div className="cover-heading">
                          <span className="preview-kicker">BIBLE STORY REVIEW</span>
                          <div className="cover-title">{draft.title.trim() || 'Your story title'}</div>
                          <div className="cover-reference">{draft.scripture.trim() || 'Scripture reference'}</div>
                        </div>
                        <div className="cover-placeholder">
                          <div className="placeholder-icon" aria-hidden="true">✦</div>
                          <strong>Large activity space</strong>
                          <span>Module placement will arrive in a later pull request.</span>
                        </div>
                      </>
                    ) : (
                      <div className="page-placeholder">
                        <span className="preview-kicker">BOOKLET PAGE {page}</span>
                        <div className="placeholder-icon" aria-hidden="true">▦</div>
                        <strong>Your activities will go here.</strong>
                        <span>Page layout choices are coming in PR 2.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="preview-bottom">
                <div><strong>Page {page} · {selected.label}</strong><small>{page === 1 ? 'Title + large activity' : 'Layout coming in PR 2'}</small></div>
                <nav className="page-switcher" aria-label="Preview booklet page">
                  {pages.map((item) => (
                    <button key={item.number} type="button" className={page === item.number ? 'active' : ''}
                      aria-label={'Preview page ' + item.number} aria-pressed={page === item.number} onClick={() => setPage(item.number)}>{item.number}</button>
                  ))}
                </nav>
              </div>
              <p className="preview-disclaimer">ⓘ This is an editor mockup, not a print-accurate PDF. Exact page geometry and export come in PRs 2 and 3.</p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
