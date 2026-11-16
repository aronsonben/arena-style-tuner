import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ResetPasswordPage from './components/ResetPasswordPage';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
const isResetPasswordRoute = window.location.pathname === '/reset-password';

root.render(
  <React.StrictMode>
    {isResetPasswordRoute ? <ResetPasswordPage /> : <App />}
  </React.StrictMode>
);