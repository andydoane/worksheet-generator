import type {StoredDraft} from './draftMigration.ts';
import type {PublicLessonEntry} from './publishedLessonCatalog.ts';
import {approvedForPublic} from './publishedLessonCatalog.ts';
import {sameActivityContent} from './curriculumEditor.ts';
import {validateModule} from './modules.ts';

/**
 * Upgrade ONLY an untouched, precisely recognized old Large Draw the Story
 * module from pre-PR17m lesson-backed browser storage. Never overwrite custom
 * captions or unrelated activity regions. Preserve the original draft object
 * when no upgrade is possible.
 */
export function upgradeSavedDrawingCaptions(
 draft:StoredDraft,entries:readonly PublicLessonEntry[],
):StoredDraft{
 if(!draft.curriculumLessonId)return draft;
 const entry=entries.find(x=>x.lesson.id===draft.curriculumLessonId&&approvedForPublic(x));
 if(!entry)return draft;
 const lesson=entry.lesson as PublicLessonEntry['lesson']&{
  drawingPrompts?:{prompt:string;sourceIds?:string[]}[];
 };
 const prepared=lesson.preparedActivities.drawStory??[];
 const bank=lesson.drawingPrompts??[];
 if(prepared.length<4||prepared.length>6)return draft;
 const oldScenes:string[]=[];
 for(const caption of prepared){
  const matching=bank.filter(scene=>(caption.sourceIds??[]).some(id=>
   scene.sourceIds?.includes(id)));
  if(matching.length!==1)return draft;
  oldScenes.push(matching[0].prompt);
 }
 const modern={type:'draw-story' as const,prompts:prepared.map(x=>x.prompt).join('\n')};
 const oldFragment={type:'draw-story' as const,prompts:oldScenes.join('\n')};
 const oldInstruction={type:'draw-story' as const,prompts:oldScenes.map(x=>'Draw '+x+'.').join('\n')};
 if(validateModule(modern).length)return draft;
 let updated:StoredDraft|undefined;
 for(const [slot,module] of Object.entries(draft.modules)){
  if(module.type!=='draw-story')continue;
  if(!sameActivityContent(module,oldFragment)&&!sameActivityContent(module,oldInstruction))continue;
  const initial=draft.activityDefaults?.[slot];
  if(initial&&!sameActivityContent(initial,module))continue;
  if(!updated)updated={...draft,modules:{...draft.modules},
    activityDefaults:{...draft.activityDefaults}};
  updated.modules[slot]={...modern};
  updated.activityDefaults![slot]={...modern};
 }
 return updated??draft;
}
