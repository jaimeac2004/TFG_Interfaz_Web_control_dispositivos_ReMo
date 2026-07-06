<script setup lang="ts">
import type { SensorTarjetaUI } from '@/types/remo'

// 1. Definimos que este componente espera recibir una propiedad llamada "sensor"
defineProps<{
  sensor: SensorTarjetaUI
}>()

// 2. La lógica de colores se queda aquí porque es exclusiva del diseño de la tarjeta
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
  <div class="sensor-card">
    
    <div class="card-header">
      <span class="sensor-type">{{ sensor.Tipo }}</span>
      <span class="sensor-pos">Posición: {{ sensor.Posicion }}</span>
    </div>

    <div class="card-body">
      <p v-if="sensor.Canales && sensor.Canales.length">
        <strong>Canales:</strong> {{ sensor.Canales.join(', ') }}
      </p>
      <p v-if="sensor.Estados && sensor.Estados.length">
        <strong>Variables:</strong> {{ sensor.Estados.join(', ') }}
      </p>
    </div>

    <div class="card-footer">
      <div class="status-indicator">
        <span :class="['status-dot', getStatusClass(sensor.EstadoSalud)]"></span>
        <span class="status-text">{{ sensor.EstadoSalud }}</span>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Pegamos aquí SOLO el CSS que afecta a la tarjeta */
.sensor-card {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  text-align: left;
  transition: transform 0.2s;
}

.sensor-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
  margin-bottom: 15px;
}

.sensor-type {
  font-size: 1.4rem;
  font-weight: 900;
  color: #2c3e50;
}

.sensor-pos {
  background-color: #e9ecef;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: bold;
  color: #495057;
}

.card-body p {
  margin: 8px 0;
  font-size: 0.95rem;
  color: #555;
}

.card-footer {
  margin-top: auto;
  padding-top: 15px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: #f8f9fa;
  padding: 8px 12px;
  border-radius: 6px;
}

.status-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: inline-block;
}

.status-text {
  font-weight: bold;
  font-size: 0.95rem;
  color: #333;
}

.status-ok { background-color: #28a745; box-shadow: 0 0 6px #28a745; }
.status-error { background-color: #dc3545; box-shadow: 0 0 6px #dc3545; }
.status-warning { background-color: #ffc107; box-shadow: 0 0 6px #ffc107; }
.status-info { background-color: #17a2b8; box-shadow: 0 0 6px #17a2b8; }
.status-default { background-color: #6c757d; }
</style>