import React from 'react';
import { createRoot } from 'react-dom/client';
import { API_PREFIX } from '@club-puntos/shared';
import './styles/tokens.css';

void API_PREFIX;
createRoot(document.getElementById('root')!).render(<React.StrictMode><div /></React.StrictMode>);
