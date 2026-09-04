import React from 'react';
import { createRoot } from 'react-dom/client';
import VercelRouter from '@/components/VercelRouter';
import '@/app/globals.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <VercelRouter />
  </React.StrictMode>,
);
