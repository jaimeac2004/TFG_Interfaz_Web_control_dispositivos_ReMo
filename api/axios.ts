import axios from 'axios'

// Obtenemos la ruta actual del navegador (ej. "/001/" o "/")
let basePath = window.location.pathname;

// Nos aseguramos de que siempre termine en "/" para evitar rutas mal formadas
if (!basePath.endsWith('/')) {
  basePath += '/';
}

export const api = axios.create({
  baseURL: basePath,
  withCredentials: true,                // envía/recibe cookies
  headers: {
    "Content-Type": "application/json"
  }
})
