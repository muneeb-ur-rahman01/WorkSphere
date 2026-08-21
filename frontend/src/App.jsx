import React from 'react';
import { AppProvider } from './context/AppContext';
import { ConfirmDialogProvider } from './shared/ConfirmDialog/ConfirmDialog';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <AppProvider>
      <ConfirmDialogProvider>
        <AppRoutes />
      </ConfirmDialogProvider>
    </AppProvider>
  );
}

export default App;
