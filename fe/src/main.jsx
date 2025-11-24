import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import './i18n'
// Bootstrap CSS (utilities, grid, helpers) - COMMENTED OUT, using Tailwind CSS instead
// import 'bootstrap/dist/css/bootstrap.min.css'
// Bootstrap Icons (for bi- classes)
import { Toaster } from 'sonner'
import { NotificationProvider } from './contexts/NotificationContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <NotificationProvider>
        <App />
        <Toaster richColors position="top-right" />
      </NotificationProvider>
    </BrowserRouter>
  </React.StrictMode>,
)