<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/api/axios';

const auth = useAuthStore();
const router = useRouter();
let pollInterval: any = null;

// Estados para los archivos seleccionados
const configFile = ref<File | null>(null);
const firmwareFile = ref<File | null>(null);

const loadingMsg = ref('');

onMounted(() => {
  // Comprobación pasiva de sesión
  pollInterval = setInterval(async () => {
    await auth.checkSession();
    if (!auth.isAuthenticated) {
      alert("Tu sesión ha caducado por inactividad. Serás redirigido al inicio de sesión.");
      router.push('/login');
    }
  }, 10000);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});

// 1. DESCARGAR CONFIGURACIÓN ACTUAL
const downloadConfig = async () => {
  loadingMsg.value = 'Descargando configuración...';
  try {
    const res = await api.get('/remo/Config', { withCredentials: true });
    // Formateamos el JSON con sangrías para que sea legible y lo preparamos como archivo de texto
    const dataStr = JSON.stringify(res.data, null, 2);
    const blob = new Blob([dataStr], { type: 'text/plain' });
    
    // Creamos un enlace temporal para forzar la descarga
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Config.txt';
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error(error);
    alert('Error al descargar la configuración del hardware.');
  } finally {
    loadingMsg.value = '';
  }
};

// 2. SUBIR CONFIGURACIÓN DESDE FICHERO
const uploadConfig = async () => {
  if (!configFile.value) return;
  
  if (!confirm('¿Estás seguro de que quieres sobrescribir toda la configuración del sistema con este fichero?')) return;

  loadingMsg.value = 'Subiendo configuración...';
  const reader = new FileReader();
  
  reader.onload = async (e) => {
    try {
      const fileContent = e.target?.result as string;
      const jsonPayload = JSON.parse(fileContent); // Validamos que sea un JSON bien formado
      
      // Enviamos el JSON al endpoint de configuración
      await api.post('/remo/Config', jsonPayload, { withCredentials: true });
      alert('Configuración subida y aplicada correctamente.');
      configFile.value = null; // Reseteamos el input
    } catch (error) {
      console.error(error);
      alert('Error: El fichero seleccionado no contiene un formato JSON válido o el hardware rechazó la conexión.');
    } finally {
      loadingMsg.value = '';
    }
  };
  reader.readAsText(configFile.value);
};

// 3. REINICIAR DISPOSITIVO
const rebootDevice = async () => {
  if (!confirm('ATENCIÓN: Se va a reiniciar el dispositivo ReMo físicamente. Tardará unos 150 segundos en volver a estar disponible. ¿Deseas continuar?')) return;

  loadingMsg.value = 'Enviando orden de reinicio...';
  try {
    await api.post('/remo/Reset', {}, { withCredentials: true });
    alert('Orden enviada. El sistema se está reiniciando. Por favor, espera 2 minutos y medio antes de intentar navegar de nuevo.');
    // Podríamos expulsar al login directamente por precaución
    router.push('/login');
  } catch (error) {
    console.error(error);
    alert('Error al intentar reiniciar el dispositivo.');
  } finally {
    loadingMsg.value = '';
  }
};

// 4. ACTUALIZAR FIRMWARE
const updateFirmware = async () => {
  if (!firmwareFile.value) return;

  if (!confirm('ATENCIÓN: Vas a actualizar el firmware del sistema. No apagues el dispositivo durante este proceso. ¿Continuar?')) return;

  loadingMsg.value = 'Subiendo e instalando firmware... Este proceso puede tardar.';
  try {
    // La documentación indica que el fichero se pasa "Como datos de la petición" directamente.
    // Usamos 'application/octet-stream' genérico para enviar el archivo binario crudo.
    await api.post('/remo/Firmware', firmwareFile.value, {
      headers: { 'Content-Type': 'application/octet-stream' },
      withCredentials: true
    });
    alert('Firmware enviado al dispositivo correctamente.');
    firmwareFile.value = null;
  } catch (error) {
    console.error(error);
    alert('Error al actualizar el firmware.');
  } finally {
    loadingMsg.value = '';
  }
};
</script>

