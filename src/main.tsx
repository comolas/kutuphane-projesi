import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n'
import { UpdateProvider } from './contexts/UpdateContext.tsx'; // Import UpdateProvider
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UpdateProvider> {/* Wrap App with UpdateProvider */}
      <App />
    </UpdateProvider>
  </React.StrictMode>,
)