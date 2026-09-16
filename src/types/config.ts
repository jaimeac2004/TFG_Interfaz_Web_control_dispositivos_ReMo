// Tipados para la configuración global completa del sistema ReMo

export interface Nodo { Sensor: number; Nombre: string; Posicion: { x: number; y: number; z: number } }
export interface DataSetDef { Nombre: string; Canales: string[]; Estados: string[] }

export interface ATHs { Sensor: number; Rango: string; HPF: boolean }
export interface ADs { Sensor: number; Ganancia: number }
export interface Calibracion { Sensor: number; Gains: number[]; Offsets: number[] }

export interface ATHADConfig {
  I2CFrec: number; DODR: number; TH: number;
  ATHs: ATHs[]; ADs: ADs[]; Calibracion: Calibracion[];
}

export interface InfluxDBConfig {
  DB: { Servidor: string; Token: string; OrgID: string; Bucket: string };
  Reintentos: number;
  Loggers: Record<string, any>;
}

// Tipado de la respuesta completa del servidor
export interface FullConfig {
  Global: { fs: number };
  Gestor: {
    Nodos: Nodo[];
    Datas: DataSetDef[];
    Medidas?: any[]; // Lo ponemos opcional porque lo ignoraremos al guardar
  };
  ATHAD: ATHADConfig;
  Data: { Canales: string[] };
  TA: { Canales: string[], Estados: string[] };
  FFT: { Canales: string[]; Config: any };
  OMA: { OMAs: any[]; Config: any };
  FRF: { Canales: string[]; Config: any };
  InfluxDB: InfluxDBConfig;
}