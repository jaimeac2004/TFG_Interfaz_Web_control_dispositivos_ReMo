export const tooltips = {
  // Descripciones generales de las pestañas de procesado
  procesado: {
    Data: "Almacenamiento directo de la señal temporal sin procesar matemáticamente.",
    TA: "Time Analysis: Monitorización continua de variables de estado (como Temperatura o Humedad) en el dominio del tiempo.",
    FFT: "Transformada Rápida de Fourier: Convierte la señal del dominio del tiempo al dominio de la frecuencia para identificar resonancias.",
    OMA: "Análisis Modal Operacional: Identifica las propiedades dinámicas de una estructura (frecuencias, amortiguamiento) en condiciones de operación (algoritmo SSI).",
    FRF: "Función de Respuesta en Frecuencia: Análisis Modal Experimental (EMA) que relaciona una fuerza de excitación conocida con la respuesta estructural."
  },
  // Ejemplos de parámetros específicos para que veas cómo se escala
  parametros: {
    resF: "Resolución frecuencial. Define el espaciado entre líneas del espectro en Hercios (Hz).",
    incF: "Incremento frecuencial o solapamiento entre espectros consecutivos.",
    ventana: "Función matemática aplicada al bloque de datos para mitigar el efecto de fuga espectral (Leakage)."
  }
};