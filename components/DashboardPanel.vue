<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/authStore'

const auth = useAuthStore()

// El onMounted solo se ejecuta si v-if="auth.isAuthenticated" se cumple en el padre
onMounted(() => {
  auth.fetchDashboardData()
})

// Nos traemos la función de los colores que antes vivía en la tarjeta eliminada
const getStatusClass = (estado: string) => {
  switch (estado) {
    case 'OK': return 'status-ok'
    case 'Desconectado':
    case 'Inactivo': return 'status-error'
    case 'Fuera de rango': return 'status-warning'
    case 'Repitiendo': return 'status-info'
    default: return 'status-default'
  }
}
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
      No se han detectado sensores físicos en el sistema en este momento.
    </div>

    <!-- NUEVA VISTA DE TABLA RESUMIDA -->
    <div v-else class="table-container">
      <table class="dashboard-table">
        <thead>
          <tr>
            <th class="col-pos">Posición</th>
            <th>Nombre del Sensor</th>
            <th>Tipo</th>
            <th>Capacidades (Pasa el ratón para ver detalles)</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="sensor in auth.sensoresUI" :key="sensor.Posicion">
            
            <td class="col-pos font-bold">{{ sensor.Posicion }}</td>
            
            <td>
              <!-- Lógica de advertencia si el sensor existe pero no tiene Nodo -->
              <span v-if="sensor.Nombre !== 'Sin Nombre'" class="sensor-name">
                {{ sensor.Nombre }}
              </span>
              <span v-else class="warning-text" title="Se ha detectado físicamente pero no tiene un Nodo asignado en la configuración">
                Sin Nodo Asignado
              </span>
            </td>
            
            <td>
              <span class="sensor-type">{{ sensor.Tipo }}</span>
            </td>
            
            <td>
              <div class="summary-pills">
                <!-- Uso de Tooltips Nativos (Atributo 'title') para manejar arrays gigantes -->
                <span v-if="sensor.Canales && sensor.Canales.length > 0" 
                      class="pill pill-channels" 
                      :title="sensor.Canales.join(', ')">
                  {{ sensor.Canales.length }} Canales
                </span>
                
                <span v-if="sensor.Estados && sensor.Estados.length > 0" 
                      class="pill pill-states" 
                      :title="sensor.Estados.join(', ')">
                  {{ sensor.Estados.length }} Estados
                </span>
                
                <span v-if="(!sensor.Canales || sensor.Canales.length === 0) && (!sensor.Estados || sensor.Estados.length === 0)" 
                      class="text-muted">
                  Sin capacidades
                </span>
              </div>
            </td>
            
            <td>
              <div class="status-indicator">
                <span :class="['status-dot', getStatusClass(sensor.EstadoSalud)]"></span>
                {{ sensor.EstadoSalud }}
              </div>
            </td>
            
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.dashboard-section {
  margin-top: 50px;
  width: 100%;
  max-width: 1200px; 
}

.dashboard-section h2 {
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 10px;
  margin-bottom: 25px;
  color: #111827;
}

.status-msg {
  padding: 15px;
  border-radius: 6px;
  font-weight: bold;
  margin-bottom: 20px;
}
.loading-msg { background-color: #f3f4f6; color: #374151; }
.error-msg { background-color: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.no-data-msg { background-color: #fffbeb; color: #b45309; border: 1px solid #fde68a; }

/* ESTILOS DE LA TABLA */
.table-container {
  background-color: #ffffff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.dashboard-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.dashboard-table thead {
  background-color: #f9fafb;
}

.dashboard-table th {
  padding: 12px 16px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  border-bottom: 1px solid #e5e7eb;
}

.dashboard-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #e5e7eb;
  vertical-align: middle;
}

.dashboard-table tbody tr:hover {
  background-color: #f9fafb;
}

.dashboard-table tbody tr:last-child td {
  border-bottom: none;
}

.col-pos {
  text-align: center;
  width: 80px;
}

.font-bold {
  font-weight: bold;
  color: #374151;
}

.sensor-name {
  font-weight: 600;
  color: #1e3a8a;
}

.warning-text {
  color: #d97706;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: help;
}

.sensor-type {
  background-color: #e5e7eb;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: bold;
  color: #374151;
}

/* PIÍLDORAS RESUMEN DE CAPACIDADES */
.summary-pills {
  display: flex;
  gap: 8px;
}

.pill {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: help; /* Cambia el cursor al pasar por encima para indicar interactividad */
}

.pill-channels {
  background-color: #dbeafe;
  color: #1e40af;
  border: 1px solid #bfdbfe;
}

.pill-states {
  background-color: #f3e8ff;
  color: #6b21a8;
  border: 1px solid #e9d5ff;
}

.text-muted {
  color: #9ca3af;
  font-style: italic;
  font-size: 0.9rem;
}

/* INDICADOR DE ESTADO (Heredado de la tarjeta) */
.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  color: #374151;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.status-ok { background-color: #22c55e; box-shadow: 0 0 4px #22c55e; }
.status-error { background-color: #ef4444; box-shadow: 0 0 4px #ef4444; }
.status-warning { background-color: #f59e0b; box-shadow: 0 0 4px #f59e0b; }
.status-info { background-color: #3b82f6; box-shadow: 0 0 4px #3b82f6; }
.status-default { background-color: #9ca3af; }
</style>