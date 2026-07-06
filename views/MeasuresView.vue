<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useMeasuresStore } from '@/stores/measureStore'; 
import type { MedidaItem } from '@/types/measures';
import MeasureCard from '@/components/MeasureCard.vue';

const measuresStore = useMeasuresStore();

const isPanelOpen = ref(false);
const isEditing = ref(false);
const intervalosTexto = ref('');

// 1. Plantilla estricta y limpia basada en la interfaz del sistema
const getEmptyMeasure = (): MedidaItem => ({
  Nombre: '',
  Activo: true,
  Data: '*',
  Prebuffer: 0,
  Captura: { Duracion: 10, Bloques: 1 },
  Programacion: {
    Inicio: new Date().toISOString().slice(0, 16),
    Fin: '2999-01-01T00:00', // Fecha infinta por defecto
    Periodicidad: 'Unico',
    Intervalos: []
  },
  Trigger: { Tipo: 'Timed', Niveles: [] },
  Procesado: []
});

const formData = ref<MedidaItem>(getEmptyMeasure());

onMounted(() => {
  measuresStore.fetchMedidas();
});

// --- LÓGICA DE INTERFAZ Y REGLAS DE NEGOCIO ---
const openCreatePanel = () => {
  formData.value = getEmptyMeasure();
  intervalosTexto.value = '';
  isEditing.value = false;
  isPanelOpen.value = true;
};

const openEditPanel = (medida: MedidaItem) => {
  const clone = JSON.parse(JSON.stringify(medida));
  const defaultTemplate = getEmptyMeasure();
  
  formData.value = {
    ...defaultTemplate,
    ...clone,
    Captura: { ...defaultTemplate.Captura, ...(clone.Captura || {}) },
    Programacion: { ...defaultTemplate.Programacion, ...(clone.Programacion || {}) },
    Trigger: { ...defaultTemplate.Trigger, ...(clone.Trigger || {}) }
  };

  // Extraemos los intervalos para el input de texto
  intervalosTexto.value = (formData.value.Programacion.Intervalos || []).join(', ');
  
  // Si las fechas vienen con milisegundos de LabVIEW, las recortamos para el input html
  if (formData.value.Programacion.Inicio) {
    formData.value.Programacion.Inicio = formData.value.Programacion.Inicio.slice(0, 16);
  }
  if (formData.value.Programacion.Fin) {
    formData.value.Programacion.Fin = formData.value.Programacion.Fin.slice(0, 16);
  }

  isEditing.value = true;
  isPanelOpen.value = true;
};

const closePanel = () => {
  isPanelOpen.value = false;
};

// --- GESTORES DE ARRAYS DINÁMICOS ---
const addNivel = () => {
  if (!formData.value.Trigger.Niveles) formData.value.Trigger.Niveles = [];
  formData.value.Trigger.Niveles.push({ Canal: '', Umbral: 1.0 });
};
const removeNivel = (idx: number) => {
  formData.value.Trigger.Niveles.splice(idx, 1);
};

const addProcesado = () => {
  if (!formData.value.Procesado) formData.value.Procesado = [];
  formData.value.Procesado.push({ Nombre: '', Config: '' });
};
const removeProcesado = (idx: number) => {
  formData.value.Procesado.splice(idx, 1);
};

// --- GUARDADO Y BORRADO ---
const guardarFormulario = async () => {
  if (!formData.value.Nombre.trim()) {
    alert("El nombre de la medida es obligatorio.");
    return;
  }

  // Parseamos los intervalos asegurándonos de enviar un array de enteros
  formData.value.Programacion.Intervalos = intervalosTexto.value
    ? intervalosTexto.value.split(',').map(val => parseInt(val.trim(), 10)).filter(val => !isNaN(val))
    : [];

  // Si el trigger es Timed, purgamos los niveles para que LabVIEW no reciba basura
  if (formData.value.Trigger.Tipo === 'Timed') {
    formData.value.Trigger.Niveles = [];
  }

  // Restauramos el formato ISO completo de las fechas si es necesario
  const payload = JSON.parse(JSON.stringify(formData.value));
  if (payload.Programacion.Inicio && payload.Programacion.Inicio.length === 16) {
    payload.Programacion.Inicio += ':00.000Z';
  }
  if (payload.Programacion.Fin && payload.Programacion.Fin.length === 16) {
    payload.Programacion.Fin += ':00.000Z';
  }

  try {
    await measuresStore.guardarMedida(payload);
    closePanel();
  } catch (error) {
    console.error("Error al guardar la medida en la vista:", error);
  }
};

