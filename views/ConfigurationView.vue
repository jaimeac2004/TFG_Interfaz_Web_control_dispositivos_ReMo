<script setup lang="ts">
import { ref, onMounted } from 'vue';
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
});

// --- LÓGICA DE BOTONES ---
const handleSaveClick = () => {
  showConfirmModal.value = true;
};

const confirmSave = async () => {
  showConfirmModal.value = false;
  await configStore.saveConfig();
};

const handleCancel = () => {
  if (confirm("¿Estás seguro de descartar todos los cambios no guardados?")) {
    configStore.cancelarCambios();
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
          <h1 class="page-title">Configuración del Sistema (GPA)</h1>
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

      <!-- LAYOUT DIVIDIDO (Menú lateral de secciones + Panel de Contenido) -->
      <div v-else-if="configStore.draftConfig" class="config-layout">
        
        <!-- SIDEBAR DE SECCIONES -->
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
                <option :value="62.5">62.5 Hz</option>
                <option :value="125">125 Hz</option>
                <option :value="250">250 Hz</option>
                <option :value="500">500 Hz</option>
                <option :value="1000">1000 Hz</option>
                <option :value="2000">2000 Hz</option>
                <option :value="4000">4000 Hz</option>
              </select>
            </div>

            <hr class="divider" />
            
            <h2 class="section-title mt-4">Nodos Lógicos (Gestor.Nodos)</h2>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Sensor (Pos)</th><th>Nombre</th><th>Pos X</th><th>Pos Y</th><th>Pos Z</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(nodo, idx) in configStore.draftConfig.Gestor.Nodos" :key="idx">
                  <td><input v-model.number="nodo.Sensor" type="number" class="form-input-sm" /></td>
                  <td><input v-model="nodo.Nombre" type="text" class="form-input-sm" /></td>
                  <td><input v-model.number="nodo.Posicion.x" type="number" class="form-input-sm" /></td>
                  <td><input v-model.number="nodo.Posicion.y" type="number" class="form-input-sm" /></td>
                  <td><input v-model.number="nodo.Posicion.z" type="number" class="form-input-sm" /></td>
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
                <h4>Sensores ATH</h4>
                <table class="data-table">
                  <thead><tr><th>Sensor</th><th>Rango</th><th>HPF</th></tr></thead>
                  <tbody>
                    <tr v-for="(ath, idx) in configStore.draftConfig.ATHAD.ATHs" :key="idx">
                      <!-- Render especial para el -1 (Por defecto) -->
                      <td class="text-center font-bold">
                        <span v-if="ath.Sensor === -1" class="badge badge-default">Por Defecto</span>
                        <span v-else>{{ ath.Sensor }}</span>
                      </td>
                      <td>
                        <select v-model="ath.Rango" class="form-select list-input-sm">
                          <option value="2g">2g</option><option value="4g">4g</option><option value="8g">8g</option>
                        </select>
                      </td>
                      <td class="text-center"><input type="checkbox" v-model="ath.HPF" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div>
                <h4>Sensores AD</h4>
                <table class="data-table">
                  <thead><tr><th>Sensor</th><th>Ganancia</th></tr></thead>
                  <tbody>
                    <tr v-for="(ad, idx) in configStore.draftConfig.ATHAD.ADs" :key="idx">
                      <td class="text-center font-bold">
                        <span v-if="ad.Sensor === -1" class="badge badge-default">Por Defecto</span>
                        <span v-else>{{ ad.Sensor }}</span>
                      </td>
                      <td><input v-model.number="ad.Ganancia" type="number" class="form-input-sm" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- SECCIÓN 2: DATAS (Gestor.Datas) -->
          <div v-else-if="activeMenu === 'datas'" class="fade-in">
            <h2 class="section-title">Conjuntos de Datos (Gestor.Datas)</h2>
            <p class="text-muted mb-4">Define listas preestablecidas de canales y estados para usarlas rápidamente en las medidas.</p>
            
            <div v-for="(dataset, idx) in configStore.draftConfig.Gestor.Datas" :key="idx" class="data-card mb-4">
              <div class="form-group mb-2">
                <label class="form-label">Nombre del Conjunto</label>
                <input v-model="dataset.Nombre" type="text" class="form-input" style="max-width: 300px;" />
              </div>
              <div class="grid-2-cols">
                <div class="form-group">
                  <label class="form-label">Canales (JSON Array string)</label>
                  <textarea :value="JSON.stringify(dataset.Canales)" @change="e => dataset.Canales = JSON.parse((e.target as HTMLTextAreaElement).value)" class="form-input" rows="3"></textarea>
                </div>
                <div class="form-group">
                  <label class="form-label">Estados (JSON Array string)</label>
                  <textarea :value="JSON.stringify(dataset.Estados)" @change="e => dataset.Estados = JSON.parse((e.target as HTMLTextAreaElement).value)" class="form-input" rows="3"></textarea>
                </div>
              </div>
            </div>
          </div>

          <!-- SECCIÓN 3: PROCESADO (Sub-vistas) -->
          <div v-else-if="activeMenu === 'procesado'" class="fade-in proc-layout">
            
            <!-- Sub-menu de Procesados -->
            <div class="proc-sidebar">
              <button v-for="tab in ['Data', 'TA', 'FFT', 'OMA', 'FRF']" :key="tab" 
                      :class="['proc-tab-btn', { active: activeProcTab === tab }]"
                      @click="activeProcTab = tab as any">
                {{ tab }}
              </button>
            </div>

            <!-- Panel Derecho del Procesado Seleccionado -->
            <div class="proc-content">
              <h2 class="section-title">Configuración: {{ activeProcTab }}</h2>
              
              <!-- Canales Globales (Se oculta para OMA porque su estructura de canales es diferente) -->
              <div v-if="activeProcTab !== 'OMA' && configStore.draftConfig[activeProcTab]" class="form-group mb-4">
                <label class="form-label">Canales aplicados a {{ activeProcTab }} (JSON Array)</label>
                <textarea 
                  :value="JSON.stringify((configStore.draftConfig as any)[activeProcTab].Canales)" 
                  @change="e => (configStore.draftConfig as any)[activeProcTab].Canales = JSON.parse((e.target as HTMLTextAreaElement).value)" 
                  class="form-input" rows="3"></textarea>
              </div>

              <!-- Configuración específica si es FFT -->
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
                </div>
              </div>

              <!-- Configuración específica si es OMA -->
              <div v-if="activeProcTab === 'OMA' && configStore.draftConfig.OMA" class="config-box">
                
                <!-- Gestión de sub-canales OMA -->
                <h4>Grupos de Canales OMA</h4>
                <div v-for="(omaGroup, idx) in configStore.draftConfig.OMA.OMAs" :key="idx" class="form-group mt-2">
                  <label class="form-label">Grupo "{{ omaGroup.Nombre }}" (JSON Array)</label>
                  <input 
                    :value="JSON.stringify(omaGroup.Canales)" 
                    @change="e => omaGroup.Canales = JSON.parse((e.target as HTMLInputElement).value)" 
                    type="text" class="form-input" 
                  />
                </div>

                <hr class="divider mt-4 mb-2" />

                <h4>Configuración OMA SSI</h4>
                <p class="text-muted">La configuración SSI, Hard y Soft criteria se representa aquí.</p>
                <div class="grid-2-cols mt-2">
                  <div class="form-group"><label class="form-label">Frec. Max</label><input v-model.number="configStore.draftConfig.OMA.Config.Frecuencia.Maxima" type="number" class="form-input" /></div>
                  <div class="form-group"><label class="form-label">SSI p</label><input v-model.number="configStore.draftConfig.OMA.Config.SSI.p" type="number" class="form-input" /></div>
                </div>
              </div>

            </div>
          </div>

          <!-- SECCIÓN 4: INFLUX DB -->
          <div v-else-if="activeMenu === 'influx'" class="fade-in">
            <h2 class="section-title">Conexión a Base de Datos Externa (InfluxDB)</h2>
            <div class="grid-2-cols mb-4">
              <div class="form-group"><label class="form-label">Servidor URL</label><input v-model="configStore.draftConfig.InfluxDB.DB.Servidor" type="text" class="form-input" /></div>
              <div class="form-group"><label class="form-label">Token de Acceso</label><input v-model="configStore.draftConfig.InfluxDB.DB.Token" type="password" class="form-input" /></div>
              <div class="form-group"><label class="form-label">Organization ID</label><input v-model="configStore.draftConfig.InfluxDB.DB.OrgID" type="text" class="form-input" /></div>
              <div class="form-group"><label class="form-label">Bucket</label><input v-model="configStore.draftConfig.InfluxDB.DB.Bucket" type="text" class="form-input" /></div>
              <div class="form-group"><label class="form-label">Reintentos</label><input v-model.number="configStore.draftConfig.InfluxDB.Reintentos" type="number" class="form-input" /></div>
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
/* VARIABLES Y CONTENEDORES (Misma estética que Measures) */
.app-container { display: flex; min-height: 100vh; background-color: var(--color-bg-main); width: 100%; font-family: var(--font-family); color: var(--color-text-primary); }
.main-content { flex: 1; padding: 6rem 2rem 2rem 2rem; display: flex; flex-direction: column; overflow-y: auto; max-width: 1400px; margin: 0 auto; width: 100%; }

.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid var(--color-border); }
.page-title { font-size: 1.875rem; font-weight: 700; color: var(--color-text-title); margin: 0; }
.page-subtitle { font-size: 0.875rem; color: var(--color-text-secondary); margin: 0.25rem 0 0 0; }
.header-actions { display: flex; gap: 10px; }

/* MENSAJES */
.alert { padding: 15px; border-radius: 6px; margin-bottom: 20px; font-weight: bold; }
.alert.error { background-color: #fef2f2; color: var(--color-danger); border: 1px solid #fecaca; }
.alert.success { background-color: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
.loading-msg { padding: 3rem; text-align: center; color: var(--color-text-secondary); background: var(--color-bg-white); border-radius: 8px; border: 1px solid var(--color-border); }

/* LAYOUT DE PESTAÑAS LATERALES */
.config-layout { display: flex; gap: 20px; align-items: flex-start; }
.config-sidebar { width: 250px; background: var(--color-bg-white); border-radius: 8px; border: 1px solid var(--color-border); display: flex; flex-direction: column; overflow: hidden; position: sticky; top: 6rem; }
.nav-btn { padding: 15px 20px; text-align: left; border: none; background: none; font-weight: 600; color: var(--color-text-secondary); border-left: 4px solid transparent; cursor: pointer; transition: all 0.2s; border-bottom: 1px solid var(--color-border); }
.nav-btn:last-child { border-bottom: none; }
.nav-btn:hover { background-color: var(--color-bg-main); color: var(--color-text-primary); }
.nav-btn.active { background-color: #eff6ff; color: var(--color-primary); border-left-color: var(--color-primary); }

.config-content { flex: 1; background: var(--color-bg-white); padding: 30px; border-radius: 8px; border: 1px solid var(--color-border); min-height: 500px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.section-title { font-size: 1.25rem; font-weight: 700; border-bottom: 2px solid var(--color-border); padding-bottom: 8px; margin-bottom: 20px; color: var(--color-text-primary); }

/* TABLAS Y FORMULARIOS */
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
.mt-2 { margin-top: 0.5rem; }
.text-muted { color: var(--color-text-secondary); font-size: 0.9rem; }
.data-card { border: 1px solid var(--color-border); padding: 15px; border-radius: 6px; background-color: var(--color-bg-main); }
</style>