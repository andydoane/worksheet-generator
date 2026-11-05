import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseBsbText,getBsbPassage} from '../src/review/bsb.ts';

const file='public/bible/bsb.txt',checksumFile='public/bible/bsb.sha256';
const bytes=await readFile(file);
const expected=(await readFile(checksumFile,'utf8')).trim();
if(!/^[a-f0-9]{64}$/u.test(expected))throw Error('BSB checksum must contain one SHA-256 hex digest.');
const actual=createHash('sha256').update(bytes).digest('hex');
if(actual!==expected)throw Error('Committed BSB text differs from its pinned checksum. Review publisher changes before updating.');
const index=parseBsbText(bytes.toString('utf8'),true);
for(const ref of ['Genesis 1:1','Exodus 15:11','Psalm 23:1','John 3:16','Revelation 22:21']){
 const passage=getBsbPassage(index,ref);
 if(!passage.text.trim())throw Error('Missing BSB text for '+ref);
}
console.log('Verified committed BSB corpus: '+index.books.length+' books, '+
 index.count+' verses, sha256 '+actual);
