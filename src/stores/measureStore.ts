import { defineStore } from 'pinia'
import { api } from '@/api/axios'
import type { MedidaItem, ConfigMedidasResponse } from '@/types/measures'

interface MeasuresState {
  listaMedidas: MedidaItem[]
  listaDatas: string[]
  loading: boolean
  error: string
  successMsg: string
}

export const useMeasuresStore = defineStore('measures', {
  state: (): MeasuresState => ({
    listaMedidas: [],
    listaDatas: [],
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

        // Hacemos las dos peticiones en paralelo a la configuración
        const [resMedidas, resDatas] = await Promise.all([
          api.get<any>('/remo/Config/?Seccion=Gestor.Medidas', { withCredentials: true }),
          api.get<any>('/remo/Config/?Seccion=Gestor.Datas', { withCredentials: true })
        ])

        // 1. Guardar Medidas
        if (resMedidas.data && Array.isArray(resMedidas.data)) {
          this.listaMedidas = resMedidas.data
        } else {
          this.listaMedidas = []
        }

        // 2. Guardar nombres de Datas
        // Mapeamos el array para quedarnos ÚNICAMENTE con la propiedad "Nombre" de cada conjunto
        if (resDatas.data && Array.isArray(resDatas.data)) {
          this.listaDatas = resDatas.data.map((item: any) => item.Nombre).filter(Boolean)
        } else {
          this.listaDatas = []
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