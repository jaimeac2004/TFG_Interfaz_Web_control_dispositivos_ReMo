<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { useMeasuresStore } from '@/stores/measureStore';
import type { MedidaItem } from '@/types/measures';
import MeasureCard from '@/components/MeasureCard.vue';

const authStore = useAuthStore();
const measuresStore = useMeasuresStore(); const router = useRouter();
let pollInterval: any = null;

const isPanelOpen = ref(false);
const isEditing = ref(false);

// --- ESTADOS INTERMEDIOS PARA LA INTERFAZ (UI) ---
// Estos estados hacen que el formulario sea amigable. Al guardar, los convertimos al JSON de LabVIEW.

// 1. Fechas
const modoInicio = ref<'siempre' | 'fecha'>('siempre');
const modoFin = ref<'infinito' | 'fecha'>('infinito');

// 2. Canales, ELIMINADA, las datas se cogen de las opciones en Gestor.Datas
//const modoData = ref<'todos' | 'seleccion'>('todos');
//const canalesSeleccionados = ref<string[]>([]);

// 3. Intervalos
interface IntervaloUI { valor: number; unidad: 'segundos' | 'minutos' | 'horas' }
const intervalosUI = ref<IntervaloUI[]>([]);

// 4. Procesados
interface ProcesadoUI { Nombre: string; Config: string; isCustom: boolean }
const procesadosUI = ref<ProcesadoUI[]>([]);
const opcionesProcesado = ['TA', 'FFT', 'OMA', 'FRF', 'Data'];


const getEmptyMeasure = (): MedidaItem => ({
  Nombre: '',
  Activo: true,
  Data: '*',
  Prebuffer: 0,
  Captura: { Duracion: 10, Bloques: 1 },
  Programacion: {
    Inicio: new Date().toISOString().slice(0, 16),
    Fin: new Date().toISOString().slice(0, 16),
    Periodicidad: 'Unico',
    Intervalos: []
  },
  Trigger: { Tipo: 'Timed', Niveles: [] },
  Procesado: []
});

const formData = ref<MedidaItem>(getEmptyMeasure());

onMounted(() => {
  measuresStore.fetchMedidas();
  authStore.fetchDashboardData();

  pollInterval = setInterval(async () => {
    await authStore.checkSession();
    if (!authStore.isAuthenticated) {
      router.push('/');
      return;
    }
    // No bloqueamos la UI si el usuario está editando
    if (!isEditing.value && !isPanelOpen.value) {
      measuresStore.fetchMedidas();
    }
  }, 10000);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});

