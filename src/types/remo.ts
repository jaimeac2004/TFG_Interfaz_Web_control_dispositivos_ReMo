// Tipados de los JSON obtenidos del Backend para la deteccion de los sensores y el estado de los mismos, y tambien para los datos de Gestor.Nodos

export type TipoSensor = "ATH" | "AD" | "TH" | "None";
export type EstadoSaludSensor = "OK" | "Desconectado" | "Inactivo" | "Fuera de rango" | "Repitiendo" | "Ausente";

// Sensores devueltos por GET /remo/Status/?Seccion=Generador&Key=Sensores
export interface SensorDetectado {
  Tipo: TipoSensor;
  Canales: string[]; // Ej: ["Eje X", "Eje Y", "Eje Z"] o ["AD"]
  Estados: string[]; // Ej: ["Temperatura", "Humedad"] o []
  Posicion: number;
}

// Estados de los sensores, devueltos por GET /remo/Status/?Seccion=Generador&Key=Estado
export interface EstadoSensor {
  Posicion: number;
  Estado: EstadoSaludSensor;
}

// Posicion tridimensional sacada de Gestor.Nodos
export interface Coordenadas {
  x: number;
  y: number;
  z: number;
}

//Conjunto de datos de los nodos configurados en la maquina, se saca de Gestor.Nodos
export interface NodoData {
  Sensor: number;
  Nombre: string;
  Posicion: Coordenadas;
}

// Interfaz combinada de los sensores con sus estados, enlazados por la posición
export interface SensorTarjetaUI extends SensorDetectado {
  EstadoSalud: EstadoSaludSensor; // Añadimos la salud cruzando el dato de la Posicion
  Nombre: string;
  Coordenadas: Coordenadas;
}