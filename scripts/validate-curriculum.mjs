import {readFile,readdir} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const schemaPath=resolve(here,'../curriculum/schema/lesson-v1.schema.json');
const reviewDir=resolve(here,'../curriculum/review');
const approvedDir=resolve(here,'../curriculum/approved');
const knownModules=new Set([
 'draw-picture','multiple-choice','true-false','first-letters','odd-words',
 'unscramble-words','checkboxes','who-am-i','match-words','finish-verse',
 'unscramble-verse','circle-mistakes','medium-word-search','true-false-maze',
 'big-idea-cryptogram','upside-down-verse','connect-big-idea','pixel-picture',
 'finish-story','story-order','sort-story','draw-story','word-search',
 'verse-cryptogram','crossword','spiral-verse','connect-verse'
]);

/** Dependency-free subset of JSON Schema 2020-12 used in lesson-v1.schema.json.
 * Validate shape, field types, required keys, enums, refs, patterns and bounds.
 * This is NOT a replacement for a full schema engine or the module solvers.
 */
export function validateLessonSchema(value,schema){
 const errors=[];
 function inspect(item,rule,path){
  if(rule.$ref){
   const ref=rule.$ref;
   if(!ref.startsWith('#/$defs/')){errors.push(path+': unsupported schema ref '+ref);return;}
   const def=schema.$defs?.[ref.slice(8)];
   if(!def){errors.push(path+': unresolved schema ref '+ref);return;}
   inspect(item,def,path);return;
  }
  if('const' in rule&&item!==rule.const)errors.push(path+': expected '+JSON.stringify(rule.const));
  if('enum' in rule&&!rule.enum.includes(item))errors.push(path+': invalid enum value '+JSON.stringify(item));
  if(rule.type==='object'){
   if(item===null||typeof item!=='object'||Array.isArray(item)){errors.push(path+': expected an object');return;}
   for(const field of rule.required??[])if(!(field in item))errors.push(path+'.'+field+': required field missing');
   for(const [field,v] of Object.entries(item)){
    if(rule.properties?.[field])inspect(v,rule.properties[field],path+'.'+field);
    else if(rule.additionalProperties===false)errors.push(path+'.'+field+': unsupported field');
   }
  }
  if(rule.type==='array'){
   if(!Array.isArray(item)){errors.push(path+': expected an array');return;}
   if(rule.minItems!==undefined&&item.length<rule.minItems)errors.push(path+': too few items');
   if(rule.maxItems!==undefined&&item.length>rule.maxItems)errors.push(path+': too many items');
   if(rule.items)item.forEach((value,index)=>inspect(value,rule.items,path+'['+index+']'));
  }
  if(rule.type==='string'){
   if(typeof item!=='string'){errors.push(path+': expected a string');return;}
   if(rule.minLength!==undefined&&item.length<rule.minLength)errors.push(path+': too short');
   if(rule.maxLength!==undefined&&item.length>rule.maxLength)errors.push(path+': too long');
   if(rule.pattern&&!(new RegExp(rule.pattern,'u')).test(item))errors.push(path+': invalid format');
  }
  if(rule.type==='boolean'&&typeof item!=='boolean')errors.push(path+': expected a boolean');
  if(rule.type==='integer'&&!Number.isSafeInteger(item))errors.push(path+': expected an integer');
  if(rule.type==='number'&&(typeof item!=='number'||!Number.isFinite(item)))errors.push(path+': expected a finite number');
  if((rule.type==='integer'||rule.type==='number')&&typeof item==='number'){
   if(rule.minimum!==undefined&&item<rule.minimum)errors.push(path+': below minimum');
   if(rule.maximum!==undefined&&item>rule.maximum)errors.push(path+': above maximum');
  }
 }
 inspect(value,schema,'$');
 return errors;
}

