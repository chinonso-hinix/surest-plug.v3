import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <ErrorBoundary fallbackTitle="Surest Plug Digital Marketplace">
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
  } catch (err) {
    console.error('Fatal initialization error rendering React root:', err);
  }
} else {
  console.error('Fatal: #root container element not found in DOM.');
}


