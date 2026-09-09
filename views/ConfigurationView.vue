<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useConfigStore } from '@/stores/configStore';
import { useAuthStore } from '@/stores/authStore';

const auth = useAuthStore();
const configStore = useConfigStore();

// --- ESTADOS DE LA UI ---
const activeMenu = ref<'global' | 'datas' | 'procesado' | 'influx'>('global');
const activeProcTab = ref<'Data' | 'TA' | 'FFT' | 'OMA' | 'FRF'>('Data');
const showConfirmModal = ref(false);

onMounted(() => {
  configStore.fetchConfig();
  auth.fetchDashboardData();
});

// --- COMPUTADOS ---
// Genera los estados disponibles leyendo los sensores de LabVIEW
const estadosDisponibles = computed(() => {
  const arr: string[] = [];
  auth.sensoresUI.forEach(s => {
    if (s.Estados && s.Estados.length > 0) {
      s.Estados.forEach(e => {
        const sufijo = e === 'Temperatura' ? 'T' : e === 'Humedad' ? 'H' : e;
        arr.push(`${s.Nombre}.${sufijo}`);
      });
    }
  });
  return arr;
});

// --- LÓGICA DE BOTONES (Guardado/Cancelación) ---
const handleSaveClick = () => showConfirmModal.value = true;
const confirmSave = async () => {
  showConfirmModal.value = false;
  await configStore.saveConfig();
};
const handleCancel = () => {
  if (confirm("¿Estás seguro de descartar todos los cambios no guardados?")) configStore.cancelarCambios();
};

// --- OPERACIONES DE HARDWARE (Añadir/Eliminar) ---
const addNodo = () => configStore.draftConfig!.Gestor.Nodos.push({ Sensor: 0, Nombre: 'CH_Nuevo', Posicion: {x:0, y:0, z:0} });
const removeNodo = (idx: number) => configStore.draftConfig!.Gestor.Nodos.splice(idx, 1);

const addATH = () => configStore.draftConfig!.ATHAD.ATHs.push({ Sensor: -1, Rango: '2g', HPF: false });
const removeATH = (idx: number) => configStore.draftConfig!.ATHAD.ATHs.splice(idx, 1);

const addAD = () => configStore.draftConfig!.ATHAD.ADs.push({ Sensor: -1, Ganancia: 1 });
const removeAD = (idx: number) => configStore.draftConfig!.ATHAD.ADs.splice(idx, 1);

const addCalibracion = () => configStore.draftConfig!.ATHAD.Calibracion.push({ Sensor: -1, Gains: [1.0], Offsets: [0.0] });
const removeCalibracion = (idx: number) => configStore.draftConfig!.ATHAD.Calibracion.splice(idx, 1);

// --- OPERACIONES DE DATAS (Añadir/Eliminar Conjuntos) ---
const addDataset = () => configStore.draftConfig!.Gestor.Datas.push({ Nombre: 'Nuevo_Conjunto', Canales: [], Estados: [] });
const removeDataset = (idx: number) => configStore.draftConfig!.Gestor.Datas.splice(idx, 1);

// --- UTILIDADES DE PROCESADO (Gestión del * y modos) ---
const getProcMode = (canales: string[] | undefined) => {
  if (!canales || canales.length === 0) return 'manual';
  if (canales.length === 1 && canales[0] === '*') return 'todos';
  if (canales.length === 1 && configStore.draftConfig?.Gestor.Datas.some(d => d.Nombre === canales[0])) return 'conjunto';
  return 'manual';
};

const setProcMode = (mode: string, parent: any, key: string) => {
  if (mode === 'todos') {
    parent[key] = ['*'];
  } else if (mode === 'conjunto') {
    const firstData = configStore.draftConfig?.Gestor.Datas[0]?.Nombre || '';
    parent[key] = [firstData];
  } else {
    parent[key] = [];
  }
};

// --- UTILIDADES PARA LISTAS DESPLEGABLES ---
const addStringToArray = (lista: string[], event: Event) => {
  const target = event.target as HTMLSelectElement | null;
  if (target && target.value) {
    if (!lista.includes(target.value)) {
      lista.push(target.value);
    }
    target.value = ''; // Resetea el desplegable
  }
};

</script>

