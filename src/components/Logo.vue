<template>
  <router-link :to="{ name: 'home' }" class="logo-link">
    <img src="/public/Logo_ReMo.svg" alt="Logo" class="logo" />
  </router-link>
</template>

<style scoped>
.logo-link {
  display: inline-block; /* Mantiene el tamaño ajustado a la imagen */
  text-decoration: none; /* Evita cualquier subrayado por defecto de los enlaces */
  cursor: pointer;
}

.logo {
  width: 150px;
  display: block;
}
</style>