export function validateLesson(lesson,schema){
 const errors=validateLessonSchema(lesson,schema);
 // Report structural failures without attempting semantic operations on malformed fields.
 if(errors.length)return errors;
 if(!lesson||typeof lesson!=='object'||Array.isArray(lesson))return errors;
 const notes=Array.isArray(lesson.storyNotes)?lesson.storyNotes:[];
 const questions=Array.isArray(lesson.questions)?lesson.questions:[];
 const facts=Array.isArray(lesson.facts)?lesson.facts:[];
 const related=[...notes,...questions,...facts];
 const seen=new Set();
 for(const [i,item] of related.entries()){
  if(!item||typeof item.id!=='string')continue;
  if(seen.has(item.id))errors.push('duplicate source ID '+item.id+' at index '+i);
  seen.add(item.id);
 }
 notes.forEach((note,i)=>{
  if(note.order!==i+1)errors.push('storyNotes['+i+']: order must be sequential starting at 1');
  if(note.origin!=='source')errors.push('storyNotes['+i+']: original notes must be source-authored');
  if(typeof note.originalText!=='string'||!note.originalText.trim()||
   typeof note.cleanText!=='string'||!note.cleanText.trim())errors.push('storyNotes['+i+']: missing source or cleaned text');
 });
 const sourceNames=new Set((lesson.sourceFiles??[]).map(x=>x.filename));
 function checkRefs(item,path){
  if(!item||typeof item!=='object')return;
  if(Array.isArray(item)){item.forEach((child,i)=>checkRefs(child,path+'['+i+']'));return;}
  if(Array.isArray(item.sourceIds))for(const id of item.sourceIds)if(!seen.has(id))
   errors.push(path+'.sourceIds: unknown source ID '+id);
  if(item.source?.filename&&!sourceNames.has(item.source.filename))
   errors.push(path+'.source.filename: not listed in sourceFiles');
  for(const [field,child] of Object.entries(item)){
   if(field==='sourceIds'||field==='source')continue;
   checkRefs(child,path+'.'+field);
  }
 }
 checkRefs(lesson,'$');
 const factsById=new Map(facts.map(x=>[x.id,x]));
 for(const fact of facts)if(fact.origin==='suggested'&&!fact.teacherReviewRequired)
  errors.push('suggested fact '+fact.id+' needs teacherReviewRequired=true');
 function checkPrepared(item,path){
  if(Array.isArray(item)){item.forEach((child,i)=>checkPrepared(child,path+'['+i+']'));return;}
  if(!item||typeof item!=='object')return;
  if(item.factId){
   const fact=factsById.get(item.factId);
   if(!fact)errors.push(path+': missing fact '+item.factId);
   else if(item.isTrue!==undefined&&item.isTrue!==fact.isTrue)
    errors.push(path+': truth value disagrees with '+item.factId);
  }
  if(Array.isArray(item.sourceQuestionIds))for(const id of item.sourceQuestionIds)
   if(!questions.some(q=>q.id===id))errors.push(path+': unknown question '+id);
  for(const [key,v] of Object.entries(item))
   if(v&&typeof v==='object'&&key!=='source')checkPrepared(v,path+'.'+key);
 }
 checkPrepared(lesson.preparedActivities,'$.preparedActivities');
 const readiness=Array.isArray(lesson.moduleReadiness)?lesson.moduleReadiness:[];
 const readinessIds=new Set();
 for(const entry of readiness){
  if(readinessIds.has(entry.moduleId))errors.push('duplicate module readiness: '+entry.moduleId);
  readinessIds.add(entry.moduleId);
  if(!knownModules.has(entry.moduleId))errors.push('unknown module in readiness: '+entry.moduleId);
  if(!(entry.preparedActivityKey in (lesson.preparedActivities??{}))&&entry.status==='READY')
   errors.push('module '+entry.moduleId+' marked READY without prepared activity');
 }
 if(readiness.length&&readiness.length!==knownModules.size)
  errors.push('moduleReadiness must account for all '+knownModules.size+' current modules');
 // Approved lesson drawing text contracts are validated independently of
 // the Review Studio. Historical unapproved handoff fixtures stay unmodified.
 if(lesson.publication?.approved===true){
  const p=lesson.preparedActivities??{};
  const small=[
   ...(lesson.drawingPrompts??[]).map((item,i)=>({item,path:'drawingPrompts['+i+']'})),
   ...(p.drawPicture?[{item:p.drawPicture,path:'preparedActivities.drawPicture'}]:[]),
  ];
  for(const {item,path} of small){
   const prompt=String(item.prompt??'').trim();
   if(!prompt||prompt.length>105||
      /^(?:draw|sketch|illustrate)\b/iu.test(prompt)||/[.!?]$/u.test(prompt))
    errors.push(path+': Small Draw a Picture must be a scene phrase without instructions or final punctuation, max 105 characters');
  }
  const captions=p.drawStory??[];
  if(captions.length>0){
   if(captions.length<4||captions.length>6)
    errors.push('preparedActivities.drawStory: needs 4–6 narrative captions');
   const seenCaptions=new Set();
   for(const [i,item] of captions.entries()){
    const text=String(item.prompt??'').trim();
    if(!text||text.length>105||!/^\p{Lu}/u.test(text)||
       !/[.!?](?:["”’])?$/u.test(text)||/^(?:draw|sketch|illustrate)\b/iu.test(text))
     errors.push('preparedActivities.drawStory['+i+']: needs a complete capitalized story sentence ending in punctuation (not a Draw command), max 105 characters');
    if(seenCaptions.has(text.toLocaleLowerCase()))
     errors.push('preparedActivities.drawStory['+i+']: duplicate narrative caption');
    seenCaptions.add(text.toLocaleLowerCase());
   }
  }
 }
 const pub=lesson.publication;
 if(pub){
  if(pub.approved!==(pub.status==='approved'))errors.push('publication status and approved must agree');
  if(pub.approved){
   if(!pub.teacherSignoff?.reviewer||!pub.teacherSignoff?.date)
    errors.push('publication approval requires an explicit teacher signoff');
   const rights=pub.scriptureRights;
   if(rights?.status!=='cleared'||typeof rights?.basis!=='string'||!rights.basis.trim()||
      typeof rights?.reviewedBy!=='string'||!rights.reviewedBy.trim()||
      typeof rights?.reviewedOn!=='string'||!/^\d{4}-\d{2}-\d{2}$/u.test(rights.reviewedOn)||
      !Number.isFinite(Date.parse(rights.reviewedOn))||
      new Date(rights.reviewedOn).toISOString().slice(0,10)!==rights.reviewedOn)
    errors.push('publication approval requires its own explicit Scripture rights clearance in publication.scriptureRights');
   const memory=lesson.lessonDetails?.memoryVerse;
   if(memory?.translation!=='BSB'||!memory?.text?.trim()||
      memory?.bsbSource?.sourceUrl!=='https://bereanbible.com/bsb.txt'||
      memory?.bsbSource?.publicDomainTerms!=='https://berean.bible/terms.htm')
    errors.push('publication requires verified Berean Standard Bible text and official BSB source/rights URLs');
   const unresolved=(lesson.reviewFlags??[]).filter(x=>
    x.type==='teacher-approval'&&!(pub.resolvedReviewFlagIds??[]).includes(x.id));
   if(unresolved.length)errors.push('publication approval has unresolved teacher review flags: '+unresolved.map(x=>x.id).join(', '));
  }
 }
 if(!Array.isArray(lesson.reviewFlags))errors.push('reviewFlags are required for approval workflow');
 return errors;
}

export async function validateCurriculumFiles(paths){
 const schema=JSON.parse(await readFile(schemaPath,'utf8'));
 const results=[];
 for(const path of paths){
  let data;
  try{data=JSON.parse(await readFile(path,'utf8'));}
  catch(error){results.push({path,errors:['Invalid JSON: '+String(error)]});continue;}
  results.push({path,errors:validateLesson(data,schema),lesson:data});
 }
 return results;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 const paths=args.length?args.map(x=>resolve(x)):[
  ...(await readdir(reviewDir)).filter(x=>x.endsWith('.json')).map(x=>join(reviewDir,x)),
  ...(await readdir(approvedDir)).filter(x=>x.endsWith('.lesson.json')).map(x=>join(approvedDir,x)),
 ];
 const results=await validateCurriculumFiles(paths);
 for(const result of results){
  if(result.errors.length){
   console.error('FAIL '+result.path);
   result.errors.forEach(error=>console.error('  '+error));
  }else{
   const data=result.lesson;
   console.log('PASS '+data.id+': '+data.storyNotes.length+' notes, '+
    data.questions.length+' questions, '+Object.keys(data.preparedActivities).length+
    ' prepared module categories; publication '+data.publication.status);
   console.log('  Content statuses are author-reported; npm run validate:library checks real engines and recipes.');
  }
 }
 if(results.some(x=>x.errors.length))process.exitCode=1;
}
