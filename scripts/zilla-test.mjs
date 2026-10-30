import { readFile, readdir } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const examples = ['MATCH THE WORDS', 'PAUL PETER JESUS', 'SHEPHERD FISHERMAN PHARISEE', '123 ABC XYZ'];
const sources = [
  {name: 'original.ttf', path: 'fonts/ZillaSlab-Bold.ttf'},
  ...(await readdir('artifacts/zilla-candidates')).map(name=>({name,path:'artifacts/zilla-candidates/'+name})),
];
let succeeded = 0;
for (const candidate of sources) {
  try {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const font = await doc.embedFont(await readFile(candidate.path), {subset:false});
    const page = doc.addPage([792,612]);
    for(let i=0;i<examples.length;i++){
      const text=examples[i];
      const width=font.widthOfTextAtSize(text,14);
      page.drawText(text,{x:60,y:550-i*40,font,size:14});
      if(!Number.isFinite(width)) throw new Error('non-finite text width');
    }
    const pdf=await doc.save();
    console.log('OK',candidate.name,pdf.length);
    succeeded++;
  } catch(error) {
    console.log('FAIL',candidate.name,error instanceof Error?error.stack?.slice(0,900):String(error));
  }
}
if(succeeded===0) process.exitCode=1;
