import type {Lesson} from './model.ts';

/** The editor exposes the authored answers, never the shuffled print columns. */
export type MatchingPair={
 id?:string;left:string;right:string;origin?:string;
 teacherReviewRequired?:boolean;sourceIds?:string[];
 [key:string]:unknown;
};
export type MatchingIssue={index?:number;field?:'left'|'right';message:string};
const clone=<T,>(value:T):T=>structuredClone(value);
const pairsOf=(lesson:Lesson):MatchingPair[]=>{
 const value=lesson.preparedActivities?.matchWords;
 if(value===undefined)return [];
 if(!Array.isArray(value))throw Error('Matching pairs must be an array.');
 return value;
};

/** Mirror the actual Medium Match Words engine restrictions, with row hints. */
export function matchingPairIssues(pairs:readonly MatchingPair[]):MatchingIssue[]{
 const issues:MatchingIssue[]=[];
 if(pairs.length<3||pairs.length>6)
  issues.push({message:'Provide 3–6 matching pairs (currently '+pairs.length+').'});
 const seen:{left:Map<string,number>;right:Map<string,number>}={
  left:new Map(),right:new Map(),
 };
 for(const [index,pair] of pairs.entries()){
  for(const field of ['left','right'] as const){
   const value=typeof pair?.[field]==='string'?pair[field].trim():'';
   if(!value)issues.push({index,field,message:'Pair '+(index+1)+': '+field+' entry is missing.'});
   if(value.length>22)issues.push({index,field,message:'Pair '+(index+1)+': '+field+' entry exceeds 22 characters.'});
   if(value.includes(','))issues.push({index,field,message:'Pair '+(index+1)+': '+field+' entry cannot contain commas.'});
   const canonical=value.toLocaleLowerCase();
   if(!canonical)continue;
   const earlier=seen[field].get(canonical);
   if(earlier!==undefined)
    issues.push({index,field,message:'Pair '+(index+1)+': duplicate '+field+' entry (same as pair '+(earlier+1)+').'});
   else seen[field].set(canonical,index);
  }
 }
 return issues;
}

/** Keep stable IDs and source references, but mark rewritten wording as
 * teacher-review material rather than silently claiming it came verbatim
 * from the original curriculum.
 */
export function editMatchingPair(
 lesson:Lesson,index:number,field:'left'|'right',value:string,
):Lesson{
 const next=clone(lesson);
 const pair=pairsOf(next)[index];
 if(!pair)throw Error('Matching pair no longer exists.');
 if(pair[field]===value)return next;
 pair[field]=value;
 pair.origin='suggested';
 pair.teacherReviewRequired=true;
 return next;
}
export function addMatchingPair(lesson:Lesson):Lesson{
 const next=clone(lesson);
 if(!next.preparedActivities)throw Error('Lesson has no prepared activities.');
 const pairs=pairsOf(next);
 if(pairs.length>=6)throw Error('Match the Words supports at most six pairs.');
 if(!Array.isArray(next.preparedActivities.matchWords))
  next.preparedActivities.matchWords=[];
 const existing=new Set(pairs.map(pair=>pair.id));
 let n=1;
 while(existing.has('mp-'+String(n).padStart(2,'0')))n++;
 next.preparedActivities.matchWords.push({
  id:'mp-'+String(n).padStart(2,'0'),left:'',right:'',
  origin:'suggested',sourceIds:[],teacherReviewRequired:true,
 });
 return next;
}
export function removeMatchingPair(lesson:Lesson,index:number):Lesson{
 const next=clone(lesson),pairs=pairsOf(next);
 if(pairs.length<=3)throw Error('Match the Words must keep at least three pairs.');
 if(index<0||index>=pairs.length)throw Error('Matching pair no longer exists.');
 pairs.splice(index,1);
 return next;
}
export function moveMatchingPair(lesson:Lesson,index:number,direction:-1|1):Lesson{
 const next=clone(lesson),pairs=pairsOf(next);
 const target=index+direction;
 if(index<0||index>=pairs.length||target<0||target>=pairs.length)
  throw Error('Matching pair cannot move beyond the first or last row.');
 [pairs[index],pairs[target]]=[pairs[target],pairs[index]];
 return next;
}
