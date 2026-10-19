import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { applyTheme } from './components/ThemeToggle';

// Aplicar tema guardado en localStorage de forma síncrona
applyTheme('dark');

createRoot(document.getElementById('root')!).render(<App />);
