import {useState} from 'react';
import {WORKSHEET_RECIPES,type RecipeId} from './worksheetRecipes.ts';
import type {PublicLessonEntry} from './publishedLessonCatalog.ts';

type Screen='home'|'stories'|'recipes';
export type WelcomeScreenProps={
 hasSavedDraft:boolean;
 savedTitle:string;
 stories:readonly PublicLessonEntry[];
 onResume:()=>void;
 onStartBlank:()=>void;
 onExploreExample:()=>void;
 /** Return a helpful error if a recipe cannot be created. */
 onChooseRecipe:(lesson:PublicLessonEntry,recipe:RecipeId)=>string|null;
};
export default function WelcomeScreen({
 hasSavedDraft,savedTitle,stories,onResume,onStartBlank,onExploreExample,onChooseRecipe,
}:WelcomeScreenProps){
 const [screen,setScreen]=useState<Screen>('home');
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [error,setError]=useState<string|null>(null);
 const selected=stories.find(item=>item.lesson.id===selectedId);
 function goBack(){
  setError(null);
  if(screen==='recipes'){setSelectedId(null);setScreen('stories');}
  else setScreen('home');
 }
 function enterStories(){
  setError(null);setScreen('stories');
 }
 return (
  <div className="welcome-shell">
   <header className="welcome-header">
    <div className="welcome-brand">
     <span className="welcome-mark" aria-hidden="true">W<span>✦</span></span>
     <span><strong>Worksheet Studio</strong><small>Bible booklet maker</small></span>
    </div>
    <span className="welcome-header-hint">Create · Customize · Print</span>
   </header>
   <main className="welcome-main" aria-labelledby="welcome-title">
    {screen==='home'&&<>
     <p className="welcome-eyebrow">WELCOME TO WORKSHEET STUDIO</p>
     <h1 id="welcome-title">What would you like to <em>create?</em></h1>
     <p className="welcome-intro">Make a Bible worksheet without having to start with every setting. Choose how you'd like to begin, then customize anything in the editor.</p>
     <div className="welcome-options">
      <button type="button" className="welcome-choice" onClick={enterStories}>
       <span className="welcome-choice-icon" aria-hidden="true">▤</span>
       <span><strong>Choose a Bible Story</strong><small>Start with an approved lesson and a ready-made activity mix.</small></span>
       <span className="welcome-chevron" aria-hidden="true">›</span>
      </button>
      <button type="button" className="welcome-choice" onClick={onStartBlank}>
       <span className="welcome-choice-icon" aria-hidden="true">✎</span>
       <span><strong>Start from Scratch</strong><small>Build your own worksheet using all the editor's options.</small></span>
       <span className="welcome-chevron" aria-hidden="true">›</span>
      </button>
      <button type="button" className="welcome-choice" onClick={onExploreExample}>
       <span className="welcome-choice-icon" aria-hidden="true">✦</span>
       <span><strong>Explore an Example</strong><small>Open a filled-in sample booklet to see what you can create.</small></span>
       <span className="welcome-chevron" aria-hidden="true">›</span>
      </button>
      {hasSavedDraft&&
       <button type="button" className="welcome-choice welcome-resume" onClick={onResume}>
        <span className="welcome-choice-icon" aria-hidden="true">↶</span>
        <span><strong>Continue Your Worksheet</strong>
         <small>{savedTitle.trim()?savedTitle.trim():'Resume your worksheet'} · Saved in this browser</small></span>
        <span className="welcome-chevron" aria-hidden="true">›</span>
       </button>}
     </div>
     <p className="welcome-footnote">Your worksheet saves automatically in this browser. You can always come back to this screen.</p>
    </>}
    {screen==='stories'&&<>
     <button type="button" className="welcome-back" onClick={goBack}>‹ Back to choices</button>
     <p className="welcome-eyebrow">STEP 1 · CHOOSE A LESSON</p>
     <h1 id="welcome-title">Choose a <em>Bible Story.</em></h1>
     <p className="welcome-intro">Approved curriculum lessons will appear here. You can customize every activity after choosing a story.</p>
     {stories.length===0
      ?<div className="welcome-empty" role="status">
       <span className="welcome-empty-icon" aria-hidden="true">▤</span>
       <h2>Our story library is being prepared</h2>
       <p>The first lesson is still in teacher review, so it isn't public yet. You can explore an example or start your own worksheet in the meantime.</p>
       <div className="welcome-empty-actions">
        <button type="button" onClick={onExploreExample}>Explore an Example</button>
        <button type="button" className="welcome-secondary" onClick={onStartBlank}>Start from Scratch</button>
       </div>
      </div>
      :<div className="welcome-options">
       {stories.map(entry=><button type="button" className="welcome-choice" key={entry.lesson.id}
        onClick={()=>{setSelectedId(entry.lesson.id);setError(null);setScreen('recipes');}}>
        <span className="welcome-choice-icon" aria-hidden="true">▤</span>
        <span><strong>{entry.lesson.lessonDetails.title}</strong>
         <small>{entry.lesson.lessonDetails.scriptureDisplay??entry.lesson.lessonDetails.scripturePassages?.join(', ')}</small></span>
        <span className="welcome-chevron" aria-hidden="true">›</span>
       </button>)}
      </div>}
    </>}
    {screen==='recipes'&&selected&&<>
     <button type="button" className="welcome-back" onClick={goBack}>‹ Back to Bible Stories</button>
     <p className="welcome-eyebrow">STEP 2 · CHOOSE A WORKSHEET STYLE</p>
     <h1 id="welcome-title">{selected.lesson.lessonDetails.title}</h1>
     <p className="welcome-intro">Choose a starting arrangement. Once the booklet opens, you can edit every activity, change layouts, and download a PDF.</p>
     <div className="welcome-options">
      {WORKSHEET_RECIPES.map(recipe=><button type="button" className="welcome-choice"
       key={recipe.id} onClick={()=>setError(onChooseRecipe(selected,recipe.id))}>
       <span className="welcome-choice-icon" aria-hidden="true">{recipe.id==='story-review'?'▤':'✦'}</span>
       <span><strong>{recipe.name}</strong><small>{recipe.description}</small></span>
       <span className="welcome-chevron" aria-hidden="true">›</span>
      </button>)}
     </div>
     {error&&<p className="welcome-error" role="alert">{error}</p>}
    </>}
   </main>
   <footer className="welcome-footer">Worksheet Studio · Made for creative Bible learning</footer>
  </div>
 );
}
