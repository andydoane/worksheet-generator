import test from 'node:test';
import assert from 'node:assert/strict';
import {markWordSelection} from '../src/storySelection.ts';
test('Windows double-click selecting a trailing space marks only the word',()=>{
 const text='David trusted God and David trusted again.';
 const a=markWordSelection(text,0,6);
 assert.equal(a?.text,'[David] trusted God and David trusted again.');
 assert.equal(a?.selectionStart,1);
 assert.equal(a?.selectionEnd,6);
});
test('duplicate words are marked by exact selection position',()=>{
 const text='David trusted God and David trusted again.';
 const start=text.lastIndexOf('David');
 const a=markWordSelection(text,start,start+6);
 assert.equal(a?.text,'David trusted God and [David] trusted again.');
});
test('leading and trailing selection whitespace is preserved',()=>{
 const text='The good shepherd speaks.';
 const a=markWordSelection(text,3,18);
 assert.equal(a,null,'multiword selections remain rejected');
});
test('space and punctuation selection never brackets across words',()=>{
 assert.equal(markWordSelection('The good shepherd.',4,18),null);
 assert.equal(markWordSelection('[David] prayed.',1,6),null);
 assert.equal(markWordSelection('Hi',0,99),null);
});
test('caret expands to the word under the cursor',()=>{
 const r=markWordSelection('David prayed.',2,2);
 assert.equal(r?.text,'[David] prayed.');
});