const toLocalDatetime = (utcString: string) => {
  if (!utcString || !utcString.includes('T')) return '';
  const date = new Date(utcString);
  // Restamos el offset de la zona horaria para "engañar" al input HTML
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const toUTCDatetime = (localString: string) => {
  if (!localString) return '';
  // JS asume que un string ISO sin 'Z' es hora local, y al instanciarlo y pedir .toISOString(), lo convierte a UTC automáticamente.
  return new Date(localString).toISOString();
};

const openCreatePanel = () => {
  formData.value = getEmptyMeasure();

  // Reseteamos UI a estados por defecto
  modoInicio.value = 'siempre';
  modoFin.value = 'infinito';
  //ELIMINADA, las datas se cogen de las opciones en Gestor.Datas
  //modoData.value = 'todos';
  //canalesSeleccionados.value = [];
  intervalosUI.value = [];
  procesadosUI.value = [];

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

  // --- MAPEO INVERSO: JSON de LabVIEW -> UI amigable ---

  // Fechas a botones

  modoInicio.value = formData.value.Programacion.Inicio.startsWith('1904') ? 'siempre' : 'fecha';
  modoFin.value = formData.value.Programacion.Fin.startsWith('2999') ? 'infinito' : 'fecha';

  if (modoInicio.value === 'fecha') {
    formData.value.Programacion.Inicio = toLocalDatetime(formData.value.Programacion.Inicio);
  }
  if (modoFin.value === 'fecha') {
    formData.value.Programacion.Fin = toLocalDatetime(formData.value.Programacion.Fin);
  }

  // AÑADIR ESTO: Si viene vacío, forzamos el asterisco por seguridad
  if (!formData.value.Data) formData.value.Data = '*';

  // Segundos a Intervalos con Unidades Humanas
  intervalosUI.value = (formData.value.Programacion.Intervalos || []).map(sec => {
    if (sec >= 3600 && sec % 3600 === 0) return { valor: sec / 3600, unidad: 'horas' };
    if (sec >= 60 && sec % 60 === 0) return { valor: sec / 60, unidad: 'minutos' };
    return { valor: sec, unidad: 'segundos' };
  });

  // Procesados (Ocultamos el * si existe)
  if (formData.value.Procesado?.length === 1 && formData.value.Procesado[0].Nombre === '*') {
    procesadosUI.value = [];
  } else {
    procesadosUI.value = (formData.value.Procesado || []).map(p => ({
      Nombre: p.Nombre,
      Config: p.Config || '',
      isCustom: !!p.Config && p.Config.trim() !== ''
    }));
  }

  isEditing.value = true;
  isPanelOpen.value = true;
};

const closePanel = () => {
  isPanelOpen.value = false;
};

// GESTIÓN NIVELES TRIGGER
const addNivel = () => {
  if (!formData.value.Trigger.Niveles) formData.value.Trigger.Niveles = [];
  formData.value.Trigger.Niveles.push({ Canal: '', Umbral: 1.0 });
};
const removeNivel = (idx: number) => {
  formData.value.Trigger.Niveles.splice(idx, 1);
};


// GUARDADO
const guardarFormulario = async () => {
  // Paso previo: comprobar que se introduzca un nombre para la medida
  if (!formData.value.Nombre.trim()) {
    alert("El nombre de la medida es obligatorio.");
    return;
  }

  // Paso previo: Validar Límites de Intervalos
  const limitMap: Record<string, number> = {
    'Hora': 3599, 'Día': 86399, 'Semana': 604799, 'Mes': 2678399, 'Año': 31535999
  };
  const periodicidad = formData.value.Programacion.Periodicidad;

  if (limitMap[periodicidad]) {
    const maxLimit = limitMap[periodicidad];
    for (const intv of intervalosUI.value) {
      const secs = intv.unidad === 'horas' ? intv.valor * 3600 : intv.unidad === 'minutos' ? intv.valor * 60 : intv.valor;
      if (secs > maxLimit) {
        alert(`Error matemático: Un intervalo de ${secs} segundos supera el límite permitido para la periodicidad "${periodicidad}" (Máx: ${maxLimit}s).`);
        return; // Bloquea el guardado
      }
    }
  }

  // 1. Reconstruir Fechas a UTC para LabVIEW 
  if (modoInicio.value === 'siempre') {
    formData.value.Programacion.Inicio = '1904-01-01T00:00:00.000Z';
  } else {
    formData.value.Programacion.Inicio = toUTCDatetime(formData.value.Programacion.Inicio);
  }

  if (modoFin.value === 'infinito') {
    formData.value.Programacion.Fin = '2999-01-01T00:00:00.000Z';
  } else {
    formData.value.Programacion.Fin = toUTCDatetime(formData.value.Programacion.Fin);
  }

  // 2. Reconstruir Canales, ELIMINADA las datas se cogen de Gestor.Datas
  //formData.value.Data = modoData.value === 'todos' ? '*' : canalesSeleccionados.value.join(', ');

  // 3. Reconstruir Intervalos multiplicando a segundos
  formData.value.Programacion.Intervalos = intervalosUI.value.map(i => {
    if (i.unidad === 'horas') return i.valor * 3600;
    if (i.unidad === 'minutos') return i.valor * 60;
    return i.valor; // segundos
  });

  // 4. Reconstruir Procesados (Gestión de comodín '*')
  if (procesadosUI.value.length === 0) {
    formData.value.Procesado = [{ Nombre: '*', Config: '' }];
  } else {
    formData.value.Procesado = procesadosUI.value.map(p => ({
      Nombre: p.Nombre,
      Config: p.isCustom ? p.Config : ''
    }));
  }

  if (formData.value.Trigger.Tipo === 'Timed') {
    formData.value.Trigger.Niveles = [];
  }

  const payload = JSON.parse(JSON.stringify(formData.value));

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
          Nueva Medida
        </button>
      </header>

      <div class="cards-container">
        <div v-if="measuresStore.loading && !isPanelOpen" class="loading-msg">Cargando medidas...</div>
        <div v-else-if="measuresStore.listaMedidas.length === 0" class="empty-msg">No hay medidas programadas.</div>
        <div v-else class="measures-grid">
          <MeasureCard v-for="medida in measuresStore.listaMedidas" :key="medida.Nombre" :medida="medida"
            @edit="openEditPanel" @delete="handleEliminar" />
        </div>
      </div>
    </main>

    <aside class="side-panel" :class="isPanelOpen ? 'side-panel--open' : 'side-panel--closed'">
      <div class="panel-header">
        <h2 class="panel-title">{{ isEditing ? 'Editar Medida' : 'Crear Nueva Medida' }}</h2>
        <button @click="closePanel" class="btn-icon">✕</button>
      </div>

      <div class="panel-body">

        <!-- SECCIÓN 1: IDENTIFICACIÓN -->
        <div class="form-section">
          <div class="form-group">
            <label class="form-label">Nombre de la Medida</label>
            <input v-model="formData.Nombre" type="text" class="form-input" :disabled="isEditing"
              placeholder="Ej. Ensayo_01" />
          </div>

          <div class="form-group-inline mt-2">
            <label class="form-label mb-0">Estado Inicial:</label>
            <div class="toggle-wrapper">
              <input type="checkbox" id="activo-toggle" v-model="formData.Activo" class="toggle-checkbox" />
              <label for="activo-toggle" class="toggle-label"></label>
            </div>
            <span class="toggle-text">{{ formData.Activo ? 'Activa' : 'Inactiva' }}</span>
          </div>

          <!-- Selector de conjunto de Datos (Gestor.Datas) -->
          <div class="form-group mt-2">
            <label class="form-label">Datos</label>
            <select v-model="formData.Data" class="form-select">
              <option value="*">Todos los canales (*)</option>
              <option v-for="grupo in measuresStore.listaDatas" :key="grupo" :value="grupo">
                Conjunto: {{ grupo }}
              </option>
            </select>
          </div>
        </div>

        <hr class="divider" />

        <!-- SECCIÓN 2: CAPTURA -->
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

        <!-- SECCIÓN 3: PROGRAMACIÓN -->
        <div class="form-section">
          <h3 class="section-title">Programación Temporal</h3>
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

          <!-- Intervalos Dinámicos -->
          <div v-if="['Fija', 'Hora', 'Día', 'Semana', 'Mes', 'Año'].includes(formData.Programacion.Periodicidad)"
            class="form-group">
            <label class="form-label">Intervalos de Ejecución</label>
            <div v-for="(intv, idx) in intervalosUI" :key="idx" class="list-item mt-2">
              <input v-model.number="intv.valor" type="number" min="0" class="form-input list-input-sm" />
              <select v-model="intv.unidad" class="form-select list-input">
                <option value="segundos">Segundos</option>
                <option value="minutos">Minutos</option>
                <option value="horas">Horas</option>
              </select>
              <button @click="intervalosUI.splice(idx, 1)" type="button" class="btn-icon text-danger">✕</button>
            </div>
            <button @click="intervalosUI.push({ valor: 1, unidad: 'minutos' })" type="button"
              class="btn-text btn-text--edit mt-2">+ Añadir Intervalo</button>
          </div>

          <div class="form-group mt-2">
            <label class="form-label">Fecha de Inicio</label>
            <div class="segmented-control mb-2">
              <button type="button" :class="{ active: modoInicio === 'siempre' }"
                @click="modoInicio = 'siempre'">Inmediato (Siempre)</button>
              <button type="button" :class="{ active: modoInicio === 'fecha' }" @click="modoInicio = 'fecha'">Fecha
                Específica</button>
            </div>
            <input v-if="modoInicio === 'fecha'" v-model="formData.Programacion.Inicio" type="datetime-local"
              class="form-input" />
          </div>

          <div class="form-group mt-2">
            <label class="form-label">Fecha de Fin</label>
            <div class="segmented-control mb-2">
              <button type="button" :class="{ active: modoFin === 'infinito' }" @click="modoFin = 'infinito'">Sin Fin
                (Infinito)</button>
              <button type="button" :class="{ active: modoFin === 'fecha' }" @click="modoFin = 'fecha'">Fecha
                Específica</button>
            </div>
            <input v-if="modoFin === 'fecha'" v-model="formData.Programacion.Fin" type="datetime-local"
              class="form-input" />
          </div>
        </div>

        <hr class="divider" />

        <!-- SECCIÓN 4: DISPARO -->
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
              <label class="form-label">Prebuffer (Segundos)</label>
              <input v-model.number="formData.Prebuffer" type="number" class="form-input" min="0" />
            </div>
          </div>

          <div v-if="formData.Trigger.Tipo === 'Level'" class="dynamic-list-container">
            <div class="list-header">
              <label class="form-label">Condiciones de Nivel</label>
              <button @click="addNivel" type="button" class="btn-text btn-text--edit">+ Añadir</button>
            </div>
            <div v-for="(nivel, idx) in formData.Trigger.Niveles" :key="idx" class="list-item">
              <input v-model="nivel.Canal" type="text" class="form-input list-input"
                placeholder="Canal (Ej. Acc-A.Z)" />
              <input v-model.number="nivel.Umbral" type="number" step="0.1" class="form-input list-input-sm"
                placeholder="Umbral" />
              <button @click="removeNivel(idx)" type="button" class="btn-icon text-danger">✕</button>
            </div>
          </div>
        </div>

        <hr class="divider" />

        <!-- SECCIÓN 5: PROCESADOS -->
        <div class="form-section">
          <div class="list-header">
            <h3 class="section-title">Procesados Post-Captura</h3>
          </div>

          <div v-if="procesadosUI.length === 0" class="empty-proc-msg">
            Se ejecutarán <strong>Todos los procesados por defecto (*)</strong>.<br>Añade uno para elegir específicos.
          </div>

          <div v-for="(proc, idx) in procesadosUI" :key="idx" class="proc-box">
            <div class="proc-header">
              <select v-model="proc.Nombre" class="form-select list-input-sm">
                <option disabled value="">Elige procesado...</option>
                <option v-for="op in opcionesProcesado" :key="op" :value="op">{{ op }}</option>
              </select>
              <button @click="procesadosUI.splice(idx, 1)" type="button" class="btn-icon text-danger">✕</button>
            </div>
            <label class="checkbox-label mt-2">
              <input type="checkbox" v-model="proc.isCustom" /> Personalizar Configuración
            </label>
            <input v-if="proc.isCustom" v-model="proc.Config" type="text" class="form-input mt-2"
              placeholder='Ej. {"Res F": 0.1}' />
          </div>
          <button @click="procesadosUI.push({ Nombre: '', Config: '', isCustom: false })" type="button"
            class="btn-text btn-text--edit mt-2">+ Añadir Procesado</button>
        </div>

      </div>

      <div class="panel-footer">
        <button @click="closePanel" class="btn-secondary">Cancelar</button>
        <button @click="guardarFormulario" class="btn-primary" :disabled="measuresStore.loading">
          Guardar Cambios
        </button>
      </div>
    </aside>

    <div v-if="isPanelOpen" @click="closePanel" class="overlay"></div>
  </div>
</template>

<style scoped>
/* ESTILOS PREVIOS INTACTOS */
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
  padding: 6rem 2rem 2rem 2rem;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  transition: margin-right var(--transition-speed) ease-in-out;
}

.main-content--shifted {
  margin-right: 26rem;
}

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

.cards-container {
  width: 100%;
}

.measures-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  align-items: start;
}

