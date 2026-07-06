<script setup lang="ts">
import type { MedidaItem } from '@/types/measures'

// 1. Recibimos la medida desde el padre
defineProps<{
  medida: MedidaItem
}>()

// 2. Definimos los eventos que le mandaremos al padre
const emit = defineEmits<{
  (e: 'edit', medida: MedidaItem): void
  (e: 'delete', medida: MedidaItem): void
}>()

const formatFecha = (isoString?: string) => {
  if (!isoString) return 'Sin definir'
  if (isoString.startsWith('1904')) return 'Siempre (Activa)'
  if (isoString.startsWith('2999')) return 'Infinito'
  
  try {
    const date = new Date(isoString)
    return date.toLocaleString(undefined, { 
      year: 'numeric', month: 'short', day: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    })
  } catch {
    return isoString
  }
}
</script>
<template>
  <div class="measure-card">
    <div class="card-header">
      <h3 class="measure-name">{{ medida.Nombre }}</h3>
      <span class="badge" :class="medida.Activo !== false ? 'badge-active' : 'badge-inactive'">
        {{ medida.Activo !== false ? 'Activa' : 'Inactiva' }}
      </span>
    </div>

    <div class="card-body">
      <div class="info-row">
        <strong>Captura:</strong> 
        <span>{{ medida.Captura?.Duracion ?? 0 }}seg x {{ medida.Captura?.Bloques ?? 0 }} bloques</span>
      </div>
      
      <div class="info-row">
        <strong>Periodicidad:</strong> 
        <span>{{ medida.Programacion?.Periodicidad ?? 'Único' }}</span>
      </div>
      
      <div v-if="medida.Programacion?.Intervalos && medida.Programacion.Intervalos.length > 0" class="info-row">
        <strong>Intervalos (s):</strong> 
        <span class="text-data">{{ medida.Programacion.Intervalos.join(', ') }}</span>
      </div>

      <div v-if="medida.Trigger?.Tipo === 'Timed' || (medida.Programacion?.Inicio && medida.Programacion.Inicio !== '')" class="dynamic-section time-section">
        <div class="info-row-small">
          <strong>Inicio:</strong> <span>{{ formatFecha(medida.Programacion?.Inicio) }}</span>
        </div>
        <div class="info-row-small">
          <strong>Fin:</strong> <span>{{ formatFecha(medida.Programacion?.Fin) }}</span>
        </div>
      </div>

      <div v-if="medida.Trigger?.Tipo === 'Level'" class="dynamic-section trigger-level">
        <strong>Disparo por Nivel (Level):</strong>
        <ul class="level-list">
          <li v-for="(nivel, idx) in medida.Trigger.Niveles" :key="idx">
            {{ nivel.Canal }} > {{ nivel.Umbral }}
          </li>
        </ul>
      </div>
      
      <div v-else class="dynamic-section trigger-timed">
        <strong>Disparo:</strong> <span>Por Tiempo (Timed)</span>
      </div>

      <div v-if="medida.Prebuffer !== undefined && medida.Prebuffer > 0" class="info-row">
        <strong>Prebuffer:</strong> <span>{{ medida.Prebuffer }} muestras</span>
      </div>

      <div v-if="medida.Procesado && medida.Procesado.length > 0" class="process-wrapper">
        <strong class="process-title">Procesado:</strong>
        <div class="process-tags">
          <span v-for="(proc, idx) in medida.Procesado" :key="idx" class="proc-badge" :title="proc.Config ? 'Config: ' + proc.Config : 'Sin config extra'">
            {{ proc.Nombre }}
          </span>
        </div>
      </div>

    </div>

    <div class="card-footer">
      <button @click="emit('edit', medida)" class="btn-action edit">Modificar</button>
      <button @click="emit('delete', medida)" class="btn-action delete">Eliminar</button>
    </div>
  </div>
</template>

<style scoped>
/* Estilos globales y de tarjeta mantenidos con soporte para Modo Oscuro */
.measure-card {
  background-color: var(--color-bg-white);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, box-shadow 0.2s, background-color 0.3s;
}

.measure-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid var(--color-border, #f3f4f6);
  background-color: var(--color-bg-main, #f9fafb);
  border-radius: 8px 8px 0 0;
}

.measure-name {
  margin: 0;
  font-size: 1.1rem;
  color: var(--color-text-title, #1e3a8a);
  font-weight: bold;
}

.badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: bold;
}
.badge-active { 
  background-color: var(--color-badge-active-bg, #d1fae5); 
  color: var(--color-badge-active-text, #065f46); 
}
.badge-inactive { 
  background-color: var(--color-badge-inactive-bg, #f3f4f6); 
  color: var(--color-badge-inactive-text, #4b5563); 
}

.card-body {
  padding: 15px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  color: var(--color-text-secondary, #374151);
}

.info-row-small {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--color-text-secondary, #4b5563);
  margin-bottom: 3px;
}

.text-data {
  font-family: monospace;
  background-color: var(--color-bg-main, #f3f4f6);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.85rem;
}

.dynamic-section {
  margin-top: 5px;
  padding: 10px;
  border-radius: 6px;
  font-size: 0.85rem;
}

.time-section {
  background-color: var(--color-bg-main, #f8fafc);
  border: 1px solid var(--color-border, #e2e8f0);
  padding: 8px 10px;
}

.trigger-level { 
  background-color: var(--color-bg-main, #fff7ed); 
  border: 1px solid var(--color-border, #fed7aa); 
}
.trigger-timed { 
  background-color: var(--color-bg-main, #f0fdf4); 
  border: 1px solid var(--color-border, #bbf7d0); 
  display: flex; 
  justify-content: space-between;
}
.level-list { 
  margin: 5px 0 0 0; 
  padding-left: 20px; 
  color: var(--color-warning-text, #c2410c);
}

/* NUEVO: Estilos para la sección de procesado */
.process-wrapper {
  margin-top: 5px;
  padding-top: 10px;
  border-top: 1px dashed var(--color-border, #e5e7eb);
}
.process-title {
  font-size: 0.85rem;
  color: var(--color-text-secondary, #374151);
  display: block;
  margin-bottom: 6px;
}
.process-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.proc-badge {
  background-color: var(--color-primary, #2563eb);
  color: #ffffff;
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: bold;
  cursor: help;
}

.card-footer {
  padding: 10px 15px;
  border-top: 1px solid var(--color-border, #f3f4f6);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-action {
  background: none;
  border: none;
  font-weight: bold;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 4px;
  transition: background-color 0.2s, color 0.2s;
}
.edit { color: var(--color-primary, #2563eb); }
.edit:hover { background-color: var(--color-bg-main, #eff6ff); }
.delete { color: var(--color-danger, #dc2626); }
.delete:hover { background-color: var(--color-bg-main, #fef2f2); }
</style>