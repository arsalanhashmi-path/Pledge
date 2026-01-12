import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { AuthProvider } from './app/AuthProvider';
import { StoreProvider } from './services/store';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <StoreProvider>
        {/* Main Router Logic */}
        <RouterProvider router={router} />
      </StoreProvider>
    </AuthProvider>
  </React.StrictMode>
);
