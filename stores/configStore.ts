import { defineStore } from 'pinia'
import { api } from '@/api/axios'
import type { FullConfig } from '@/types/config'

interface ConfigState {
  originalConfig: FullConfig | null
  draftConfig: FullConfig | null // Estado intermedio (Borrador)
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
        // Pedimos toda la configuración de golpe
        const res = await api.get<FullConfig>('/remo/Config', { withCredentials: true })
        this.originalConfig = JSON.parse(JSON.stringify(res.data))
        this.draftConfig = JSON.parse(JSON.stringify(res.data))
      } catch (err) {
        console.error("Error al obtener la configuración:", err)
        this.error = "No se pudo cargar la configuración del dispositivo."
      } finally {
        this.loading = false
      }
    },

    // Restaura el borrador al último estado guardado
    cancelarCambios() {
      if (this.originalConfig) {
        this.draftConfig = JSON.parse(JSON.stringify(this.originalConfig))
      }
    },

    async saveConfig() {
      if (!this.draftConfig) return;
      this.loading = true; this.error = ''; this.successMsg = '';

      try {
        const payload = JSON.parse(JSON.stringify(this.draftConfig));
        
        // PROTECCIÓN CRÍTICA: Eliminamos Gestor.Medidas para que el POST 
        // no sobreescriba lo que maneja MeasuresView.vue[cite: 10]
        if (payload.Gestor && payload.Gestor.Medidas) {
          delete payload.Gestor.Medidas;
        }

        await api.post('/remo/Config', payload, { withCredentials: true })
        this.successMsg = "Configuración aplicada correctamente. El dispositivo aplicará los cambios."
        
        // Actualizamos el original para que el nuevo borrador parta de aquí
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