import type {ModuleId} from '../modules.ts';

/** One canonical destination per module. The review workbench imports this
 * registry for navigation, and preflight imports it for diagnostic routing.
 * A destination marked "advanced" deliberately uses the isolated JSON
 * repair control until a dedicated visual editor is implemented.
 * Future PRs can promote entries without rewriting error-message parsers.
 */
export type RepairDestination={
 taskId:string;
 fieldId:string;
 editor:'visual'|'scripture'|'advanced';
 /** Can the form repair an absent prepared record without JSON? */
 handlesMissing:boolean;
};
const visual=(taskId:string,fieldId:string,handlesMissing=false):RepairDestination=>({
 taskId,fieldId,editor:'visual',handlesMissing,
});
const scripture:RepairDestination={
 taskId:'bsb-verse',fieldId:'review-field-bsb',editor:'scripture',handlesMissing:false,
};
const advanced=(id:ModuleId):RepairDestination=>({
 taskId:'module:'+id,fieldId:'review-module-json',editor:'advanced',handlesMissing:false,
});
export const MODULE_REPAIR_REGISTRY:Record<ModuleId,RepairDestination>={
 'draw-picture':visual('drawing-captions','review-field-drawing'),
 'multiple-choice':advanced('multiple-choice'),
 'true-false':visual('true-false','review-field-true-false',true),
 'first-letters':scripture,
 'odd-words':visual('odd-words','review-field-odd-words'),
 'unscramble-words':advanced('unscramble-words'),
 'checkboxes':visual('checkboxes','review-field-checkboxes'),
 'who-am-i':advanced('who-am-i'),
 'match-words':visual('match-words','review-field-match-words',true),
 'finish-verse':scripture,
 'unscramble-verse':scripture,
 'circle-mistakes':visual('circle-mistakes','review-field-circle-mistakes'),
 'medium-word-search':visual('medium-word-search','review-field-medium-word-search',true),
 'true-false-maze':visual('true-false-maze','review-field-true-false-maze',true),
 'big-idea-cryptogram':visual('solve-code','review-field-solve-code'),
 'upside-down-verse':scripture,
 'connect-big-idea':visual('connect-phrase','review-field-connect-phrase',true),
 'pixel-picture':advanced('pixel-picture'),
 'finish-story':visual('finish-story','review-field-finish-story'),
 'story-order':visual('story-order','review-field-story-order',true),
 'sort-story':visual('sort-story','review-field-sort-story',true),
 'draw-story':visual('drawing-captions','review-field-drawing'),
 'word-search':visual('word-search','review-field-word-search',true),
 'verse-cryptogram':scripture,
 'crossword':visual('crossword','review-field-crossword',true),
 'spiral-verse':scripture,
 'connect-verse':scripture,
};

/** A missing record needs an editor that can create it, not a dead link.
 * Until a visual form handles that case, route to the isolated JSON editor.
 */
export function repairDestinationForModule(
 id:ModuleId,preparedPresent=true,
):RepairDestination{
 const destination=MODULE_REPAIR_REGISTRY[id];
 return preparedPresent||destination.handlesMissing?destination:advanced(id);
}
