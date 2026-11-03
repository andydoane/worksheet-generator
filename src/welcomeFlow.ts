import {DEFAULT_LAYOUTS} from './booklet.ts';
import {EMPTY_DRAFT,type StoredDraft} from './draftMigration.ts';
import {newModuleWithExample} from './moduleGuidance.ts';
import {validateModule,type ModuleId} from './modules.ts';

/** A default autosaved blank draft is NOT unfinished work. */
export function hasMeaningfulDraft(draft:StoredDraft):boolean{
 if([draft.title,draft.scripture,draft.bigIdea,draft.verseReference,draft.verseText]
  .some(value=>value.trim().length>0))return true;
 if(Object.keys(draft.modules).length>0)return true;
 if(draft.coverBorder!=='none')return true;
 if(Object.values(draft.activityBorders).some(border=>border!=='none'))return true;
 return ([2,3,4] as const).some(page=>draft.layouts[page]!==DEFAULT_LAYOUTS[page]);
}

/**
 * An example, not a public curriculum preset. Every activity comes from the
 * app's PRE-EXISTING field-placeholder examples; no unapproved lesson data
 * or new curriculum wording is bundled for onboarding.
 */
const EXAMPLE_MODULE_SLOTS:readonly {slot:string;type:ModuleId}[]=[
 {slot:'1:cover-activity',type:'story-order'},
 {slot:'2:top-left-small',type:'multiple-choice'},
 {slot:'2:top-right-small',type:'true-false'},
 {slot:'2:middle-medium',type:'true-false-maze'},
 {slot:'2:bottom-medium',type:'medium-word-search'},
 {slot:'3:top-large',type:'finish-story'},
 {slot:'3:bottom-left-small',type:'draw-picture'},
 {slot:'3:bottom-right-small',type:'who-am-i'},
 {slot:'4:top-large',type:'sort-story'},
 {slot:'4:bottom-left-small',type:'checkboxes'},
 {slot:'4:bottom-right-small',type:'odd-words'},
];

export function exampleWorksheetDraft():StoredDraft{
 const result:StoredDraft={
  ...structuredClone(EMPTY_DRAFT),
  title:'God Parts the Red Sea — Example Worksheet',
  scripture:'Exodus 13–14',
  bigIdea:'God makes a way for his people.',
  layouts:{
   2:'small-small-medium-medium',
   3:'large-small-small',
   4:'large-small-small',
  },
 };
 for(const {slot,type} of EXAMPLE_MODULE_SLOTS){
  const module=newModuleWithExample(type);
  const errors=validateModule(module);
  if(errors.length)throw Error('Invalid existing example '+type+': '+errors.join(' '));
  result.modules[slot]=module;
 }
 return result;
}
