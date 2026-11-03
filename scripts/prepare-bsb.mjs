import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseBsbText,getBsbPassage} from '../src/review/bsb.ts';
const source='https://bereanbible.com/bsb.txt';
const response=await fetch(source,{signal:AbortSignal.timeout(60000),headers:{'User-Agent':'WorksheetStudioCurriculumReview/1.0'}});
if(!response.ok)throw Error('Publisher BSB download failed: '+response.status);
const bytes=Buffer.from(await response.arrayBuffer());
const text=bytes.toString('utf8');
const index=parseBsbText(text,true);
const verse=getBsbPassage(index,'Exodus 15:11');
if(!verse.text.includes('Who among the gods is like You'))
 throw Error('The official BSB Exodus 15:11 did not match the expected wording.');
await mkdir('public/review',{recursive:true});
await writeFile('public/review/bsb.txt',bytes);
console.log('Official BSB: '+index.books.length+' books, '+index.count+' verse records, sha256 '+createHash('sha256').update(bytes).digest('hex'));
console.log('Publisher source: '+source+'; terms: https://berean.bible/terms.htm');
