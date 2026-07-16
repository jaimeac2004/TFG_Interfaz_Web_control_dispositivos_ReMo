import { defineStore } from 'pinia'
import { api } from '@/api/axios'
import type { SensorDetectado, EstadoSensor, SensorTarjetaUI } from '@/types/remo'

interface User {
  Usuario: string;
  Nivel: number;
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  //Nuevos parámetros de la página, los sensores y sus estados
  sensoresUI: SensorTarjetaUI[]
  loadingDashboard: boolean
  errorDashboard: string
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    isAuthenticated: false,
    loading: false,
    sensoresUI: [],
    loadingDashboard: false,
    errorDashboard: ''
  }),

  getters: {
    canalesDisponibles: (state): string[] => {
      const canalesFisicos: string[] = [];
      
      state.sensoresUI.forEach(sensor => {
        if (!sensor.Canales || sensor.Canales.length === 0) return;
        
        sensor.Canales.forEach(canal => {
          if (canal === 'AD') {
            // Si es AD, el nombre del canal es directamente el nombre del nodo
            canalesFisicos.push(sensor.Nombre); 
          } else if (canal.startsWith('Eje ')) {
            // Si es ATH, extrae la letra (X, Y, Z) y la concatena con un punto
            const eje = canal.split(' ')[1]; 
            canalesFisicos.push(`${sensor.Nombre}.${eje}`); 
          } else {
            // Por seguridad ante futuros sensores
            canalesFisicos.push(`${sensor.Nombre}.${canal}`); 
          }
        });
      });
      
      return canalesFisicos;
    }
  },

  actions: {
    async login(username: string, password: string) {
      // const data = "username=" + encodeURIComponent(username) + "&password=" + encodeURIComponent(password);
      const data = {
        username: username.trim(),
        password: btoa(btoa(password)) //no era url-encoded, es un doble cifrado basico de base 64
      }; /*btoa() es una funcion que realiza un cifrado en base 64, 
      al necesitar un cifrado doble, se ejecuta dos veces*/
      this.loading = true
      try {
        await api.post('/remo/Server/Login', data, {
          headers: {
            'Content-Type': 'application/x-www-urlencoded',
            'Accept': '*/*'
          },
          withCredentials: true
        })
        await this.checkSession()
      } finally {
        this.loading = false
      }
    },

    async checkSession() {
      try {
        const res = await api.get<User>('/remo/Server/CheckAuth', {
          withCredentials: true
        })
        if (res.data && res.data.Usuario) {
          this.user = res.data;
          this.isAuthenticated = true;

        }
      } catch {
        this.user = null
        this.isAuthenticated = false
      }
    },

    async logout() {
      await api.get('/remo/Server/Logout')
      this.user = null
      this.isAuthenticated = false
      //Vaciamos el dashboard si cierras la sesión
      this.sensoresUI = []
      this.errorDashboard = ''
    },

    async fetchDashboardData() {
      // Protección: No solicitamos datos si no estamos logueados
      if (!this.isAuthenticated) return

      this.loadingDashboard = true
      this.errorDashboard = ''

      try {
        // Lanzamos las peticiones en paralelo hacia el backend de LabVIEW
        //MUY IMPORTANTE: LA DOCUMENTACION DE HAY UNA ERRATA CON LA URL, PONE "GENERADOR" Y ES "GENERATOR"
        /*const [resSensores, resEstados, resNodos] = await Promise.all([
          api.get<SensorDetectado[]>('/remo/Status/?Seccion=Generator&Key=Sensores', { withCredentials: true }),
          api.get<EstadoSensor[]>('/remo/Status/?Seccion=Generator&Key=Estado', { withCredentials: true }),
          api.get<any>('/remo/Config/?Seccion=Gestor.Nodos', { withCredentials: true })
        ])*/

        //Version despues de annadir a Status la seccion Gestor.Nodos
        const res = await api.get<any>('/remo/Status/?Seccion=Gestor&Key=Nodos', { withCredentials: true })
        

        // const safeParse = (data: any) => {
        //   if (typeof data === 'string') {
        //     if (data.trim() === '') return [] // String vacío -> Array vacío
        //     try {
        //       return JSON.parse(data)
        //     } catch (e) {
        //       console.warn("Error al leer el formato del JSON de recibido:", data)
        //       return []
        //     }
        //   }
        //   return data || []
        // }

        const nodos = res.data

        // Realizamos la fusión de los datos usando la posición
        if (Array.isArray(nodos) && nodos.length > 0) {
          // 2. Filtramos y Mapeamos los datos
          this.sensoresUI = nodos
            // Filtro: Ocultamos los "Ausentes" para no llenar la tabla de filas vacías. 
            // (Si quieres ver los 16 canales siempre, borra esta línea)
            .filter((nodo: any) => nodo.Estado !== 'Ausente')
            // Mapeo: Extraemos los datos del sub-objeto "Sensor" hacia la raíz para mantener compatibilidad
            .map((nodo: any) => ({
              Posicion: nodo.Sensor.Posicion,
              Tipo: nodo.Sensor.Tipo,
              Canales: nodo.Sensor.Canales,
              Estados: nodo.Sensor.Estados,
              Nombre: nodo.Nombre,
              Coordenadas: nodo.Posicion, // Coordenadas 3D
              EstadoSalud: nodo.Estado
            }))
        } else {
          // Si LabVIEW devuelve vacío o algo que no reconocemos, dejamos el dashboard vacío
          this.sensoresUI = []
        }

      } catch (error) {
        console.error("Error al cargar datos del hardware en el Store:", error)
        this.errorDashboard = "No se pudo obtener el estado de los sensores. Comprueba la conexión."
      } finally {
        this.loadingDashboard = false
      }
    }
  }
})