<template>
  <div class="app-container">
    <main class="main-content">
      <header class="page-header">
        <div class="header-titles">
          <h1 class="page-title">Mantenimiento del Sistema</h1>
          <p class="page-subtitle">Operaciones críticas, copias de seguridad y firmware</p>
        </div>
      </header>

      <div class="config-content" style="padding-top: 20px;">
        <div v-if="loadingMsg" class="loading-msg">{{ loadingMsg }}</div>

        <div class="grid-2-cols" style="gap: 30px;">
          
          <!-- DESCARGAR CONFIGURACIÓN -->
          <div class="config-box action-card">
            <h3>⬇️ Exportar Configuración</h3>
            <p class="text-muted">Descarga todos los ajustes actuales del dispositivo en un archivo de texto (<code>Config.txt</code>) que contiene el JSON íntegro.</p>
            <div class="action-footer">
              <button @click="downloadConfig" class="btn-primary" :disabled="!!loadingMsg">
                Descargar Config.txt
              </button>
            </div>
          </div>

          <!-- SUBIR CONFIGURACIÓN -->
          <div class="config-box action-card">
            <h3>⬆️ Importar Configuración</h3>
            <p class="text-muted">Sube un archivo de configuración previamente descargado para sobrescribir los ajustes actuales del dispositivo.</p>
            <input type="file" @change="e => configFile = (e.target as HTMLInputElement).files?.[0] || null" accept=".txt,.json" class="form-input mb-2" :disabled="!!loadingMsg" />
            <div class="action-footer">
              <button @click="uploadConfig" class="btn-primary" :disabled="!configFile || !!loadingMsg">
                Aplicar al Dispositivo
              </button>
            </div>
          </div>

          <!-- REINICIAR -->
          <div class="config-box action-card warning-card">
            <h3>🔄 Reiniciar ReMo</h3>
            <p class="text-muted">Fuerza un reinicio de la tarjeta hardware. El sistema dejará de responder y tardará aproximadamente 150 segundos en arrancar por completo.</p>
            <div class="action-footer">
              <button @click="rebootDevice" class="btn-danger" :disabled="!!loadingMsg">
                Reiniciar Ahora
              </button>
            </div>
          </div>

          <!-- ACTUALIZAR FIRMWARE -->
          <div class="config-box action-card warning-card">
            <h3>⚙️ Actualizar Firmware</h3>
            <p class="text-muted">Sube un nuevo archivo de firmware al sistema. <strong>Atención:</strong> Un corte de energía durante este proceso puede dañar el equipo.</p>
            <input type="file" @change="e => firmwareFile = (e.target as HTMLInputElement).files?.[0] || null" class="form-input mb-2" :disabled="!!loadingMsg" />
            <div class="action-footer">
              <button @click="updateFirmware" class="btn-danger" :disabled="!firmwareFile || !!loadingMsg">
                Instalar Firmware
              </button>
            </div>
          </div>

        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Heredamos la estructura visual de ConfigurationView para mantener la estética uniforme */
.app-container { display: flex; min-height: 100vh; background-color: var(--color-bg-main); width: 100%; font-family: var(--font-family); color: var(--color-text-primary); justify-content: center; padding: 4rem 2rem; }
.main-content { display: flex; flex-direction: column; width: 100%; max-width: 1000px; background-color: var(--color-bg-white); border-radius: 12px; border: 1px solid var(--color-border); box-shadow: 0 10px 25px rgba(0,0,0,0.05); overflow: hidden; }
.page-header { position: relative; display: flex; align-items: center; justify-content: flex-end; min-height: 80px; padding: 0 2rem; border-bottom: 1px solid var(--color-border); background-color: var(--color-bg-main); }
.header-titles { position: absolute; left: 50%; transform: translateX(-50%); text-align: center; }
.page-title { font-size: 1.875rem; font-weight: 700; color: var(--color-text-title); margin: 0; }
.page-subtitle { font-size: 0.875rem; color: var(--color-text-secondary); margin: 0.25rem 0 0 0; }
.config-content { padding: 40px; }

/* Utilidades Grid y Cajas */
.grid-2-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.config-box { background-color: var(--color-bg-main); padding: 25px; border-radius: 8px; border: 1px solid var(--color-input-border); display: flex; flex-direction: column; justify-content: space-between; }
.action-card h3 { margin-top: 0; margin-bottom: 10px; color: var(--color-text-title); font-weight: 700; font-size: 1.2rem; }
.warning-card { border-color: #fca5a5; background-color: #fef2f2; }
.warning-card h3 { color: var(--color-danger); }
.text-muted { color: var(--color-text-secondary); font-size: 0.9rem; margin-bottom: 20px; line-height: 1.5; }
.action-footer { display: flex; justify-content: flex-end; margin-top: 15px; }

/* Formularios y Botones */
.form-input { width: 100%; border-radius: 6px; border: 1px solid var(--color-input-border); padding: 10px; font-size: 0.9rem; background-color: var(--color-bg-white); }
.mb-2 { margin-bottom: 1rem; }
.btn-primary { background-color: var(--color-primary); color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: background 0.2s; }
.btn-primary:hover:not(:disabled) { background-color: var(--color-primary-hover); }
.btn-danger { background-color: var(--color-danger); color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.btn-danger:hover:not(:disabled) { background-color: var(--color-danger-hover); }
button:disabled { opacity: 0.5; cursor: not-allowed; }
.loading-msg { padding: 20px; text-align: center; font-weight: bold; margin-bottom: 20px; color: var(--color-primary); background: #eff6ff; border-radius: 8px; border: 1px dashed var(--color-primary); }
</style>