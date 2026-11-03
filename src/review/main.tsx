import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import ReviewApp from './ReviewApp.tsx';
const root=document.getElementById('root');
if(!root)throw Error('Review Studio root not found.');
createRoot(root).render(<StrictMode><ReviewApp/></StrictMode>);
