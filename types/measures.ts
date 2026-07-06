//Tipado de los JSON recogidos para las medidas

export type PeriodicidadMedida = "Unico" | "Continuo" | "Fija" | "Hora" | "Día" | "Semana" | "Mes" | "Año";
export type TipoTriggerMedida = "Timed" | "Level";

export interface CapturaMedida {
  Duracion: number;
  Bloques: number;
}

export interface NivelTrigger {
  Canal: string;
  Umbral: number;
}

export interface TriggerMedida {
  Tipo: TipoTriggerMedida;
  Niveles: NivelTrigger[];
}

export interface ProgramacionMedida {
  Inicio: string; // Formato string (generalmente ISO o fecha/hora de LabVIEW)
  Fin: string;
  Periodicidad: PeriodicidadMedida;
  Intervalos: number[];
}

export interface ProcesadoMedida {
  Nombre: string;
  Config: string;
}

// Estructura de un objeto individual "Medida" según el Schema
export interface MedidaItem {
  Nombre: string;
  Activo: boolean;
  Data: string;
  Captura: CapturaMedida;
  Prebuffer: number;
  Programacion: ProgramacionMedida;
  Trigger: TriggerMedida;
  Procesado: ProcesadoMedida[];
}

// Estructura que devuelve el GET /remo/Config/?Seccion=Medidas
export interface ConfigMedidasResponse {
  Medidas: MedidaItem[];
}