.loading-msg,
.empty-msg {
  padding: 3rem;
  text-align: center;
  color: var(--color-text-secondary);
  background: var(--color-bg-white);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 0.5rem;
  background-color: var(--color-primary);
  padding: 0.625rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #fff;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background-color: var(--color-primary-hover);
}

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

.btn-secondary:hover {
  background-color: var(--color-bg-main);
}

.btn-text {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-weight: 500;
  transition: color 0.2s;
}

.btn-text--edit {
  color: var(--color-primary);
}

.btn-icon {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 9999px;
  transition: background-color 0.2s, color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background-color: var(--color-border);
  color: var(--color-text-primary);
}

.text-danger {
  color: var(--color-danger);
}

.side-panel {
  position: fixed;
  top: 0;
  bottom: 0;
  right: 0;
  width: 28rem;
  background-color: var(--color-bg-white);
  box-shadow: -10px 0 15px -3px rgba(0, 0, 0, 0.1);
  border-left: 1px solid var(--color-border);
  transform: translateX(100%);
  transition: transform var(--transition-speed) ease-in-out;
  z-index: 20;
  display: flex;
  flex-direction: column;
}

.side-panel--open {
  transform: translateX(0);
}

.panel-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--color-bg-main);
}

.panel-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

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

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-title);
  margin: 0 0 0.25rem 0;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group-inline {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 0.25rem;
}