<template>
  <div class="app-container">
    
    <!-- CONTENIDO PRINCIPAL -->
    <main class="main-content">
      
      <!-- CABECERA -->
      <header class="page-header">
        <div class="header-titles">
          <h1 class="page-title">Configuración del Sistema (ReMo)</h1>
          <p class="page-subtitle">Parámetros globales, hardware y procesado</p>
        </div>
        <div class="header-actions">
          <button @click="handleCancel" class="btn-secondary" :disabled="configStore.loading">
            Cancelar Cambios
          </button>
          <button @click="handleSaveClick" class="btn-primary" :disabled="configStore.loading">
            {{ configStore.loading ? 'Enviando...' : 'Guardar Configuración' }}
          </button>
        </div>
      </header>

      <!-- MENSAJES DE ESTADO -->
      <div v-if="configStore.error" class="alert error">{{ configStore.error }}</div>
      <div v-if="configStore.successMsg" class="alert success">{{ configStore.successMsg }}</div>

      <div v-if="configStore.loading && !configStore.draftConfig" class="loading-msg">
        Cargando configuración desde el hardware...
      </div>

      <!-- LAYOUT DIVIDIDO -->
      <div v-else-if="configStore.draftConfig" class="config-layout">
        
        <!-- SIDEBAR DE SECCIONES (Pegado a la izquierda) -->
        <aside class="config-sidebar">
          <button :class="['nav-btn', { active: activeMenu === 'global' }]" @click="activeMenu = 'global'">
            1. Global y Hardware
          </button>
          <button :class="['nav-btn', { active: activeMenu === 'datas' }]" @click="activeMenu = 'datas'">
            2. Conjuntos de Datos
          </button>
          <button :class="['nav-btn', { active: activeMenu === 'procesado' }]" @click="activeMenu = 'procesado'">
            3. Procesamiento
          </button>
          <button :class="['nav-btn', { active: activeMenu === 'influx' }]" @click="activeMenu = 'influx'">
            4. InfluxDB
          </button>
        </aside>

        <!-- PANEL DE CONTENIDO DINÁMICO -->
        <div class="config-content">
          
          <!-- SECCIÓN 1: GLOBAL Y HARDWARE (Nodos y ATHAD) -->
          <div v-if="activeMenu === 'global'" class="fade-in">
            <h2 class="section-title">Parámetros Globales</h2>
            <div class="form-group mb-4" style="max-width: 300px;">
              <label class="form-label">Frecuencia de Muestreo (fs)</label>
              <select v-model.number="configStore.draftConfig.Global.fs" class="form-select">
                <option :value="62.5">62.5 Hz</option><option :value="125">125 Hz</option>
                <option :value="250">250 Hz</option><option :value="500">500 Hz</option>
                <option :value="1000">1000 Hz</option><option :value="2000">2000 Hz</option>
                <option :value="4000">4000 Hz</option>
              </select>
            </div>

            <hr class="divider" />
            
            <div class="flex-between mt-4 mb-2">
              <h2 class="section-title mb-0">Nodos Lógicos (Gestor.Nodos)</h2>
              <button @click="addNodo" class="btn-text btn-text--edit">+ Añadir Nodo</button>
            </div>
            <table class="data-table">
              <thead><tr><th>Sensor (Pos)</th><th>Nombre</th><th>Pos X</th><th>Pos Y</th><th>Pos Z</th><th>Acción</th></tr></thead>
              <tbody>
                <tr v-for="(nodo, idx) in configStore.draftConfig.Gestor.Nodos" :key="idx">
                  <td><input v-model.number="nodo.Sensor" type="number" class="form-input-sm" /></td>
                  <td><input v-model="nodo.Nombre" type="text" class="form-input-sm" /></td>
                  <td><input v-model.number="nodo.Posicion.x" type="number" class="form-input-sm" /></td>
                  <td><input v-model.number="nodo.Posicion.y" type="number" class="form-input-sm" /></td>
                  <td><input v-model.number="nodo.Posicion.z" type="number" class="form-input-sm" /></td>
                  <td class="text-center"><button @click="removeNodo(idx)" class="btn-icon text-danger" title="Borrar Nodo">✕</button></td>
                </tr>
              </tbody>
            </table>

            <hr class="divider mt-4" />

            <h2 class="section-title mt-4">Hardware ATHAD</h2>
            <div class="grid-3-cols mb-4">
              <div class="form-group">
                <label class="form-label">I2CFrec</label>
                <select v-model.number="configStore.draftConfig.ATHAD.I2CFrec" class="form-select">
                  <option value="100">100</option><option value="200">200</option>
                  <option value="300">300</option><option value="500">500</option>
                  <option value="666">666</option><option value="1000">1000</option>
                </select>
              </div>
              <div class="form-group"><label class="form-label">DODR</label><input v-model.number="configStore.draftConfig.ATHAD.DODR" type="number" class="form-input" /></div>
              <div class="form-group"><label class="form-label">TH (s)</label><input v-model.number="configStore.draftConfig.ATHAD.TH" type="number" class="form-input" /></div>
            </div>

            <div class="grid-2-cols">
              <div>
                <div class="flex-between mb-2">
                  <h4>Sensores ATH</h4>
                  <button @click="addATH" class="btn-text btn-text--edit">+ Añadir ATH</button>
                </div>
                <table class="data-table">
                  <thead><tr><th>Sensor</th><th>Rango</th><th>HPF</th><th></th></tr></thead>
                  <tbody>
                    <tr v-for="(ath, idx) in configStore.draftConfig.ATHAD.ATHs" :key="idx">
                      <td class="text-center">
                        <input v-model.number="ath.Sensor" type="number" class="form-input-sm" style="width: 60px;" title="Escribe -1 para configuración por defecto" />
                        <div v-if="ath.Sensor === -1" class="badge badge-default" style="display: block; margin-top: 4px;">Por Defecto</div>
                      </td>
                      <td>
                        <select v-model="ath.Rango" class="form-select list-input-sm">
                          <option value="2g">2g</option><option value="4g">4g</option><option value="8g">8g</option>
                        </select>
                      </td>
                      <td class="text-center"><input type="checkbox" v-model="ath.HPF" /></td>
                      <td class="text-center"><button @click="removeATH(idx)" class="btn-icon text-danger">✕</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div>
                <div class="flex-between mb-2">
                  <h4>Sensores AD</h4>
                  <button @click="addAD" class="btn-text btn-text--edit">+ Añadir AD</button>
                </div>
                <table class="data-table">
                  <thead><tr><th>Sensor</th><th>Ganancia</th><th></th></tr></thead>
                  <tbody>
                    <tr v-for="(ad, idx) in configStore.draftConfig.ATHAD.ADs" :key="idx">
                      <td class="text-center">
                        <input v-model.number="ad.Sensor" type="number" class="form-input-sm" style="width: 60px;" title="Escribe -1 para configuración por defecto" />
                        <div v-if="ad.Sensor === -1" class="badge badge-default" style="display: block; margin-top: 4px;">Por Defecto</div>
                      </td>
                      <td><input v-model.number="ad.Ganancia" type="number" class="form-input-sm" /></td>
                      <td class="text-center"><button @click="removeAD(idx)" class="btn-icon text-danger">✕</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <hr class="divider mt-4" />
            <div class="flex-between mt-4 mb-2">
              <h2 class="section-title mb-0">Calibración Hardware</h2>
              <button @click="addCalibracion" class="btn-text btn-text--edit">+ Añadir Calibración</button>
            </div>
            <table class="data-table">
              <thead><tr><th>Sensor</th><th>Gains (JSON Array)</th><th>Offsets (JSON Array)</th><th>Acción</th></tr></thead>
              <tbody>
                <tr v-for="(cal, idx) in configStore.draftConfig.ATHAD.Calibracion" :key="idx">
                  <td class="text-center">
                    <input v-model.number="cal.Sensor" type="number" class="form-input-sm" style="width: 60px;" title="Escribe -1 para configuración por defecto" />
                    <div v-if="cal.Sensor === -1" class="badge badge-default" style="display: block; margin-top: 4px;">Por Defecto</div>
                  </td>
                  <td>
                    <input :value="JSON.stringify(cal.Gains)" @change="e => cal.Gains = JSON.parse((e.target as HTMLInputElement).value)" type="text" class="form-input-sm" />
                  </td>
                  <td>
                    <input :value="JSON.stringify(cal.Offsets)" @change="e => cal.Offsets = JSON.parse((e.target as HTMLInputElement).value)" type="text" class="form-input-sm" />
                  </td>
                  <td class="text-center"><button @click="removeCalibracion(idx)" class="btn-icon text-danger">✕</button></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- SECCIÓN 2: DATAS (Gestor.Datas) -->
          <div v-else-if="activeMenu === 'datas'" class="fade-in">
            <div class="flex-between mb-4">
              <div>
                <h2 class="section-title mb-0">Conjuntos de Datos (Gestor.Datas)</h2>
                <p class="text-muted">Define grupos de canales y estados.</p>
              </div>
              <button @click="addDataset" class="btn-primary">+ Nuevo Conjunto</button>
            </div>
            
            <div v-for="(dataset, idx) in configStore.draftConfig.Gestor.Datas" :key="idx" class="data-card mb-4">
              <div class="flex-between mb-2">
                <div class="form-group" style="flex:1; max-width: 300px;">
                  <label class="form-label">Nombre del Conjunto</label>
                  <input v-model="dataset.Nombre" type="text" class="form-input" />
                </div>
                <button @click="removeDataset(idx)" class="btn-secondary text-danger">Eliminar Conjunto</button>
              </div>
              
              <div class="grid-2-cols">
                <!-- Selector de Canales -->
                <div class="form-group">
                  <label class="form-label">Canales Físicos</label>
                  <div class="tags-container mb-2">
                    <span v-for="(ch, i) in dataset.Canales" :key="i" class="badge-tag">
                      {{ ch }} <button @click="dataset.Canales.splice(i,1)" class="tag-close">✕</button>
                    </span>
                    <span v-if="dataset.Canales.length === 0" class="text-muted">Ningún canal añadido.</span>
                  </div>
                  <select @change="addStringToArray(dataset.Canales, $event)" class="form-select">
                    <option value="">+ Añadir Canal...</option>
                    <option v-for="c in auth.canalesDisponibles" :key="c" :value="c">{{ c }}</option>
                  </select>
                </div>
                
                <!-- Selector de Estados -->
                <div class="form-group">
                  <label class="form-label">Variables de Estado</label>
                  <div class="tags-container mb-2">
                    <span v-for="(st, i) in dataset.Estados" :key="i" class="badge-tag state-tag">
                      {{ st }} <button @click="dataset.Estados.splice(i,1)" class="tag-close">✕</button>
                    </span>
                    <span v-if="dataset.Estados.length === 0" class="text-muted">Ningún estado añadido.</span>
                  </div>
                  <select @change="addStringToArray(dataset.Estados, $event)" class="form-select">
                      <option value="">+ Añadir Estado...</option>
                    <option v-for="s in estadosDisponibles" :key="s" :value="s">{{ s }}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- SECCIÓN 3: PROCESADO -->
          <div v-else-if="activeMenu === 'procesado'" class="fade-in proc-layout">
            <div class="proc-sidebar">
              <button v-for="tab in ['Data', 'TA', 'FFT', 'OMA', 'FRF']" :key="tab" 
                      :class="['proc-tab-btn', { active: activeProcTab === tab }]"
                      @click="activeProcTab = tab as any">
                {{ tab }}
              </button>
            </div>

            <div class="proc-content">
              <div class="flex-between" style="border-bottom: 2px solid var(--color-border); margin-bottom: 20px;">
                <h2 class="section-title" style="border-bottom: none; margin-bottom: 0; padding-bottom: 8px;">Configuración: {{ activeProcTab }}</h2>
                <button v-if="['FFT', 'OMA', 'FRF'].includes(activeProcTab)" 
                        @click="configStore.resetProcesado(activeProcTab as any)" 
                        class="btn-text text-danger mb-2" 
                        title="Vacia este procesado para que se elimine de la configuración">
                  Borrar configuración actual
                </button>
              </div>
              
              <!-- Canales Globales (Para todos excepto OMA) -->
              <div v-if="activeProcTab !== 'OMA' && configStore.draftConfig[activeProcTab]" class="form-group mb-4">
                <label class="form-label">Canales objetivo para {{ activeProcTab }}</label>
                
                <!-- Selector Inteligente de Modo -->
                <select :value="getProcMode((configStore.draftConfig as any)[activeProcTab].Canales)" @change="e => setProcMode((e.target as HTMLSelectElement).value, (configStore.draftConfig as any)[activeProcTab], 'Canales')" class="form-select mb-2">
                  <option value="todos">Todos los Canales (*)</option>
                  <option value="conjunto">Un Conjunto de Datos (Gestor.Datas)</option>
                  <option value="manual">Selección Manual de Canales</option>
                </select>

                <!-- Si eligen Conjunto -->
                <div v-if="getProcMode((configStore.draftConfig as any)[activeProcTab].Canales) === 'conjunto'" class="fade-in">
                  <select v-model="(configStore.draftConfig as any)[activeProcTab].Canales[0]" class="form-select">
                    <option v-for="d in configStore.draftConfig.Gestor.Datas" :key="d.Nombre" :value="d.Nombre">
                      Usar grupo: {{ d.Nombre }}
                    </option>
                  </select>
                </div>

                <!-- Si eligen Manual -->
                <div v-else-if="getProcMode((configStore.draftConfig as any)[activeProcTab].Canales) === 'manual'" class="fade-in config-box">
                  <div class="tags-container mb-2">
                    <span v-for="(ch, i) in (configStore.draftConfig as any)[activeProcTab].Canales" :key="i" class="badge-tag">
                      {{ ch }} <button @click="(configStore.draftConfig as any)[activeProcTab].Canales.splice(i,1)" class="tag-close">✕</button>
                    </span>
                  </div>
                  <select @change="addStringToArray((configStore.draftConfig as any)[activeProcTab].Canales, $event)" class="form-select">
                      <option value="">+ Añadir Canal al Procesado...</option>
                    <option v-for="c in auth.canalesDisponibles" :key="c" :value="c">{{ c }}</option>
                  </select>
                </div>
              </div>

              <!-- Configuración específica FFT -->
              <div v-if="activeProcTab === 'FFT' && configStore.draftConfig.FFT.Config" class="config-box">
                <h4>Detalles FFT</h4>
                <div class="grid-3-cols mt-2">
                  <div class="form-group"><label class="form-label">Res F</label><input v-model.number="configStore.draftConfig.FFT.Config['Res F']" type="number" step="0.1" class="form-input" /></div>
                  <div class="form-group"><label class="form-label">Inc F</label><input v-model.number="configStore.draftConfig.FFT.Config['Inc F']" type="number" class="form-input" /></div>
                  <div class="form-group">
                    <label class="form-label">Ventana</label>
                    <select v-model="configStore.draftConfig.FFT.Config.Ventana" class="form-select">
                      <option>Rectangular</option><option>Hanning</option><option>Hamming</option><option>Blackman</option><option>Flat Top</option><option>Triangular</option>
                    </select>
                  </div>
                  <!-- Nuevos campos -->
                  <div class="form-group" v-if="configStore.draftConfig.FFT.Config.Rango"><label class="form-label">Rango Min</label><input v-model.number="configStore.draftConfig.FFT.Config.Rango.Min" type="number" class="form-input" /></div>
                  <div class="form-group" v-if="configStore.draftConfig.FFT.Config.Rango"><label class="form-label">Rango Max</label><input v-model.number="configStore.draftConfig.FFT.Config.Rango.Max" type="number" class="form-input" /></div>
                  <div class="form-group flex-between mt-2">
                    <label class="form-label mb-0">Escala Logarítmica (dB)</label>
                    <div class="toggle-wrapper">
                      <input type="checkbox" id="fft-db" v-model="configStore.draftConfig.FFT.Config.dB" class="toggle-checkbox" />
                      <label for="fft-db" class="toggle-label"></label>
                    </div>
                  </div>
                </div>
                
                <h5 class="mt-4">Parámetros del Detector</h5>
                <div class="grid-3-cols mt-2" v-if="configStore.draftConfig.FFT.Config.Detector">
                  <div class="form-group"><label class="form-label">Guarda</label><input v-model.number="configStore.draftConfig.FFT.Config.Detector.Guarda" type="number" step="0.1" class="form-input" /></div>
                  <div class="form-group"><label class="form-label">Promedio</label><input v-model.number="configStore.draftConfig.FFT.Config.Detector.Promedio" type="number" step="0.1" class="form-input" /></div>
                  <div class="form-group"><label class="form-label">Umbral</label><input v-model.number="configStore.draftConfig.FFT.Config.Detector.Umbral" type="number" step="0.1" class="form-input" /></div>
                </div>
              </div>

              <!-- Configuración específica OMA (y sus múltiples grupos) -->
              <div v-if="activeProcTab === 'OMA' && configStore.draftConfig.OMA" class="config-box">
                <h4>Grupos de Canales OMA</h4>
                <div v-for="(omaGroup, idx) in configStore.draftConfig.OMA.OMAs" :key="idx" class="form-group mt-3 pb-3" style="border-bottom: 1px solid var(--color-input-border);">
                  <div class="flex-between">
                    <label class="form-label mb-0">Sub-Grupo: "{{ omaGroup.Nombre }}"</label>
                    <button @click="configStore.draftConfig!.OMA.OMAs.splice(idx, 1)" class="btn-icon text-danger">✕</button>
                  </div>
                  
                  <select :value="getProcMode(omaGroup.Canales)" @change="e => setProcMode((e.target as HTMLSelectElement).value, omaGroup, 'Canales')" class="form-select mt-2 mb-2">
                    <option value="todos">Todos los Canales (*)</option>
                    <option value="conjunto">Conjunto de Datos</option>
                    <option value="manual">Selección Manual</option>
                  </select>
                  
                  <div v-if="getProcMode(omaGroup.Canales) === 'conjunto'">
                    <select v-model="omaGroup.Canales[0]" class="form-select">
                      <option v-for="d in configStore.draftConfig.Gestor.Datas" :key="d.Nombre" :value="d.Nombre">Grupo: {{ d.Nombre }}</option>
                    </select>
                  </div>
                  <div v-else-if="getProcMode(omaGroup.Canales) === 'manual'" class="tags-container">
                    <span v-for="(ch, i) in omaGroup.Canales" :key="i" class="badge-tag">{{ ch }} <button @click="omaGroup.Canales.splice(i,1)" class="tag-close">✕</button></span>
                    <select @change="addStringToArray(omaGroup.Canales, $event)" class="form-select" style="max-width: 200px;">
                        <option value="">+ Añadir...</option>
                      <option v-for="c in auth.canalesDisponibles" :key="c" :value="c">{{ c }}</option>
                    </select>
                  </div>
                </div>
                <button @click="configStore.draftConfig!.OMA.OMAs.push({ Nombre: 'Nuevo', Canales: ['*'] })" class="btn-text btn-text--edit mt-2">+ Añadir Grupo OMA</button>

                <h4 class="mt-4">Configuración OMA SSI (Frecuencia)</h4>
                <div class="grid-3-cols mt-2">
                  <div class="form-group"><label class="form-label">Frec. Máxima</label><input v-model.number="configStore.draftConfig.OMA.Config.Frecuencia.Maxima" type="number" class="form-input" /></div>
                  <div class="form-group"><label class="form-label">Tolerancia</label><input v-model.number="configStore.draftConfig.OMA.Config.Frecuencia.Tolerancia" type="number" step="0.01" class="form-input" /></div>
                  <div class="form-group"><label class="form-label">Estables</label><input v-model.number="configStore.draftConfig.OMA.Config.Frecuencia.Estables" type="number" class="form-input" /></div>
                </div>

                <h5 class="mt-4">Parámetros SSI</h5>
                <div class="grid-3-cols mt-2" v-if="configStore.draftConfig.OMA.Config.SSI">
                  <div class="form-group"><label class="form-label">p</label><input v-model.number="configStore.draftConfig.OMA.Config.SSI.p" type="number" class="form-input" /></div>
                  <div class="form-group"><label class="form-label">nb</label><input v-model.number="configStore.draftConfig.OMA.Config.SSI.nb" type="number" class="form-input" /></div>
                  <div class="form-group"><label class="form-label">step</label><input v-model.number="configStore.draftConfig.OMA.Config.SSI.step" type="number" class="form-input" /></div>
                  <div class="form-group"><label class="form-label">ordmax</label><input v-model.number="configStore.draftConfig.OMA.Config.SSI.ordmax" type="number" class="form-input" /></div>
                  <div class="form-group"><label class="form-label">ordmin</label><input v-model.number="configStore.draftConfig.OMA.Config.SSI.ordmin" type="number" class="form-input" /></div>
                </div>

                <div class="grid-2-cols mt-4">
                  <div>
                    <h5>Hard Criteria</h5>
                    <div class="grid-2-cols mt-2" v-if="configStore.draftConfig.OMA.Config['Hard Criteria']">
                      <div class="form-group flex-between">
                        <label class="form-label mb-0">Conj</label>
                        <div class="toggle-wrapper">
                          <input type="checkbox" id="oma-conj" v-model="configStore.draftConfig.OMA.Config['Hard Criteria'].conj" class="toggle-checkbox" />
                          <label for="oma-conj" class="toggle-label"></label>
                        </div>
                      </div>
                      <div class="form-group"><label class="form-label">xi_max</label><input v-model.number="configStore.draftConfig.OMA.Config['Hard Criteria'].xi_max" type="number" step="0.01" class="form-input" /></div>
                      <div class="form-group"><label class="form-label">mpc_lim</label><input v-model.number="configStore.draftConfig.OMA.Config['Hard Criteria'].mpc_lim" type="number" step="0.01" class="form-input" /></div>
                      <div class="form-group"><label class="form-label">mpd_lim</label><input v-model.number="configStore.draftConfig.OMA.Config['Hard Criteria'].mpd_lim" type="number" step="0.01" class="form-input" /></div>
                      <div class="form-group"><label class="form-label">cov_max</label><input v-model.number="configStore.draftConfig.OMA.Config['Hard Criteria'].cov_max" type="number" step="0.01" class="form-input" /></div>
                    </div>
                  </div>
                  <div>
                    <h5>Soft Criteria</h5>
                    <div class="form-group mt-2" v-if="configStore.draftConfig.OMA.Config['Soft Criteria']">
                      <div class="form-group mb-2"><label class="form-label">err_fn</label><input v-model.number="configStore.draftConfig.OMA.Config['Soft Criteria'].err_fn" type="number" step="0.01" class="form-input" /></div>
                      <div class="form-group mb-2"><label class="form-label">err_xi</label><input v-model.number="configStore.draftConfig.OMA.Config['Soft Criteria'].err_xi" type="number" step="0.01" class="form-input" /></div>
                      <div class="form-group"><label class="form-label">err_phi</label><input v-model.number="configStore.draftConfig.OMA.Config['Soft Criteria'].err_phi" type="number" step="0.01" class="form-input" /></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 👇 AÑADIR CONFIGURACIÓN FRF AQUÍ 👇 -->
              <div v-if="activeProcTab === 'FRF' && configStore.draftConfig.FRF?.Config" class="config-box">
                <h4>Configuración FRF</h4>
                <div class="grid-2-cols mt-2">
                  <div class="form-group"><label class="form-label">Excitación (Canal)</label><input v-model="configStore.draftConfig.FRF.Config.Excitacion.Canal" type="text" class="form-input" /></div>
                  <div class="form-group"><label class="form-label">Excitación (Masa)</label><input v-model.number="configStore.draftConfig.FRF.Config.Excitacion.Masa" type="number" step="0.1" class="form-input" /></div>
                </div>
                <div class="grid-3-cols mt-3">
                  <div class="form-group"><label class="form-label">Res F</label><input v-model.number="configStore.draftConfig.FRF.Config['Res F']" type="number" step="0.1" class="form-input" /></div>
                  <div class="form-group"><label class="form-label">Inc F</label><input v-model.number="configStore.draftConfig.FRF.Config['Inc F']" type="number" step="0.1" class="form-input" /></div>
                  <div class="form-group">
                    <label class="form-label">Ventana</label>
                    <select v-model="configStore.draftConfig.FRF.Config.Ventana" class="form-select">
                      <option>Rectangular</option><option>Hanning</option><option>Hamming</option><option>Blackman</option><option>Flat Top</option><option>Triangular</option>
                    </select>
                  </div>
                </div>
                <div class="grid-3-cols mt-3">
                  <div class="form-group">
                    <label class="form-label">Promedio</label>
                    <select v-model="configStore.draftConfig.FRF.Config.Promedio" class="form-select">
                      <option>Lineal</option><option>Exponencial</option>
                    </select>
                  </div>
                  <div class="form-group"><label class="form-label">Frecuencia Mínima</label><input v-model.number="configStore.draftConfig.FRF.Config.Frecuencia.Minima" type="number" class="form-input" /></div>
                  <div class="form-group"><label class="form-label">Frecuencia Máxima</label><input v-model.number="configStore.draftConfig.FRF.Config.Frecuencia.Maxima" type="number" class="form-input" /></div>
                </div>
                <h5 class="mt-4">Análisis Modal Experimental (EMA)</h5>
                <div class="grid-2-cols mt-2">
                  <div class="form-group"><label class="form-label">Modos</label><input v-model.number="configStore.draftConfig.FRF.Config.EMA.Modos" type="number" class="form-input" /></div>
                  <div class="form-group"><label class="form-label">dr_umbral</label><input v-model.number="configStore.draftConfig.FRF.Config.EMA.dr_umbral" type="number" step="0.01" class="form-input" /></div>
                </div>
              </div>

            </div>
          </div>

          <!-- SECCIÓN 4: INFLUX DB -->
          <div v-else-if="activeMenu === 'influx'" class="fade-in">
            <h2 class="section-title">Conexión InfluxDB</h2>
            <div class="grid-2-cols mb-4">
              <div class="form-group"><label class="form-label">Servidor URL</label><input v-model="configStore.draftConfig.InfluxDB.DB.Servidor" type="text" class="form-input" /></div>
              <div class="form-group"><label class="form-label">Token de Acceso</label><input v-model="configStore.draftConfig.InfluxDB.DB.Token" type="password" class="form-input" /></div>
              <div class="form-group"><label class="form-label">Organization ID</label><input v-model="configStore.draftConfig.InfluxDB.DB.OrgID" type="text" class="form-input" /></div>
              <div class="form-group"><label class="form-label">Bucket</label><input v-model="configStore.draftConfig.InfluxDB.DB.Bucket" type="text" class="form-input" /></div>
              <div class="form-group"><label class="form-label">Reintentos de Conexión</label><input v-model.number="configStore.draftConfig.InfluxDB.Reintentos" type="number" class="form-input" /></div>
            </div>

            <hr class="divider mt-4 mb-4" />
            <h2 class="section-title">Enrutado de Loggers</h2>
            <p class="text-muted">Define bajo qué nombre de "Medida" de InfluxDB se guardan los datos procesados en la nube.</p>
            <div class="config-box" v-if="configStore.draftConfig.InfluxDB.Loggers">
              <div class="grid-3-cols">
                <div class="form-group" v-if="configStore.draftConfig.InfluxDB.Loggers.DataSet"><label class="form-label">DataSet</label><input v-model="configStore.draftConfig.InfluxDB.Loggers.DataSet.Medida" type="text" class="form-input" /></div>
                <div class="form-group" v-if="configStore.draftConfig.InfluxDB.Loggers.Data"><label class="form-label">Data</label><input v-model="configStore.draftConfig.InfluxDB.Loggers.Data.Medida" type="text" class="form-input" /></div>
                <div class="form-group" v-if="configStore.draftConfig.InfluxDB.Loggers.TA"><label class="form-label">TA</label><input v-model="configStore.draftConfig.InfluxDB.Loggers.TA.Medida" type="text" class="form-input" /></div>
                <div class="form-group" v-if="configStore.draftConfig.InfluxDB.Loggers.OMA"><label class="form-label">OMA</label><input v-model="configStore.draftConfig.InfluxDB.Loggers.OMA.Medida" type="text" class="form-input" /></div>
                <div class="form-group" v-if="configStore.draftConfig.InfluxDB.Loggers.FFT"><label class="form-label">FFT (Base)</label><input v-model="configStore.draftConfig.InfluxDB.Loggers.FFT.Medida" type="text" class="form-input" /></div>
                <div class="form-group" v-if="configStore.draftConfig.InfluxDB.Loggers.FFT"><label class="form-label">FFT (FA)</label><input v-model="configStore.draftConfig.InfluxDB.Loggers.FFT['Medida FA']" type="text" class="form-input" /></div>
                <div class="form-group" v-if="configStore.draftConfig.InfluxDB.Loggers.FRF"><label class="form-label">FRF</label><input v-model="configStore.draftConfig.InfluxDB.Loggers.FRF.Medida" type="text" class="form-input" /></div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>

    <!-- MODAL DE CONFIRMACIÓN -->
    <div v-if="showConfirmModal" class="modal-overlay">
      <div class="modal-box">
        <div class="modal-icon">⚠️</div>
        <h2>¿Estás completamente seguro?</h2>
        <p>Vas a sobrescribir la configuración del hardware. <strong>Esta acción modificará el comportamiento interno del sistema y algunos cambios podrían requerir un reinicio para aplicarse.</strong></p>
        <div class="modal-actions">
          <button @click="showConfirmModal = false" class="btn-secondary">Cancelar</button>
          <button @click="confirmSave" class="btn-danger">Sí, Guardar y Aplicar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* VARIABLES Y CONTENEDORES */
