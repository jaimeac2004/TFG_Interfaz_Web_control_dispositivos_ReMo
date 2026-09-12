<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import Logo from '@/components/Logo.vue'

const auth = useAuthStore()
const router = useRouter()

const handleLogout = async () => {
  try {
    await auth.logout()
    router.push('/login') // Forzamos la vuelta al login tras cerrar sesión
  } catch (error) {
    console.error("Error al cerrar sesión", error)
  }
}
</script>

<template>
  <div class="app-layout">
    
    <!-- BARRA DE NAVEGACIÓN SUPERIOR FIJA -->
    <header class="topbar">
      <div class="logo-wrapper">
        <Logo />
      </div>
      
      <!-- Sólo mostramos los botones si el usuario está logueado -->
      <nav v-if="auth.isAuthenticated" class="main-nav">
        <router-link :to="{ name: 'home' }" class="nav-btn">Dashboard</router-link>
        <router-link :to="{ name: 'config' }" class="nav-btn">Configuración</router-link>
        <router-link :to="{ name: 'measures' }" class="nav-btn">Medidas</router-link>
        <router-link :to="{ name: 'system' }" class="nav-btn">Mantenimiento</router-link>
        
        <div class="divider-vertical"></div>
        
        <button @click="handleLogout" class="nav-btn logout-btn">Cerrar sesión</button>
      </nav>
    </header>

    <!-- CONTENIDO DINÁMICO DE LAS VISTAS -->
    <main class="main-content">
      <router-view />
    </main>

  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--color-bg-main); /* Fondo de la aplicación global */
}

/* LA BARRA SUPERIOR */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--color-bg-white);
  padding: 0 2rem;
  height: 70px; /* Altura fija para que no salte */
  border-bottom: 1px solid var(--color-border);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05); /* Sombra elegante */
  position: sticky;
  top: 0;
  z-index: 1000; /* Siempre por encima del resto */
}

.logo-wrapper {
  display: flex;
  align-items: center;
  height: 100%;
}

.main-nav {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* ESTÉTICA DE LOS BOTONES */
.nav-btn {
  text-decoration: none;
  color: var(--color-text-secondary);
  font-weight: 600;
  font-size: 0.9rem;
  padding: 8px 16px;
  border-radius: 6px;
  transition: all 0.2s ease-in-out;
  cursor: pointer;
}

.nav-btn:hover {
  background-color: #f3f4f6; /* Gris suave al pasar el ratón */
  color: var(--color-text-primary);
}

/* LA MAGIA DE VUE: Clase automática cuando la ruta coincide con el botón */
.nav-btn.router-link-active {
  background-color: var(--color-primary);
  color: #ffffff !important;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);
}

.divider-vertical {
  width: 1px;
  height: 24px;
  background-color: var(--color-input-border);
  margin: 0 4px;
}

/* BOTÓN DE LOGOUT ESPECIAL */
.logout-btn {
  background-color: transparent;
  border: 1px solid #fca5a5;
  color: var(--color-danger);
}

.logout-btn:hover {
  background-color: #fef2f2;
  color: var(--color-danger-hover);
  border-color: var(--color-danger-hover);
}

.main-content {
  flex: 1;
  display: flex;
  justify-content: center;
  /* Las vistas ya gestionan su propio padding, así que aquí no forzamos nada */
}
</style>