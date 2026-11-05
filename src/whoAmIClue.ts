/**
 * Print-only normalization of source-backed Who Am I clues. The separate
 * question is already drawn below the clue in both preview and PDF.
 *
 * Keep approved curriculum and teacher-authored text intact. Only remove a
 * standalone final "Who am I?" question separated by sentence punctuation,
 * a dash, or a line break. Embedded/quoted questions are not changed.
 */
export function printedWhoAmIClue(source:string):string{
 const clue=source.trim();
 if(/^who\s+am\s+i\s*\?+[.!?]*$/iu.test(clue))return '';
 const match=clue.match(/^(.*?)([.!?]\s*|[,;:\u2013\u2014]\s*|\r?\n+\s*)who\s+am\s+i\s*\?+[.!?]*$/isu);
 if(!match)return clue;
 const separator=match[2].trim();
 // Preserve sentence punctuation. Drop an orphan comma/colon/dash.
 return match[1].trimEnd()+(/^[.!?]$/u.test(separator)?separator:'');
}