.app-container { display: flex; min-height: 100vh; background-color: var(--color-bg-main); width: 100%; font-family: var(--font-family); color: var(--color-text-primary); }

/* AJUSTES DE MAQUETACIÓN: Cuadro superior más arriba y panel pegado a la izquierda */
.main-content { 
  flex: 1; 
  padding: 1.5rem 1rem 1rem 0; /* Padding superior reducido a 1.5rem, sin padding izquierdo */
  display: flex; 
  flex-direction: column; 
  overflow-y: auto; 
  max-width: 100%; /* Elimina restricciones previas para abarcar pantalla */
}

.page-header { 
  position: relative; 
  display: flex; 
  align-items: center; 
  justify-content: flex-end; /* Empuja los botones de guardado a la derecha */
  min-height: 80px; /* Asegura altura para que los elementos absolutos no colapsen */
  margin-bottom: 1.5rem; 
  padding: 0 1.5rem 1rem 2rem; 
  border-bottom: 1px solid var(--color-border); 
}
.header-titles { 
  position: absolute; 
  left: 50%; 
  transform: translateX(-50%); /* Centrado horizontal perfecto */
  text-align: center; 
}
.page-title { font-size: 1.875rem; font-weight: 700; color: var(--color-text-title); margin: 0; }
.page-subtitle { font-size: 0.875rem; color: var(--color-text-secondary); margin: 0.25rem 0 0 0; }
.header-actions { display: flex; gap: 10px; z-index: 10; } /* Z-index para asegurar que sean clicables */

