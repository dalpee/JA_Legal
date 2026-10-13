import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { applyTheme, getStoredTheme } from './components/ThemeToggle';

// Aplicar tema guardado en localStorage de forma síncrona
applyTheme(getStoredTheme());

createRoot(document.getElementById('root')!).render(<App />);
