<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import SensorCard from '@/components/SensorCard.vue'

const auth = useAuthStore()

// El onMounted solo se ejecuta si v-if="auth.isAuthenticated" se cumple en el padre
onMounted(() => {
  auth.fetchDashboardData()
})
</script>

<template>
  <div class="dashboard-section">
    <h2>Estado del Hardware</h2>

    <div v-if="auth.loadingDashboard" class="status-msg loading-msg">
      Conectando con el dispositivo y obteniendo sensores...
    </div>

    <div v-else-if="auth.errorDashboard" class="status-msg error-msg">
      {{ auth.errorDashboard }}
    </div>

    <div v-else-if="auth.sensoresUI.length === 0" class="status-msg no-data-msg">
      No se han detectado sensores en el sistema en este momento.
    </div>

    <div v-else class="sensors-flex">
      <SensorCard 
        v-for="sensor in auth.sensoresUI" 
        :key="sensor.Posicion" 
        :sensor="sensor" 
      />
    </div>
  </div>
</template>

<style scoped>
.dashboard-section {
  margin-top: 50px;
  width: 100%;
  max-width: 1400px; 
}

.dashboard-section h2 {
  border-bottom: 2px solid #ddd;
  padding-bottom: 10px;
  margin-bottom: 25px;
  /*color: #333;*/
}

.status-msg {
  padding: 15px;
  border-radius: 6px;
  font-weight: bold;
  margin-bottom: 20px;
}
.loading-msg { background-color: #e2e3e5; color: #383d41; }
.error-msg { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
.no-data-msg { background-color: #fff3cd; color: #856404; border: 1px solid #ffeeba; }

.sensors-flex {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
}

.sensors-flex > * {
  flex: 0 1 calc(20% - 16px);
  min-width: 240px; 
}
</style>