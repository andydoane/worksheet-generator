import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
 SIDEBAR_COLLAPSED_KEY,sidebarCollapsedFromValue,readSidebarCollapsed,saveSidebarCollapsed,
} from '../src/sidebarPreference.ts';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('Sidebar preference defaults open and persists only the sidebar key',()=>{
 const values=new Map([['worksheet-studio:draft:v1','{"title":"Saved draft","modules":{}}']]);
 const store={
  getItem(key){return values.get(key)??null;},
  setItem(key,value){values.set(key,value);},
 };
 assert.equal(SIDEBAR_COLLAPSED_KEY,'worksheet-studio:sidebar-collapsed:v1');
 assert.equal(readSidebarCollapsed(store),false);
 saveSidebarCollapsed(true,store);
 assert.equal(values.get(SIDEBAR_COLLAPSED_KEY),'collapsed');
 assert.equal(readSidebarCollapsed(store),true);
 assert.equal(values.get('worksheet-studio:draft:v1'),'{"title":"Saved draft","modules":{}}');
 saveSidebarCollapsed(false,store);
 assert.equal(values.get(SIDEBAR_COLLAPSED_KEY),'expanded');
 assert.equal(readSidebarCollapsed(store),false);
 for(const input of [null,'','false','true','expanded','corrupt'])
  assert.equal(sidebarCollapsedFromValue(input),false);
 assert.equal(sidebarCollapsedFromValue('collapsed'),true);
});

test('Storage errors never crash the editor or change its default preference',()=>{
 const blocked={
  getItem(){throw Error('storage unavailable');},
  setItem(){throw Error('storage unavailable');},
 };
 assert.equal(readSidebarCollapsed(blocked),false);
 assert.doesNotThrow(()=>saveSidebarCollapsed(true,blocked));
 assert.doesNotThrow(()=>saveSidebarCollapsed(false,blocked));
});

test('Sidebar Home leads to welcome, above workspace, without replacing top-right Home',async()=>{
 const app=await read('src/App.tsx');
 const sidebarStart=app.indexOf('<aside className="sidebar"');
 const asideEnd=app.indexOf('</aside>',sidebarStart);
 const aside=app.slice(sidebarStart,asideEnd);
 assert.ok(sidebarStart>=0&&asideEnd>sidebarStart);
 const home=aside.indexOf('className="sidebar-home"');
 const workspace=aside.indexOf('YOUR WORKSPACE');
 assert.ok(home>0&&workspace>home,'Home should sit above Your Workspace');
 assert.match(aside,/className="sidebar-home" onClick=\{\(\)=>setView\('welcome'\)\}/u);
 assert.match(aside,/aria-label="Home" title="Home"/u);
 assert.match(app,/className="welcome-home-button" type="button" onClick=\{\(\)=>setView\('welcome'\)\}>Home/u);
 assert.match(app,/useState<'welcome'\|'editor'>\('welcome'\)/u,'Welcome onboarding stays intact');
});

test('Collapsed rail retains every editor/page button with accessible names and actions',async()=>{
 const app=await read('src/App.tsx');
 const aside=app.slice(app.indexOf('<aside className="sidebar"'),app.indexOf('</aside>'));
 assert.match(app,/sidebarCollapsed\?' sidebar-is-collapsed':''/u);
 assert.match(app,/useState\(readSidebarCollapsed\)/u);
 assert.match(app,/saveSidebarCollapsed\(sidebarCollapsed\)/u);
 assert.match(aside,/aria-expanded=\{!sidebarCollapsed\} aria-controls="worksheet-sidebar-navigation"/u);
 assert.match(aside,/aria-label=\{sidebarCollapsed\?'Expand sidebar':'Collapse sidebar'\}/u);
 assert.match(aside,/onClick=\{\(\)=>setSidebarCollapsed\(value=>!value\)\}/u);
 assert.match(aside,/aria-label="Worksheet navigation"/u);
 for(const label of ['Worksheet details','Page layouts','Activity modules'])
  assert.ok(aside.includes('aria-label="'+label+'" title="'+label+'"'),label);
 for(const tab of ['details','layouts','activities'])
  assert.ok(aside.includes("setTab('"+tab+"')"),tab);
 assert.match(aside,/aria-current=\{tab === 'details' \? 'step' : undefined\}/u);
 assert.match(aside,/onClick=\{\(\) => selectPage\(item\.number\)\}/u);
 assert.match(aside,/aria-label=\{'Page '\+item\.number\+': '\+item\.label\}/u);
 assert.match(aside,/aria-current=\{page === item\.number \? 'page' : undefined\}/u);
 assert.match(app,/className="editor-tabs" role="tablist"/u,'Main editor tabs remain intact');
});

test('Desktop width changes with rail; mobile restores brand and hides rail/toggle',async()=>{
 const css=await read('src/styles.css');
 assert.match(css,/\.app-shell \{ display: grid; grid-template-columns: 255px/u);
 assert.match(css,/\.app-shell\.sidebar-is-collapsed \{ grid-template-columns: 76px minmax\(0, 1fr\); \}/u);
 assert.match(css,/\.sidebar-is-collapsed \.sidebar-brand-copy,/u);
 assert.match(css,/\.sidebar-is-collapsed \.sidebar-step-copy,/u);
 assert.match(css,/\.sidebar-is-collapsed \.sidebar-page-copy,/u);
 assert.match(css,/\.sidebar-is-collapsed \.sidebar \.step-number/u);
 assert.match(css,/\.sidebar-is-collapsed \.sidebar \.page-number/u);
 const mobile=css.slice(css.lastIndexOf('@media (max-width: 700px)'));
 assert.match(mobile,/\.app-shell\.sidebar-is-collapsed \{ display: block; \}/u);
 assert.match(mobile,/\.sidebar-is-collapsed \.sidebar-brand-copy \{ display: block; \}/u);
 assert.match(mobile,/\.sidebar-toggle, \.sidebar-navigation \{ display: none; \}/u);
});
