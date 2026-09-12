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

    <DashboardPanel v-if="auth.isAuthenticated" />

  </div>
</template>

<style scoped>

.home-container {
  display: flex;
  flex-direction: column;
  align-items: center; 
  text-align: center;
}

</style>
