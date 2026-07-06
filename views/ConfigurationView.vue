<script setup lang="ts">
import { useAuthStore } from '@/stores/authStore'
const auth = useAuthStore()
</script>

<template>
  <div>
    <h1>Configuración</h1>

    <p>Has accedido porque estás autenticado.</p>

    <button @click="auth.logout">Cerrar sesión</button>
  </div>
</template>
