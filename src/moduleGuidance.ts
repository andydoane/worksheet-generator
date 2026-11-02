import {blankModule,type ActivityModule,type ModuleId} from './modules.ts';

/** Instruction and demonstration text only. Samples are displayed as native
 * form placeholders, not stored as user input, so they do not affect
 * validation, previews, PDF export or saved drafts.
 */
type Guidance={instruction:string;sample?:Partial<ActivityModule>};
export const MODULE_GUIDANCE:Record<ModuleId,Guidance>={
 'draw-picture':{instruction:'Describe one scene from the Bible story for children to draw.',
  sample:{type:'draw-picture',prompt:'Moses leading the Israelites through the Red Sea.'}},
 'match-words':{instruction:'Enter 3–6 related word pairs, separated by a comma, one pair per line.',
  sample:{type:'match-words',pairs:'Moses, Leader\nPharaoh, King\nRed Sea, Water\nEgypt, Land',seed:1}},
 'finish-story':{instruction:'Write a short story with 6–12 missing words marked in [square brackets].',
  sample:{type:'finish-story',story:'God told [Moses] to lead the [people] out of [Egypt]. They came to the [sea], but Pharaoh followed them. God made a [path] through the water, and everyone crossed on [dry] land. They thanked [God] for saving them.',seed:1}},
 'multiple-choice':{instruction:'Write one question, its correct answer, and two believable incorrect choices.',
  sample:{type:'multiple-choice',question:'Who led the Israelites out of Egypt?',correct:'Moses',wrong1:'David',wrong2:'Daniel',seed:1}},
 'true-false':{instruction:'Type one short Bible-story statement that a child can judge true or false.',
  sample:{type:'true-false',statement:'Moses led the Israelites through the Red Sea.'}},
 'first-letters':{instruction:'The Scripture reference and verse start from Lesson details; edit this copy only if needed.'},
 'odd-words':{instruction:'List 1–5 story words and 1–5 unrelated words, with 6–10 entries altogether.',
  sample:{type:'odd-words',correct:'MOSES\nPHARAOH\nRED SEA\nEGYPT',incorrect:'DANIEL\nLIONS\nJONAH',seed:1}},
 'unscramble-words':{instruction:'Enter two story words or two-word phrases of 3–10 letters each.',
  sample:{type:'unscramble-words',first:'MOSES',second:'RED SEA',seed:1}},
 'checkboxes':{instruction:'List words from the story and unrelated words; children check the story words.',
  sample:{type:'checkboxes',correct:'MOSES\nRED SEA\nPHARAOH',incorrect:'NOAH\nLION\nSAMSON',seed:1}},
 'who-am-i':{instruction:'Write a first-person character clue and the name children should guess.',
  sample:{type:'who-am-i',clue:'God told me to lead his people out of Egypt and through the Red Sea.',answer:'MOSES'}},
 'story-order':{instruction:'Type 5–8 sentences describing the events of the story in chronological order, one per line.',
  sample:{type:'story-order',events:'God guided the people in a pillar of cloud.\nThey camped beside the Red Sea.\nPharaoh sent his soldiers to chase after them.\nMoses raised his staff over the sea.\nThe people crossed the sea on dry ground.',seed:1}},
 'sort-story':{instruction:'Enter 4–8 true and false statements; children copy each symbol into the correct answer box.',
  sample:{type:'sort-story',statements:'God guided the people through the wilderness. true\nMoses led the people out of Egypt. true\nPharaoh wanted the Israelites to leave peacefully. false\nGod opened a path through the Red Sea. true\nThe people crossed the sea in boats. false\nPharaoh never sent soldiers after them. false',seed:1}},
 'draw-story':{instruction:'Enter 4–6 short scenes from the Bible story, one drawing prompt per line.',
  sample:{type:'draw-story',prompts:'The Israelites camp beside the Red Sea.\nPharaoh sends his soldiers after them.\nMoses raises his staff over the water.\nThe Israelites cross on dry ground.'}},
 'finish-verse':{instruction:'The verse and reference begin with the theme verse; bracket 2–8 words for children to fill in.'},
 'unscramble-verse':{instruction:'The verse and reference begin with the theme verse; bracket 4–8 words to scramble.'},
 'circle-mistakes':{instruction:'Write a paragraph with 1–8 deliberate story mistakes and set the number to find.',
  sample:{type:'circle-mistakes',text:'Moses led the Israelites out of Babylon. They crossed the Red Sea in wooden boats. God sent a pillar of cloud to guide them.',count:2}},
 'word-search':{instruction:'Enter 4–12 Bible-story words or short phrases, one per line.',
  sample:{type:'word-search',words:'Moses\nPharaoh\nRed Sea\nEgypt\nCloud\nStaff',seed:1}},
 'medium-word-search':{instruction:'Enter 1–6 Bible-story words or short phrases of 2–9 letters, one per line.',
  sample:{type:'medium-word-search',words:'Moses\nRed Sea\nEgypt\nCloud',seed:1}},
 'true-false-maze':{instruction:'Write one short statement and choose whether its correct answer is TRUE or FALSE.',
  sample:{type:'true-false-maze',statement:'God made a dry path through the Red Sea.',answer:true,seed:1}},
 'crossword':{instruction:'Enter 6–10 answers and clues in ANSWER, clue format, one pair per line.',
  sample:{type:'crossword',entries:'DAVID, Young shepherd who faced a giant\nGOLIATH, Giant from Gath\nSLING, David used this weapon\nSTONE, David picked five of these\nSAUL, King of Israel\nSHEEP, Animals David watched',seed:4}},
 'spiral-verse':{instruction:'The writing spiral uses the theme verse and reference from Lesson details.'},
 'upside-down-verse':{instruction:'The upside-down letter puzzle uses the theme verse and reference from Lesson details.'},
 'connect-verse':{instruction:'The scrambled word trail uses the theme verse text from Lesson details.'},
 'connect-big-idea':{instruction:'The word trail starts with the key idea from Lesson details.'},
 'verse-cryptogram':{instruction:'The symbol cryptogram starts with the theme verse and reference from Lesson details.'},
 'big-idea-cryptogram':{instruction:'The symbol cryptogram starts with the key idea from Lesson details.'},
};

/** Explicitly opt into example *values* for test/print fixtures only.
 * The live editor selects blankModule instead and displays samplePlaceholder.
 */
export function newModuleWithExample(type:ModuleId):ActivityModule{
 const empty=blankModule(type);
 const sample=MODULE_GUIDANCE[type].sample;
 return sample?{...empty,...sample} as ActivityModule:empty;
}
/** Return the sample for a specific form field without writing it to a draft.
 * Nontext fields (like seeds, number of mistakes and correct maze exit) have
 * no text placeholder and keep their normal controls/default values.
 */
export function samplePlaceholder(type:ModuleId,field:string):string{
 const sample=MODULE_GUIDANCE[type].sample as Record<string,unknown>|undefined;
 const value=sample?.[field];
 return typeof value==='string'?value:'';
}
export function isAutofilledModule(type:ModuleId):boolean{
 return !MODULE_GUIDANCE[type].sample;
}
