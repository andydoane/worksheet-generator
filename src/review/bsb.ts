/** Public-domain BSB verse lookup. Source: https://bereanbible.com/bsb.txt
 * Publisher terms: https://berean.bible/terms.htm (30 Apr 2023).
 * Corpus is fetched into public/review/bsb.txt at deployment, never bundled with lesson JSON.
 */
export type BsbIndex = {verses:Record<string,string>; books:string[]; count:number};
export type Passage = {reference:string; text:string; citations:string[]};
export type WordSpan = {word:string;start:number;end:number};

export function parseBsbText(raw:string,requireComplete=true):BsbIndex {
 const verses:Record<string,string>={};
 const books=new Set<string>();
 const line=/^(.+?) (\d+):(\d+)\t(.*)$/u;
 let count=0;
 for(const lineText of raw.replace(/^\uFEFF/u,'').split(/\r?\n/u)){
  const match=lineText.match(line);
  if(!match)continue;
  const book=match[1].trim();
  const chapter=Number(match[2]),verse=Number(match[3]);
  if(!book||!Number.isInteger(chapter)||!Number.isInteger(verse)||chapter<1||verse<1)continue;
  const key=book+' '+chapter+':'+verse;
  if(Object.prototype.hasOwnProperty.call(verses,key))throw Error('Duplicate Bible verse: '+key);
  verses[key]=match[4].trim();
  books.add(book);
  count++;
 }
 if(!count)throw Error('No Bible verses found. Use the official tab-delimited bsb.txt.');
 if(requireComplete&&(count<30000||books.size!==66))
  throw Error('BSB file appears incomplete ('+books.size+' books, '+count+' verses).');
 return {verses,books:[...books],count};
}

export function getBsbPassage(index:BsbIndex,input:string):Passage {
 const match=input.trim().match(/^(.+?)\s+(\d+):(\d+)(?:\s*[-–]\s*(?:(\d+):)?(\d+))?$/u);
 if(!match)throw Error('Enter a reference such as Exodus 15:11 or Exodus 15:11-12.');
 const book=index.books.find(x=>x.toLowerCase()===match[1].trim().toLowerCase());
 if(!book)throw Error('Book not found in the BSB file: '+match[1]);
 const ch=Number(match[2]),v=Number(match[3]),endCh=match[4]?Number(match[4]):ch;
 const endV=match[5]?Number(match[5]):v;
 if(ch<1||v<1||endCh<ch||(endCh===ch&&endV<v)||endCh-ch>1)
  throw Error('Select a forward verse range spanning no more than two chapters.');
 const citations:string[]=[];
 const parts:string[]=[];
 let currentCh=ch,currentV=v;
 for(let n=0;n<12;n++){
  const key=book+' '+currentCh+':'+currentV;
  if(!Object.prototype.hasOwnProperty.call(index.verses,key))
   throw Error('Verse not found in this BSB edition: '+key);
  const verse=index.verses[key];
  if(!verse)throw Error('This verse is omitted from the BSB text: '+key);
  citations.push(key);parts.push(verse);
  if(currentCh===endCh&&currentV===endV)break;
  currentV++;
  if(!Object.prototype.hasOwnProperty.call(index.verses,book+' '+currentCh+':'+currentV)){
   currentCh++;currentV=1;
  }
 }
 if(citations.at(-1)!==book+' '+endCh+':'+endV)
  throw Error('Select at most twelve consecutive verses.');
 return {reference:book+' '+ch+':'+v+(ch!==endCh?'-'+endCh+':'+endV:v!==endV?'-'+endV:''),text:parts.join(' '),citations};
}

export function wordSpans(text:string):WordSpan[]{
 return [...text.matchAll(/[\p{L}]+(?:['’\-][\p{L}]+)*/gu)].map(m=>({
  word:m[0],start:m.index??0,end:(m.index??0)+m[0].length,
 }));
}
export function clipToWords(text:string,start:number,end:number):string{
 const words=wordSpans(text);
 if(!words.length||!Number.isInteger(start)||!Number.isInteger(end)||
    start<0||end<start||end>=words.length)throw Error('Invalid excerpt boundaries.');
 // Preserve all characters BETWEEN the selected words, but no outside punctuation.
 const begin=start===0?0:words[start].start;
 const finish=end===words.length-1?text.length:words[end+1].start;
 return text.slice(begin,finish).trim();
}
export function markSelectedWords(text:string,selected:number[]):string{
 const words=wordSpans(text);
 const unique=[...new Set(selected)].sort((a,b)=>a-b);
 let result=text;
 for(const i of unique.reverse()){
  const span=words[i];
  if(!span)throw Error('Blank word index is out of range.');
  if(!/^[\p{L}]+$/u.test(span.word)||span.word.length>9)
   throw Error('Blank words must be single words of at most 9 letters.');
  result=result.slice(0,span.start)+'['+span.word+']'+result.slice(span.end);
 }
 return result;
}
export function suggestBlankWords(text:string,count=5):number[]{
 const words=wordSpans(text);
 const eligible=words.flatMap((x,i)=>/^[\p{L}]{3,9}$/u.test(x.word)?[i]:[]);
 if(eligible.length<count)return eligible;
 return Array.from({length:count},(_,i)=>eligible[Math.min(eligible.length-1,Math.round((i+0.5)*eligible.length/count-0.5))]);
}
