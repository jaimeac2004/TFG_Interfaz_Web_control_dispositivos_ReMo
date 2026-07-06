<script setup lang="ts">
import Logo from '@/components/Logo.vue'
</script>



<template>
  <header class="logo-container">
    <Logo />
  </header>

  <main class="main-content">
    <router-view />
  </main>
</template>

<style scoped>
.logo-container {
  position: absolute; /* También puedes usar 'fixed' si quieres que no se mueva al hacer scroll */
  top: 20px;
  left: 20px;
  z-index: 1000; /* Asegura que el logo siempre quede por encima del contenido */
}

.main-content {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  width: 100%;
  padding: 20px; /* Margen de seguridad interno para pantallas pequeñas */
  box-sizing: border-box;
}
</style>