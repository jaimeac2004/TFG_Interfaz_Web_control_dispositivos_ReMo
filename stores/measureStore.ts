import { defineStore } from 'pinia'
import { api } from '@/api/axios'
import type { MedidaItem, ConfigMedidasResponse } from '@/types/measures'

interface MeasuresState {
  listaMedidas: MedidaItem[]
  loading: boolean
  error: string
  successMsg: string
}

export const useMeasuresStore = defineStore('measures', {
  state: (): MeasuresState => ({
    listaMedidas: [],
    loading: false,
    error: '',
    successMsg: ''
  }),

  actions: {
    //LECTURA: Trae las medidas desde la sección correspondiente de la configuración
    async fetchMedidas() {
      this.loading = true
      this.error = ''
      this.successMsg = ''

      try {
        const res = await api.get<any>('/remo/Config/?Seccion=Gestor.Medidas', { withCredentials: true })

        // Si la estructura trae el nodo "Medidas" y es un array, lo guardamos
        if (res.data && Array.isArray(res.data)) {
          this.listaMedidas = res.data
        } else {
          this.listaMedidas = []
        }

      } catch (err) {
        console.error("Error al obtener las medidas de la configuración:", err)
        this.error = "No se pudieron cargar las medidas del sistema."
      } finally {
        this.loading = false
      }
    },

    //ESCRITURA: Envia una o varias medidas al endpoint dedicado (POST /remo/Medida)
    //Sirve tanto para añadir, modificar o eliminar (según las reglas de LabVIEW)
    async guardarMedida(payload: MedidaItem | { Nombre: string}) {
      this.loading = true
      this.error = ''
      this.successMsg = ''

      try {
        // Mandamos la lista de medidas en el cuerpo de la solicitud JSON
        await api.post('/remo/Medida', payload, { withCredentials: true })
        this.successMsg = "Cambios aplicados correctamente en el dispositivo."
        
        // Refrescamos la lista local volviendo a pedir la configuración para asegurar sincronía
        await this.fetchMedidas()
      } catch (err) {
        console.error("Error al enviar la medida al endpoint:", err)
        this.error = "Error al aplicar los cambios en las medidas del hardware."
        throw err // Lo lanzamos por si el componente quiere reaccionar al fallo
      } finally {
        this.loading = false
      }
    }
  }
})