const handleEliminar = async (medida: MedidaItem) => {
  const confirmacion = confirm(`¿Estás seguro de que deseas eliminar permanentemente la medida "${medida.Nombre}" del hardware?`);
  if (!confirmacion) return;

  // Objeto de borrado puro y minimalista
  const payloadBorrado = { Nombre: medida.Nombre };

  try {
    await measuresStore.guardarMedida(payloadBorrado);
  } catch (error) {
    console.error("Error al eliminar la medida:", error);
  }
};
</script>

<template>
  <div class="app-container">
    
    <main class="main-content" :class="{ 'main-content--shifted': isPanelOpen }">
      <header class="page-header">
        <div class="header-titles">
          <h1 class="page-title">Programador de Medidas</h1>
          <p class="page-subtitle">Gestión de adquisiciones autónomas (Gestor.Medidas)</p>
        </div>
        <button @click="openCreatePanel" class="btn-primary" :disabled="measuresStore.loading">
          <svg class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nueva Medida
        </button>
      </header>

      <div class="cards-container">
        <div v-if="measuresStore.loading && !isPanelOpen" class="loading-msg">
          Cargando medidas desde el hardware...
        </div>

        <div v-else-if="measuresStore.listaMedidas.length === 0" class="empty-msg">
          No hay medidas programadas en el sistema. Haz clic en "Nueva Medida" para comenzar.
        </div>

        <div v-else class="measures-grid">
          <MeasureCard 
            v-for="medida in measuresStore.listaMedidas" 
            :key="medida.Nombre" 
            :medida="medida"
            @edit="openEditPanel"
            @delete="handleEliminar"
          />
        </div>
      </div>
    </main>

    <aside class="side-panel" :class="isPanelOpen ? 'side-panel--open' : 'side-panel--closed'">
      <div class="panel-header">
        <h2 class="panel-title">{{ isEditing ? 'Editar Medida' : 'Crear Nueva Medida' }}</h2>
        <button @click="closePanel" class="btn-icon">
          <svg class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="panel-body">
        
        <div class="form-section">
          <div class="form-group">
            <label class="form-label">Nombre de la Medida</label>
            <input 
              v-model="formData.Nombre" 
              type="text" 
              class="form-input"
              :disabled="isEditing"
              placeholder="Ej. Ensayo_Motores_01"
            />
            <p v-if="isEditing" class="form-hint form-hint--warning">El nombre no se puede modificar.</p>
          </div>
          
          <div class="grid-2-cols">
            <div class="form-group-inline">
              <label class="form-label">Estado Inicial</label>
              <div class="toggle-wrapper">
                <input type="checkbox" id="activo-toggle" v-model="formData.Activo" class="toggle-checkbox" />
                <label for="activo-toggle" class="toggle-label"></label>
              </div>
              <span class="toggle-text">{{ formData.Activo ? 'Activa' : 'Inactiva' }}</span>
            </div>
            <div class="form-group">
              <label class="form-label">Canales (Data)</label>
              <input v-model="formData.Data" type="text" class="form-input" placeholder="Ej. * para todos" />
            </div>
          </div>
        </div>

        <hr class="divider" />

        <div class="form-section">
          <h3 class="section-title">Parámetros de Captura</h3>
          <div class="grid-2-cols">
            <div class="form-group">
              <label class="form-label">Duración (s)</label>
              <input v-model.number="formData.Captura.Duracion" type="number" class="form-input" min="1" />
            </div>
            <div class="form-group">
              <label class="form-label">Bloques</label>
              <input v-model.number="formData.Captura.Bloques" type="number" class="form-input" min="1" />
            </div>
          </div>
        </div>

        <hr class="divider" />

        <div class="form-section">
          <h3 class="section-title">Programación</h3>
          <div class="form-group">
            <label class="form-label">Periodicidad</label>
            <select v-model="formData.Programacion.Periodicidad" class="form-select">
              <option value="Unico">Único (1 sola vez)</option>
              <option value="Continuo">Continuo (Bucle infinito)</option>
              <option value="Fija">Fija</option>
              <option value="Hora">Cada Hora</option>
              <option value="Día">Diario</option>
              <option value="Semana">Semanal</option>
              <option value="Mes">Mensual</option>
              <option value="Año">Anual</option>
            </select>
          </div>
          
          <div v-if="['Fija', 'Hora', 'Día', 'Semana', 'Mes', 'Año'].includes(formData.Programacion.Periodicidad)" class="form-group">
            <label class="form-label">Intervalos (separados por coma)</label>
            <input v-model="intervalosTexto" type="text" placeholder="Ej. 0, 1800, 3600" class="form-input" />
            <p class="form-hint">Segundos desde el inicio del ciclo (Ej. 1800 = a y media).</p>
          </div>

          <div class="grid-2-cols">
            <div class="form-group">
              <label class="form-label">Fecha Inicio</label>
              <input v-model="formData.Programacion.Inicio" type="datetime-local" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">Fecha Fin</label>
              <input v-model="formData.Programacion.Fin" type="datetime-local" class="form-input" />
            </div>
          </div>
        </div>

        <hr class="divider" />

        <div class="form-section">
          <h3 class="section-title">Disparo (Trigger)</h3>
          <div class="grid-2-cols">
            <div class="form-group">
              <label class="form-label">Tipo de Trigger</label>
              <select v-model="formData.Trigger.Tipo" class="form-select">
                <option value="Timed">Por Tiempo (Timed)</option>
                <option value="Level">Por Nivel (Level)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Prebuffer (Muestras)</label>
              <input v-model.number="formData.Prebuffer" type="number" class="form-input" min="0" />
            </div>
          </div>

          <div v-if="formData.Trigger.Tipo === 'Level'" class="dynamic-list-container">
            <div class="list-header">
              <label class="form-label">Condiciones de Nivel</label>
              <button @click="addNivel" type="button" class="btn-text btn-text--edit">+ Añadir</button>
            </div>
            <div v-for="(nivel, idx) in formData.Trigger.Niveles" :key="idx" class="list-item">
              <input v-model="nivel.Canal" type="text" class="form-input list-input" placeholder="Canal (Ej. Acc-A.Z)" />
              <input v-model.number="nivel.Umbral" type="number" step="0.1" class="form-input list-input-sm" placeholder="Umbral" />
              <button @click="removeNivel(idx)" type="button" class="btn-icon text-danger" title="Borrar">✕</button>
            </div>
            <p v-if="!formData.Trigger.Niveles || formData.Trigger.Niveles.length === 0" class="form-hint text-center">No hay condiciones. Añade al menos una.</p>
          </div>
        </div>

        <hr class="divider" />

        <div class="form-section">
          <div class="list-header">
            <h3 class="section-title">Procesados Post-Captura</h3>
            <button @click="addProcesado" type="button" class="btn-text btn-text--edit">+ Añadir</button>
          </div>
          
          <div v-for="(proc, idx) in formData.Procesado" :key="'proc-'+idx" class="list-item">
            <input v-model="proc.Nombre" type="text" class="form-input list-input-sm" placeholder="Nombre (Ej. FFT)" />
            <input v-model="proc.Config" type="text" class="form-input list-input" placeholder="Config (Opcional)" />
            <button @click="removeProcesado(idx)" type="button" class="btn-icon text-danger" title="Borrar">✕</button>
          </div>
          <p v-if="!formData.Procesado || formData.Procesado.length === 0" class="form-hint text-center">
            Se ejecutará la captura base sin algoritmos extra.
          </p>
        </div>

      </div>

      <div class="panel-footer">
        <button @click="closePanel" class="btn-secondary">Cancelar</button>
        <button @click="guardarFormulario" class="btn-primary" :disabled="measuresStore.loading">
          {{ measuresStore.loading ? 'Guardando...' : 'Guardar Cambios' }}
        </button>
      </div>
    </aside>

    <div v-if="isPanelOpen" @click="closePanel" class="overlay"></div>
  </div>
