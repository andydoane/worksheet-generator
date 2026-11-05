import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseBsbText,getBsbPassage,wordSpans,clipToWords} from '../src/review/bsb.ts';
import {bsbAssetUrl,bsbChapters,bsbVerses,BSB_ASSET_PATH} from '../src/bsbLibrary.ts';

const read=path=>readFile(new URL('../'+path,import.meta.url));
const source=await read(BSB_ASSET_PATH.replace(/^/u,'public/'));
const index=parseBsbText(source.toString('utf8'),true);

test('Both apps use one complete, committed local BSB corpus and pinned checksum',async()=>{
 assert.equal(index.books.length,66);
 assert.ok(index.count>30000);
 assert.equal(bsbAssetUrl('/'),'/bible/bsb.txt');
 assert.equal(bsbAssetUrl('/worksheet-generator/'),'/worksheet-generator/bible/bsb.txt');
 const digest=(await read('public/bible/bsb.sha256')).toString('utf8').trim();
 assert.equal(createHash('sha256').update(source).digest('hex'),digest);
 const [review,workflow,prepare]=await Promise.all([
  read('src/review/ReviewApp.tsx').then(x=>x.toString()),
  read('.github/workflows/pages.yml').then(x=>x.toString()),
  read('scripts/prepare-bsb.mjs').then(x=>x.toString()),
 ]);
 assert.match(review,/loadBsbIndex\(import\.meta\.env\.BASE_URL\)/u);
 assert.doesNotMatch(review,/fetch\(import\.meta\.env\.BASE_URL\+'review\/bsb\.txt'\)/u);
 assert.match(workflow,/npm run verify:bsb/u);
 assert.doesNotMatch(workflow,/npm run prepare:bsb/u,'CI must not download fresh Bible text');
 assert.match(prepare,/public\/bible\/bsb\.txt/u);
});

test('Picker can enumerate books, chapters and numbered verses from the local file',()=>{
 assert.ok(index.books.includes('Genesis'));
 assert.ok(index.books.includes('Exodus'));
 assert.ok(index.books.includes('Revelation'));
 assert.deepEqual(bsbChapters(index,'Genesis').slice(0,3),[1,2,3]);
 assert.equal(bsbChapters(index,'Genesis').at(-1),50);
 assert.ok(bsbVerses(index,'Genesis',1).includes(31));
 assert.ok(bsbVerses(index,'Exodus',15).includes(11));
 assert.deepEqual(bsbVerses(index,'missing-book',1),[]);
 assert.deepEqual(bsbChapters(index,'missing-book'),[]);
});

test('Official verses, consecutive ranges, excerpt word boundaries, and range limits work',()=>{
 for(const ref of ['Genesis 1:1','Psalm 23:1','Exodus 15:11','John 3:16','Revelation 22:21']){
  const result=getBsbPassage(index,ref);
  assert.ok(result.text.length>5);
  assert.equal(result.reference,ref);
 }
 const range=getBsbPassage(index,'John 3:16-17');
 assert.equal(range.citations.length,2);
 const words=wordSpans(range.text);
 assert.ok(words.length>10);
 const excerpt=clipToWords(range.text,0,Math.min(6,words.length-1));
 assert.ok(excerpt.length<range.text.length&&excerpt.length>5);
 assert.throws(()=>getBsbPassage(index,'Exodus 15:11-99'),/not found|twelve/u);
 const tooMany=getBsbPassage.bind(null,index,'Psalm 119:1-13');
 assert.throws(tooMany,/at most twelve/u);
});

test('Reusable picker exposes excerpt, early length guard and per-module validation',async()=>{
 const text=(await read('src/BsbPassagePicker.tsx')).toString('utf8');
 assert.match(text,/loadBsbIndex\(import\.meta\.env\.BASE_URL\)/u);
 assert.match(text,/validateSelection\?\.\(selection\)/u);
 assert.match(text,/maxCharacters/u);
 assert.match(text,/clipToWords\(/u);
 assert.match(text,/disabled=\{!selection\|\|issues\.length>0\}/u);
 assert.match(text,/onApply\(selection\)/u);
});
