import type {PublicLessonEntry} from './publishedLessonCatalog.ts';

/** Canonical book order supports library grouping, even after the catalog
 * grows beyond 100 lessons. Never infer publication status from these labels.
 */
export const OLD_TESTAMENT_BOOKS=[
 'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
 '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles',
 'Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes',
 'Song of Solomon','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel',
 'Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk',
 'Zephaniah','Haggai','Zechariah','Malachi',
] as const;
export const NEW_TESTAMENT_BOOKS=[
 'Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians',
 'Galatians','Ephesians','Philippians','Colossians','1 Thessalonians',
 '2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon',
 'Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John',
 'Jude','Revelation',
] as const;

const BOOKS=[...OLD_TESTAMENT_BOOKS,...NEW_TESTAMENT_BOOKS];
export type StoryTestamentFilter='all'|'ot'|'nt';
export type StoryLibraryFilters={query:string;testament:StoryTestamentFilter;book:string};

const simplified=(value:string)=>value.normalize('NFKD').replace(/[\u0300-\u036f]/gu,'')
 .trim().toLocaleLowerCase('en-US').replace(/\s+/gu,' ');
const ALIASES:Record<string,string>={
 'psalm':'Psalms','psalms':'Psalms',
 'song of songs':'Song of Solomon','song of solomon':'Song of Solomon',
};
const bookCandidates=[...BOOKS.map(book=>[book.toLowerCase(),book] as const),
 ...Object.entries(ALIASES)].sort((a,b)=>b[0].length-a[0].length);

/** Prefer the primary story reference over the memory verse. A multi-book
 * Scripture range is grouped with its first book. Unknown sources stay visible.
 */
export function bookFromReference(reference:string):string|null{
 const text=simplified(reference);
 for(const [prefix,book] of bookCandidates){
  if(text===prefix||text.startsWith(prefix+' ')||text.startsWith(prefix+':')||
   (text.startsWith(prefix)&&/^\d/u.test(text.slice(prefix.length, prefix.length+1))))
   return book;
 }
 return null;
}
export function storyReference(entry:PublicLessonEntry):string{
 const details=entry.lesson.lessonDetails;
 return details.scriptureDisplay?.trim()||
  details.scripturePassages?.filter(Boolean).join(', ')||
  details.memoryVerse?.reference?.trim()||'';
}
export function storyBook(entry:PublicLessonEntry):string{
 const details=entry.lesson.lessonDetails;
 return bookFromReference(details.scriptureDisplay??'')||
  (details.scripturePassages??[]).map(bookFromReference).find(Boolean)||
  bookFromReference(details.memoryVerse?.reference??'')||'Other';
}
export function storyTestament(entry:PublicLessonEntry):'ot'|'nt'|'other'{
 const book=storyBook(entry);
 if(OLD_TESTAMENT_BOOKS.some(x=>x===book))return 'ot';
 if(NEW_TESTAMENT_BOOKS.some(x=>x===book))return 'nt';
 // A lesson can use a nonstandard range such as "Wilderness passages";
 // still allow its known curriculum series to be filtered accurately.
 if(/^ot-/u.test(entry.lesson.id))return 'ot';
 if(/^nt-/u.test(entry.lesson.id))return 'nt';
 return 'other';
}
export function filterPublicStories(stories:readonly PublicLessonEntry[],
 filters:StoryLibraryFilters):PublicLessonEntry[]{
 const terms=simplified(filters.query).split(' ').filter(Boolean);
 return stories.filter(entry=>{
  if(filters.testament!=='all'&&storyTestament(entry)!==filters.testament)return false;
  if(filters.book!=='all'&&storyBook(entry)!==filters.book)return false;
  const d=entry.lesson.lessonDetails;
  const book=storyBook(entry),text=simplified([
   d.title,storyReference(entry),...(d.scripturePassages??[]),
   d.memoryVerse?.reference??'',book,entry.lesson.id,
  ].join(' '));
  return terms.every(term=>text.includes(term));
 });
}
export function availableStoryBooks(stories:readonly PublicLessonEntry[],
 testament:StoryTestamentFilter='all'):string[]{
 const found=new Set(stories.filter(entry=>testament==='all'||
  storyTestament(entry)===testament).map(storyBook));
 return [...BOOKS.filter(book=>found.has(book)),...(found.has('Other')?['Other']:[])];
}
export type StoryBookGroup={book:string;stories:PublicLessonEntry[]};
export function groupPublicStories(stories:readonly PublicLessonEntry[]):StoryBookGroup[]{
 const byBook=new Map<string,PublicLessonEntry[]>();
 for(const entry of stories){
  const book=storyBook(entry);
  if(!byBook.has(book))byBook.set(book,[]);
  byBook.get(book)!.push(entry);
 }
 const order=availableStoryBooks(stories);
 return order.map(book=>({book,stories:byBook.get(book)??[]}));
}
