import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { AuthProvider } from './app/AuthProvider';
import { StoreProvider } from './services/store';
import { ThemeProvider } from './app/ThemeProvider';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <StoreProvider>
        <ThemeProvider>
          {/* Main Router Logic */}
          <RouterProvider router={router} />
        </ThemeProvider>
      </StoreProvider>
    </AuthProvider>
  </React.StrictMode>
);
