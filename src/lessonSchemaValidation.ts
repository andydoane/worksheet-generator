/** The schema subset used by the repo's curriculum CI and Review Studio.
 * Keep this single validator shared so a field rejected by CI cannot pass
 * Review Studio's preflight.
 *
 * This intentionally implements the subset of JSON Schema 2020-12 currently
 * used by lesson-v1.schema.json. When adding schema keywords, update this
 * function and its tests in the same PR.
 */
export function validateLessonSchema(value:unknown,schema:any):string[]{
 const errors:string[]=[];
 function inspect(item:any,rule:any,path:string){
  if(rule.$ref){
   const ref=rule.$ref as string;
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
   if(rule.uniqueItems===true&&new Set(item.map(x=>JSON.stringify(x))).size!==item.length)
    errors.push(path+': repeated array item');
   if(rule.items)item.forEach((entry,index)=>inspect(entry,rule.items,path+'['+index+']'));
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