</template>

<style scoped>
/* CONTENEDOR PRINCIPAL Y LAYOUT */
.app-container {
  display: flex;
  min-height: 100vh;
  background-color: var(--color-bg-main);
  font-family: var(--font-family);
  color: var(--color-text-primary);
  width: 100%;
  position: relative;
  overflow: hidden;
}

.main-content {
  flex: 1;
  padding: 6rem 2rem 2rem 2rem; /* El padding que negociamos para liberar el Logo */
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  transition: margin-right var(--transition-speed) ease-in-out;
}

.main-content--shifted {
  margin-right: 26rem; /* Empuja el contenido para hacer hueco al panel */
}

/* CABECERA */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.page-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--color-text-title);
  margin: 0;
}

.page-subtitle {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: 0.25rem 0 0 0;
}

/* CONTENEDOR DE TARJETAS */
.cards-container {
  width: 100%;
}
.measures-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  align-items: start;
}
.loading-msg, .empty-msg {
  padding: 3rem;
  text-align: center;
  color: var(--color-text-secondary);
  background: var(--color-bg-white);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

/* BOTONES */
.btn-primary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 0.5rem;
  background-color: var(--color-bg-white);
  padding: 0.625rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  cursor: pointer;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  transition: background-color 0.2s;
}
.btn-primary:hover { background-color: var(--color-primary-hover); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-secondary {
  flex: 1;
  padding: 0.625rem;
  background-color: var(--color-bg-white);
  border: 1px solid var(--color-input-border);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background-color 0.2s;
}
.btn-secondary:hover { background-color: var(--color-bg-main); }

.btn-text {
  background: none; border: none; cursor: pointer; padding: 0; font-weight: 500; transition: color 0.2s;
}
.btn-text--edit { color: var(--color-primary); }
.btn-text--edit:hover { color: var(--color-primary-hover); }

.btn-icon {
  background: none; border: none; color: var(--color-text-secondary); cursor: pointer; padding: 0.25rem; border-radius: 9999px; transition: background-color 0.2s, color 0.2s; display: flex; align-items: center; justify-content: center;
}
.btn-icon:hover { background-color: var(--color-border); color: var(--color-text-primary); }
.text-danger { color: var(--color-danger); }
.text-danger:hover { color: var(--color-danger-hover); background-color: #fef2f2; }

.icon { width: 1.25rem; height: 1.25rem; }

/* PANEL LATERAL (ASIDE) */
.side-panel {
  position: fixed;
  top: 0;
  bottom: 0;
  right: 0;
  width: 26rem; /* Ligeramente más ancho para acomodar las listas */
  background-color: var(--color-bg-white);
  box-shadow: -10px 0 15px -3px rgba(0, 0, 0, 0.1);
  border-left: 1px solid var(--color-border);
  transform: translateX(100%);
  transition: transform var(--transition-speed) ease-in-out;
  z-index: 20;
  display: flex;
  flex-direction: column;
}
.side-panel--open { transform: translateX(0); }

.panel-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--color-bg-main);
}
.panel-title { font-size: 1.25rem; font-weight: 700; color: var(--color-text-primary); margin: 0; }

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.panel-footer {
  padding: 1.5rem;
  border-top: 1px solid var(--color-border);
  background-color: var(--color-bg-main);
  display: flex;
  gap: 0.75rem;
}

