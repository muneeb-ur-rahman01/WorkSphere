import React from 'react';
import { Analytics } from '@vercel/analytics/react';
import { AppProvider } from './context/AppContext';
import { ConfirmDialogProvider } from './shared/ConfirmDialog/ConfirmDialog';
import AppRoutes from './routes/AppRoutes';

function App() {
return (
<AppProvider>
<ConfirmDialogProvider>
<AppRoutes />
<Analytics />
</ConfirmDialogProvider>
</AppProvider>
);
}

export default App;