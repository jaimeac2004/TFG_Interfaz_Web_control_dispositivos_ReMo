import { defineStore } from 'pinia'
import { api } from '@/api/axios'
import type { FullConfig } from '@/types/config'

// --- PLANTILLAS VACÍAS (ESQUELETOS) ---
// Representan un procesado "en blanco". Si el payload coincide con esto, se purgará.
const templateFFT = { Canales: [], Config: { "Res F": 0.1, "Inc F": 0, Ventana: "Hanning", Rango: { Min: 0, Max: -1 }, dB: false, Detector: { Guarda: 0.5, Promedio: 1.5, Umbral: 4.0 } } };
const templateOMA = { OMAs: [], Config: { Frecuencia: { Maxima: 10, Tolerancia: 0.05, Estables: 0 }, SSI: { p: 30, nb: 30, step: 1, ordmax: 50, ordmin: 1 }, "Hard Criteria": { conj: true, xi_max: 0.1, mpc_lim: 0.7, mpd_lim: 0.3, cov_max: 0.2 }, "Soft Criteria": { err_fn: 0.01, err_xi: 0.05, err_phi: 0.03 } } };
const templateFRF = { Canales: [], Config: { Excitacion: { Canal: "", Masa: 1.0 }, "Res F": 0.1, "Inc F": 0, Ventana: "Hanning", Promedio: "Lineal", Frecuencia: { Minima: 1, Maxima: 10 }, EMA: { Modos: 5, dr_umbral: 0.1 } } };

interface ConfigState {
  originalConfig: FullConfig | null
  draftConfig: FullConfig | null
  loading: boolean
  error: string
  successMsg: string
}

export const useConfigStore = defineStore('config', {
  state: (): ConfigState => ({
    originalConfig: null,
    draftConfig: null,
    loading: false,
    error: '',
    successMsg: ''
  }),

  actions: {
    async fetchConfig() {
      this.loading = true; this.error = ''; this.successMsg = '';
      try {
        const res = await api.get<FullConfig>('/remo/Config', { withCredentials: true })
        const data = res.data;
        
        // Guardamos cómo llegó exactamente para futuras comparaciones
        this.originalConfig = JSON.parse(JSON.stringify(data));
        
        // HIDRATACIÓN: Si un procesado viene vacío o no existe, inyectamos el esqueleto para la UI
        if (!data.FFT || Object.keys(data.FFT).length === 0) data.FFT = JSON.parse(JSON.stringify(templateFFT));
        if (!data.OMA || Object.keys(data.OMA).length === 0) data.OMA = JSON.parse(JSON.stringify(templateOMA));
        if (!data.FRF || Object.keys(data.FRF).length === 0) data.FRF = JSON.parse(JSON.stringify(templateFRF));

        this.draftConfig = data;
      } catch (err) {
        console.error("Error al obtener la configuración:", err)
        this.error = "No se pudo cargar la configuración del dispositivo."
      } finally {
        this.loading = false
      }
    },

    cancelarCambios() {
      if (this.originalConfig) {
        this.fetchConfig(); // Volvemos a hidratar correctamente
      }
    },

    // Permite a la UI resetear un procesado a su estado de fábrica (blanco)
    resetProcesado(tipo: 'FFT' | 'OMA' | 'FRF') {
      if (!this.draftConfig) return;
      if (tipo === 'FFT') this.draftConfig.FFT = JSON.parse(JSON.stringify(templateFFT));
      if (tipo === 'OMA') this.draftConfig.OMA = JSON.parse(JSON.stringify(templateOMA));
      if (tipo === 'FRF') this.draftConfig.FRF = JSON.parse(JSON.stringify(templateFRF));
    },

    async saveConfig() {
      if (!this.draftConfig) return;
      this.loading = true; this.error = ''; this.successMsg = '';

      try {
        const payload = JSON.parse(JSON.stringify(this.draftConfig));

        if (payload.Gestor && Array.isArray(payload.Gestor.Nodos)) {
          payload.Gestor.Nodos.sort((a: any, b: any) => a.Sensor - b.Sensor);
        }
        
        if (payload.Gestor && payload.Gestor.Medidas) {
          delete payload.Gestor.Medidas;
        }

        // PURGA: Si la sección coincide con el esqueleto (está en blanco)
        // se enviará ausente o vacía según llegó originalmente[cite: 9]
        if (JSON.stringify(payload.FFT) === JSON.stringify(templateFFT)) {
          if (!this.originalConfig?.FFT || Object.keys(this.originalConfig.FFT).length === 0) delete payload.FFT;
          else payload.FFT = {};
        }
        if (JSON.stringify(payload.OMA) === JSON.stringify(templateOMA)) {
          if (!this.originalConfig?.OMA || Object.keys(this.originalConfig.OMA).length === 0) delete payload.OMA;
          else payload.OMA = {};
        }
        if (JSON.stringify(payload.FRF) === JSON.stringify(templateFRF)) {
          if (!this.originalConfig?.FRF || Object.keys(this.originalConfig.FRF).length === 0) delete payload.FRF;
          else payload.FRF = {};
        }

        //Como aun estamos probando, no enviamos el JSON al dispositivo ReMo y lo imprimimos en consola para comprobar que se genere bien
        //console.log(payload);
        //Una vez que ya funciona se comenta el comando que imprime en consola
        await api.post('/remo/Config', payload, { withCredentials: true })
        this.successMsg = "Configuración procesada y depurada correctamente."
        
        this.originalConfig = JSON.parse(JSON.stringify(payload))
      } catch (err) {
        console.error("Error al guardar la configuración:", err)
        this.error = "Error al aplicar los cambios en el hardware."
        throw err
      } finally {
        this.loading = false
      }
    }
  }
})