import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import "../node_modules/bootstrap/dist/css/bootstrap.css"
import "../node_modules/bootstrap/dist/js/bootstrap.bundle.js"
import '../node_modules/bootstrap-icons/font/bootstrap-icons.css'
import '../node_modules/@fortawesome/free-solid-svg-icons'

import axios from 'axios'

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})


createRoot(document.getElementById('root')).render(

  
  <StrictMode>
    <App />
  </StrictMode>,
)
