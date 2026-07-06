<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'vue-router'

const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const errorMessage = ref('')

async function handleLogin() {
  errorMessage.value = ''
  try{
    await auth.login(username.value, password.value)
    if (auth.isAuthenticated) {
      router.push({ name: 'home' })
    } else {
      errorMessage.value = "Usuario o contraseña incorrectos"
    }
  } catch (error: any){
    if (error.response && error.response.status === 401) {
      errorMessage.value = "Usuario o contraseña incorrectos."
    } else {
      errorMessage.value = "Error al conectar con el servidor."
    }
  }
}

const clearError = () => {
  errorMessage.value = ''
}

</script>

<template>
  <div>
    <h1>Login</h1>

    <form @submit.prevent="handleLogin" class="login-form">
      <input v-model="username" type="text" placeholder="Usuario" required @input="clearError"/>
      <input v-model="password" type="password" placeholder="Contraseña" required @input="clearError"/>
  
      <p v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </p>

      <button type="submit" :disabled="auth.loading"> 
        {{ auth.loading ? 'Iniciando sesión...' : 'Acceder'}} 
      </button>
    </form>
  </div>
</template>

<style scoped>
.login-form {
  display: flex;
  flex-direction: column;
  gap: 15px; /* Añade un espacio de 15px entre cada elemento */
  width: 100%;
  max-width: 300px; /* Evita que el formulario sea demasiado ancho en pantallas grandes */
}

.error-message {
  color: red; /* Rojo */
  font-size: 14px;
  font-weight: bold;
  margin: 0;
  text-align: center;
}

button:disabled{
  cursor: not-allowed;
}

</style>