/* MENSAJES */
.alert { padding: 15px; border-radius: 6px; margin: 0 1.5rem 20px 2rem; font-weight: bold; }
.alert.error { background-color: #fef2f2; color: var(--color-danger); border: 1px solid #fecaca; }
.alert.success { background-color: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
.loading-msg { padding: 3rem; text-align: center; margin-left: 2rem; color: var(--color-text-secondary); background: var(--color-bg-white); border-radius: 8px; border: 1px solid var(--color-border); }

/* LAYOUT DE PESTAÑAS LATERALES */
.config-layout { display: flex; align-items: flex-start; width: 100%; }
.config-sidebar { 
  width: 250px; 
  background: var(--color-bg-white); 
  border: 1px solid var(--color-border); 
  border-left: none; /* Elimina borde izquierdo para pegarse a la pared */
  border-radius: 0 8px 8px 0; /* Suaviza solo la derecha */
  display: flex; flex-direction: column; overflow: hidden; position: sticky; top: 1.5rem; 
}
.nav-btn { padding: 15px 20px; text-align: left; border: none; background: none; font-weight: 600; color: var(--color-text-secondary); border-left: 4px solid transparent; cursor: pointer; transition: all 0.2s; border-bottom: 1px solid var(--color-border); }
.nav-btn:last-child { border-bottom: none; }
.nav-btn:hover { background-color: var(--color-bg-main); color: var(--color-text-primary); }
.nav-btn.active { background-color: #eff6ff; color: var(--color-primary); border-left-color: var(--color-primary); }

.config-content { flex: 1; background: var(--color-bg-white); padding: 30px; margin: 0 1.5rem 0 1.5rem; border-radius: 8px; border: 1px solid var(--color-border); min-height: 500px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.section-title { font-size: 1.25rem; font-weight: 700; border-bottom: 2px solid var(--color-border); padding-bottom: 8px; margin-bottom: 20px; color: var(--color-text-primary); }

/* TABLAS Y FORMULARIOS */
.flex-between { display: flex; justify-content: space-between; align-items: center; }
.grid-2-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.grid-3-cols { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
.form-group { display: flex; flex-direction: column; }
.form-label { font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; color: var(--color-text-primary); }
.form-input, .form-select { width: 100%; border-radius: 6px; border: 1px solid var(--color-input-border); padding: 8px 12px; font-size: 0.9rem; background-color: var(--color-bg-white); color: var(--color-text-primary); }
.form-input-sm { width: 100%; border-radius: 4px; border: 1px solid var(--color-input-border); padding: 4px 8px; font-size: 0.85rem; text-align: center; }

.data-table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
.data-table th { background-color: var(--color-bg-main); padding: 10px; font-size: 0.85rem; color: var(--color-text-secondary); text-align: center; border: 1px solid var(--color-border); }
.data-table td { padding: 8px; border: 1px solid var(--color-border); vertical-align: middle; }
.text-center { text-align: center; }

.badge-default { background-color: var(--color-warning-text); color: white; padding: 2px 6px; border-radius: 12px; font-size: 0.75rem; }

/* NUEVOS ESTILOS PARA ETIQUETAS (TAGS) */
.tags-container { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.badge-tag { background: var(--color-primary); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; display: flex; align-items: center; gap: 6px; font-weight: 600; }
.state-tag { background: #6b21a8; }
.tag-close { background: none; border: none; color: white; cursor: pointer; font-weight: bold; padding: 0; opacity: 0.8; transition: opacity 0.2s; }
.tag-close:hover { opacity: 1; color: #fca5a5; }

/* LAYOUT DE PROCESADOS (Sub-Pestañas) */
.proc-layout { display: flex; gap: 20px; }
.proc-sidebar { width: 120px; display: flex; flex-direction: column; gap: 5px; }
.proc-tab-btn { padding: 10px; background: var(--color-bg-main); border: 1px solid var(--color-border); border-radius: 6px; cursor: pointer; font-weight: bold; color: var(--color-text-secondary); transition: all 0.2s; }
.proc-tab-btn.active { background: var(--color-primary); color: white; border-color: var(--color-primary); }
.proc-content { flex: 1; }
.config-box { background-color: var(--color-bg-main); padding: 15px; border-radius: 6px; border: 1px dashed var(--color-input-border); margin-top: 15px; }

/* BOTONES */
.btn-primary { background-color: var(--color-primary); color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: background 0.2s; }
.btn-primary:hover { background-color: var(--color-primary-hover); }
.btn-secondary { background-color: var(--color-bg-white); color: var(--color-text-secondary); border: 1px solid var(--color-input-border); padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: background 0.2s; }
.btn-secondary:hover { background-color: var(--color-bg-main); }
.btn-danger { background-color: var(--color-danger); color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.btn-danger:hover { background-color: var(--color-danger-hover); }
.btn-text { background: none; border: none; cursor: pointer; padding: 0; font-weight: 600; font-size: 0.85rem; }
.btn-text--edit { color: var(--color-primary); }
.btn-text--edit:hover { text-decoration: underline; }
.btn-icon { background: none; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: background 0.2s; }
.btn-icon:hover { background: var(--color-input-border); }
.text-danger { color: var(--color-danger); font-weight: bold; }

/* MODAL CONFIRMACIÓN */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px); }
.modal-box { background: var(--color-bg-white); padding: 30px; border-radius: 12px; width: 90%; max-width: 450px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); border: 1px solid var(--color-border); }
.modal-icon { font-size: 3rem; margin-bottom: 10px; }
.modal-box h2 { margin-top: 0; color: var(--color-text-primary); }
.modal-box p { color: var(--color-text-secondary); margin-bottom: 25px; }
.modal-actions { display: flex; justify-content: center; gap: 15px; }

/* UTILIDADES */
.fade-in { animation: fadeIn 0.3s ease-in-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
.mb-4 { margin-bottom: 1rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mt-4 { margin-top: 1rem; }
.mt-3 { margin-top: 0.75rem; }
.mt-2 { margin-top: 0.5rem; }
.pb-3 { padding-bottom: 0.75rem; }
.text-muted { color: var(--color-text-secondary); font-size: 0.9rem; }
.data-card { border: 1px solid var(--color-border); padding: 15px; border-radius: 6px; background-color: var(--color-bg-main); }

/* ESTILOS PARA LOS TOGGLES (Interruptores) */
.toggle-wrapper { position: relative; display: inline-block; width: 2.75rem; height: 1.5rem; vertical-align: middle; user-select: none; }
.toggle-checkbox { position: absolute; opacity: 0; width: 100%; height: 100%; cursor: pointer; z-index: 10; margin: 0; }
.toggle-label { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--color-input-border); border-radius: 9999px; cursor: pointer; transition: background-color 0.2s; }
.toggle-label::before { content: ""; position: absolute; height: 1.15rem; width: 1.15rem; left: 0.15rem; bottom: 0.175rem; background-color: var(--color-bg-white); border-radius: 50%; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
.toggle-checkbox:checked + .toggle-label { background-color: var(--color-primary); }
.toggle-checkbox:checked + .toggle-label::before { transform: translateX(1.25rem); }

</style>