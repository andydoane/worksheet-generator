import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EMPTY_DRAFT,migrateDraftValue} from '../src/draftMigration.ts';

const file=(name)=>readFile(new URL('../src/'+name,import.meta.url),'utf8');

test('Clicking the cover title navigates to Lesson details and focuses the title input',async()=>{
 const app=await file('App.tsx');
 assert.match(app,/<button type="button" key=\{region\.id\} className=\{className\} style=\{style\}\s+aria-label="Edit worksheet title on front cover" title="Click to edit worksheet title"\s+onClick=\{onSelectTitle\}>\{content\}<\/button>/u);
 assert.match(app,/function selectCoverTitle\(\) \{\s+setPage\(1\);\s+setSelectedRegionId\('cover-activity'\);\s+setTab\('details'\);\s+focusTitleField\(\);/u);
 assert.match(app,/requestAnimationFrame\(\(\) => titleInputRef\.current\?\.focus\(\)\)/u);
 assert.match(app,/<input id="title" ref=\{titleInputRef\}/u);
 // Both preview modes must wire the same handler; print-sheet may display page 1 next to page 4.
 assert.equal((app.match(/onSelectTitle=\{selectCoverTitle\}/gu)??[]).length,2);
 // Activities retain their previous click-to-edit behavior.
 assert.match(app,/onClick=\{\(\) => onSelect\(page, region\.id\)\}/u);
 const css=await file('layout.css');
 assert.match(css,/\.booklet-region\.title-region:focus-visible/u);
 assert.match(css,/\.booklet-region\.title-region:hover/u);
});

test('Start Fresh requires confirmation and resets all workspace state only after approval',async()=>{
 const app=await file('App.tsx');
 const start=app.indexOf('  function handleStartFresh() {');
 const stop=app.indexOf('\n  function setModuleType(',start);
 assert.ok(start>=0&&stop>start);
 const handler=app.slice(start,stop);
 const confirmation=handler.indexOf('window.confirm(');
 const reset=handler.indexOf('setDraft(structuredClone(blank))');
 assert.ok(confirmation>=0&&reset>confirmation,'confirmation must precede any draft reset');
 assert.match(handler,/if \(!window\.confirm\([\s\S]+?\)\) return;/u);
 for(const command of [
  "setPage(1)","setSelectedRegionId('cover-activity')","setTab('details')",
  "setMode('page')","setSolutionKey(null)","setExportError(null)",
  "setBorderGalleryOpen(false)","focusTitleField()"
 ])assert.ok(handler.includes(command),'missing reset of '+command);
 assert.match(app,/className="start-fresh-button" type="button" disabled=\{exporting\} onClick=\{handleStartFresh\}/u);
 assert.match(app,/window\.localStorage\.setItem\(KEY, JSON\.stringify\(draft\)\)/u);
 assert.match(app,/const KEY = 'worksheet-studio:draft:v1';/u);
 // Fresh drafts have independent nested objects. Reset must never alter a prior snapshot.
 const prior=migrateDraftValue({title:'Teacher draft',scripture:'Exodus 14',
  layouts:{2:'medium-large'},modules:{},activityBorders:{}});
 const fresh=structuredClone(EMPTY_DRAFT);
 fresh.title='A new worksheet';
 fresh.layouts[2]='bogus';
 assert.equal(prior.title,'Teacher draft');
 assert.equal(prior.scripture,'Exodus 14');
 assert.equal(EMPTY_DRAFT.title,'');
 assert.notEqual(EMPTY_DRAFT.layouts[2],'bogus');
 assert.deepEqual(structuredClone(EMPTY_DRAFT),EMPTY_DRAFT);
});

test('Compact toolbar replaces the old introduction but retains typography and build version',async()=>{
 const [app,styles]=await Promise.all([file('App.tsx'),file('styles.css')]);
 assert.match(app,/<header className="topbar">[\s\S]*?<h1>Design your <em>Bible Worksheet\.<\/em><\/h1>/u);
 assert.match(app,/className="topbar-version">Worksheet Studio · v\{pkg\.version\}/u);
 assert.match(app,/className="save-indicator"/u);
 assert.match(app,/className="export-button export-ready"/u);
 assert.doesNotMatch(app,/className="intro"/u);
 assert.doesNotMatch(app,/className="breadcrumb"/u);
 assert.match(styles,/\.topbar-heading h1 \{ font: 400 clamp\(43px, 4\.4vw, 62px\)\/1 'Mouse Memoirs'/u);
 assert.match(styles,/\.topbar-heading h1 em \{ font-style: normal; color: #d58753;/u);
 assert.match(styles,/@media \(max-width: 1180px\)[\s\S]*?\.topbar \{ align-items: flex-start; flex-wrap: wrap;/u);
 assert.match(styles,/@media \(max-width: 700px\)[\s\S]*?\.topbar-heading h1 \{ font-size: clamp\(36px, 9vw, 47px\)/u);
});

test('Peach validation appears between module instructions and editable inputs, not at the page bottom',async()=>{
 const app=await file('App.tsx');
 const section=app.slice(app.indexOf('<div className="activity-editor"'),
  app.indexOf('</section>',app.indexOf('<div className="activity-editor"')));
 const guide=section.indexOf('className="activity-guidance"');
 const errors=section.indexOf('className="activity-validation"');
 const fields=section.indexOf('id="draw-prompt"');
 const borderPicker=section.indexOf('<ActivityBorderPicker');
 assert.ok(guide>=0&&errors>guide&&borderPicker>errors&&fields>borderPicker,
  'show validation after guidance, above border controls and all input fields');
 assert.equal((section.match(/className="activity-validation"/gu)??[]).length,1);
 assert.match(section,/role="status" aria-live="polite"/u);
 assert.match(section,/explainActivityError\(activeModule!,error\)/u);
 assert.match(section,/validation\.length === 0 && <p className="activity-ready"/u);
 const css=await file('layout.css');
 assert.match(css,/\.activity-validation \{ background: #fff4e9; border: 1px solid #e8c6a2;/u);
});

test('PDF errors remain distinct from field validation, with no large intro',async()=>{
 const app=await file('App.tsx');
 assert.match(app,/<main className="main">\s+\{exportError && <p className="pdf-error" role="alert">\{exportError\}<\/p>\}/u);
 assert.match(app,/setExportError\(error instanceof Error \? error\.message/u);
 const styles=await file('styles.css');
 assert.match(styles,/\.pdf-error \{ margin: 0 0 20px; \}/u);
});
