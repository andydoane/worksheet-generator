import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('README prominently links the canonical living project handoff',async()=>{
 const readme=await read('README.md');
 const firstScreen=readme.slice(0,900);
 assert.match(firstScreen,/\[living Worksheet Studio project handoff\]\(docs\/PROJECT-HANDOFF\.md\)/);
 assert.match(firstScreen,/historical/u);
});

test('living handoff explains source-of-truth precedence and an actionable roadmap',async()=>{
 const handoff=await read('docs/PROJECT-HANDOFF.md');
 assert.match(handoff,/^# Worksheet Studio — Living Project Handoff$/mu);
 assert.match(handoff,/Snapshot, not source of truth/u);
 assert.match(handoff,/owner's newest instructions/u);
 assert.match(handoff,/^## 7\. Current work and upcoming plans$/mu);
 assert.match(handoff,/https:\/\/github\.com\/andydoane\/worksheet-generator\/issues\/95/u);
 assert.match(handoff,/https:\/\/github\.com\/andydoane\/worksheet-generator\/issues\/100/u);
 assert.match(handoff,/direct-to-`main`/u);
 assert.match(handoff,/Leave the PR unmerged/u);
 assert.match(handoff,/https:\/\/andydoane\.github\.io\/worksheet-generator\/review\.html/u);
});

test('handoff version agrees with package.json, and review date is real',async()=>{
 const handoff=await read('docs/PROJECT-HANDOFF.md');
 const pkg=JSON.parse(await read('package.json'));
 const match=handoff.match(/\*\*Package version represented by this change:\*\* `([^`]+)`/u);
 assert.ok(match,'Missing handoff package-version metadata');
 assert.equal(match[1],pkg.version,'Update living handoff in each code PR that bumps package version');
 const date=handoff.match(/\*\*Last checked against `main`:\*\* (\d{4}-\d{2}-\d{2})/u);
 assert.ok(date,'Missing last-verified date in project handoff');
 assert.ok(!Number.isNaN(Date.parse(date[1])),'Review date must be an actual ISO-style date');
});

test('PR template reminds code authors to maintain roadmap without gating direct curriculum uploads',async()=>{
 const template=await read('.github/PULL_REQUEST_TEMPLATE.md');
 assert.match(template,/docs\/PROJECT-HANDOFF\.md/u);
 assert.match(template,/Current work and upcoming plans/u);
 assert.match(template,/data-only approved curriculum upload/u);
 assert.match(template,/do \*\*not\*\* require a PR or handoff update/u);
});
