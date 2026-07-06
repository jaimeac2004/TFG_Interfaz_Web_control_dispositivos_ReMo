import { useAuthStore } from '@/stores/authStore'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

interface LoginCredentials {
    username: string;
    password: string;
}

export const useUserVerification = () => {
  const loading = ref(false)
  const error = ref('')
  const router = useRouter()
  const authStore = useAuthStore()

  const verifyUser = async (credentials: LoginCredentials) => {
    loading.value = true
    error.value = ''
    console.log('Verifying user with credentials:', credentials)
    try {
      const loginData = new FormData()
      loginData.append('username', credentials.username)
      loginData.append('password', credentials.password)
      console.log('FormData prepared:', Array.from(loginData.entries()))
      const response = await axios.post('http://remo.tel.uva.es/30021/remo/Server/Logout', loginData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: false
      })
      response.data = JSON.parse(response.data);
      console.log(`Login response: ${response.data}`)
      // Redirigir al usuario a la página principal
      router.push({ name: 'home' })


      console.log(`Cookies: ${document.cookie}`)


      return true

    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        if (e.response?.status === 401) {
          error.value = 'Usuario o contraseña incorrectos'
        } else if (e.response?.status === 400) {
          error.value = 'Datos de formulario inválidos'
        } else if (e.response?.status === 429) {
          error.value = 'Demasiados intentos. Por favor, espera un momento'
        } else {
          error.value = 'Error al intentar iniciar sesión'
        }
      } else {
        error.value = 'Error de conexión'
        console.error('Error no manejado:', e)
      }
      return false
    } finally {
      loading.value = false
    }
  }
  return { verifyUser,loading, error }
}