.mb-0 {
  margin-bottom: 0;
}

.mt-2 {
  margin-top: 0.5rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.form-input,
.form-select {
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid var(--color-input-border);
  background-color: var(--color-bg-white);
  color: var(--color-text-primary);
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-family: inherit;
  box-sizing: border-box;
}

.form-input:disabled {
  background-color: var(--color-bg-main);
  color: var(--color-text-secondary);
  cursor: not-allowed;
}

.grid-2-cols {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.divider {
  border: 0;
  border-top: 1px solid var(--color-border);
  margin: 0;
}

.dynamic-list-container {
  background-color: var(--color-bg-main);
  border: 1px dashed var(--color-input-border);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.list-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.list-input {
  flex: 2;
}

.list-input-sm {
  flex: 1;
}

.toggle-wrapper {
  position: relative;
  display: inline-block;
  width: 3rem;
  height: 1.5rem;
  vertical-align: middle;
  user-select: none;
}

.toggle-checkbox {
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  z-index: 10;
  margin: 0;
}

.toggle-label {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-input-border);
  border-radius: 9999px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.toggle-label::before {
  content: "";
  position: absolute;
  height: 1.25rem;
  width: 1.25rem;
  left: 0.125rem;
  bottom: 0.125rem;
  background-color: var(--color-bg-white);
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.toggle-checkbox:checked+.toggle-label {
  background-color: var(--color-primary);
}

.toggle-checkbox:checked+.toggle-label::before {
  transform: translateX(1.5rem);
}

.toggle-text {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.2);
  z-index: 10;
}

/* NUEVOS ESTILOS PARA LOS CONTROLES SEGMENTADOS Y CHECKBOXES */
.segmented-control {
  display: flex;
  background-color: var(--color-bg-main);
  border-radius: 6px;
  border: 1px solid var(--color-input-border);
  overflow: hidden;
}

.segmented-control button {
  flex: 1;
  padding: 8px;
  border: none;
  background: none;
  font-size: 0.85rem;
  cursor: pointer;
  color: var(--color-text-secondary);
  font-weight: 600;
  transition: all 0.2s;
}

.segmented-control button.active {
  background-color: var(--color-primary);
  color: white;
}

.checkbox-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  max-height: 120px;
  overflow-y: auto;
  padding: 10px;
  border: 1px solid var(--color-input-border);
  border-radius: 6px;
  background: var(--color-bg-white);
}

.checkbox-label {
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: var(--color-text-primary);
}

.empty-proc-msg {
  background-color: #f0fdf4;
  color: #166534;
  padding: 12px;
  border-radius: 6px;
  font-size: 0.85rem;
  border: 1px solid #bbf7d0;
  text-align: center;
}

.proc-box {
  border: 1px solid var(--color-input-border);
  border-radius: 6px;
  padding: 12px;
  margin-top: 10px;
  background-color: var(--color-bg-white);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.proc-header {
  display: flex;
  gap: 10px;
  align-items: center;
}
</style>