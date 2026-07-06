import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import ConfigView from '@/views/ConfigurationView.vue'
import MeasuresView from '@/views/MeasuresView.vue'
import { useAuthStore } from '@/stores/authStore'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/',      name: 'home',   component: HomeView },
    { path: '/login', name: 'login',  component: LoginView },
    { 
      path: '/config',
      name: 'config',
      component: ConfigView,
      meta: { requiresAuth: true }
    },
    {
      path: '/measures',
      name: 'measures',
      component: MeasuresView,
      meta: { requiresAuth: true}
    }
  ]
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Esperar la verificación de la sesión si aún no se hizo
  if (!auth.isAuthenticated && to.meta.requiresAuth) {
    await auth.checkSession()
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }
})

export default router