/* FORMULARIOS */
.form-section { display: flex; flex-direction: column; gap: 1rem; }
.section-title { font-size: 1rem; font-weight: 700; color: var(--color-text-title); margin: 0 0 0.25rem 0; }
.form-group { display: flex; flex-direction: column; }
.form-group-inline { display: flex; align-items: center; gap: 0.75rem; }

.form-label { font-size: 0.875rem; font-weight: 600; color: var(--color-text-primary); margin-bottom: 0.25rem; }

.form-input, .form-select {
  width: 100%; border-radius: 0.5rem; border: 1px solid var(--color-input-border);
  background-color: var(--color-bg-white); color: var(--color-text-primary);
  padding: 0.5rem 0.75rem; font-size: 0.875rem; font-family: inherit;
  box-sizing: border-box; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); transition: border-color 0.2s, box-shadow 0.2s;
}
.form-input:focus, .form-select:focus { outline: none; border-color: var(--color-input-focus); box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
.form-input:disabled { background-color: var(--color-bg-main); color: var(--color-text-secondary); cursor: not-allowed; }

.form-hint { font-size: 0.75rem; color: var(--color-text-secondary); margin: 0.25rem 0 0 0; }
.form-hint--warning { color: var(--color-warning-text); }
.text-center { text-align: center; font-style: italic; }

.grid-2-cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
.divider { border: 0; border-top: 1px solid var(--color-border); margin: 0; }

/* LISTAS DINÁMICAS (Niveles y Procesado) */
.dynamic-list-container {
  background-color: var(--color-bg-main);
  border: 1px dashed var(--color-input-border);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
.list-item { display: flex; gap: 8px; align-items: center; }
.list-input { flex: 2; }
.list-input-sm { flex: 1; }

/* TOGGLE SWITCH CUSTOM */
.toggle-wrapper { position: relative; display: inline-block; width: 3rem; height: 1.5rem; vertical-align: middle; user-select: none; }
.toggle-checkbox { position: absolute; opacity: 0; width: 100%; height: 100%; cursor: pointer; z-index: 10; margin: 0; }
.toggle-label { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--color-input-border); border-radius: 9999px; cursor: pointer; transition: background-color 0.2s; }
.toggle-label::before { content: ""; position: absolute; height: 1.25rem; width: 1.25rem; left: 0.125rem; bottom: 0.125rem; background-color: var(--color-bg-white); border-radius: 50%; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
.toggle-checkbox:checked + .toggle-label { background-color: var(--color-primary); }
.toggle-checkbox:checked + .toggle-label::before { transform: translateX(1.5rem); }
.toggle-text { font-size: 0.875rem; color: var(--color-text-secondary); }

/* OVERLAY DE FONDO */
.overlay { position: fixed; inset: 0; background-color: rgba(0, 0, 0, 0.2); z-index: 10; }
</style>