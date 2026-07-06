<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import DashboardPanel from '@/components/DashboardPanel.vue'

const auth = useAuthStore()

const handleLogout = async () => {
  try {
    await auth.logout() 
  } catch (error) {
    console.error("Error al cerrar sesión", error)
  }
}

onMounted(() => {
  auth.checkSession()
})

</script>

<template>
  <div class="home-container">
    
    <h1>{{ auth.isAuthenticated ? `Bienvenido, ${auth.user?.Usuario}` : 'Bienvenido a la página' }}</h1>

    <div class="links">
      <router-link v-if="!auth.isAuthenticated" to="/login">Iniciar Sesión</router-link>
      <button v-else @click="handleLogout" class="logout-button">Cerrar sesión</button>
      <router-link to="/config">Configuración</router-link>
      <router-link to="/measures">Medidas</router-link>
    </div>

    <DashboardPanel v-if="auth.isAuthenticated" />

  </div>
</template>

<style scoped>
.links {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  margin-top: 40px;
}

.home-container {
  display: flex;
  flex-direction: column;
  align-items: center; 
  text-align: center;
}

/* estilo del boton de logout para cohesión con el estilo nativo de Vue */
.logout-button {
  background-color: transparent; /* Quitamos el fondo gris del botón */
  border: none;                  /* Quitamos el borde */
  font-family: inherit;          /* Usamos la misma fuente que el resto */
  font-size: inherit;            /* Usamos el mismo tamaño de letra */
  cursor: pointer;
  
  /* Propiedades encontradas del main.css de Vue */
  padding: 3px;
  transition: 0.4s;
  
  /* Color rojo en el mismo formato HSLA que usa Vue */
  color: hsla(0, 100%, 45%, 1); 
}

.logout-button:hover {
  background-color: hsla(0, 100%, 45%, 0.2); 
}

</style>
