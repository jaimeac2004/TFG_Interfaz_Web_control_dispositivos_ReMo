# Interfaz Web - Sistema de Monitorización Autónomo ReMo (SHM)

![Vue.js](https://img.shields.io/badge/Vue.js-35495E?style=for-the-badge&logo=vuedotjs&logoColor=4FC08D)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Pinia](https://img.shields.io/badge/Pinia-F6D365?style=for-the-badge&logo=vue.js&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-B73EA5?style=for-the-badge&logo=vite&logoColor=FFD62E)

Cliente web embebido desarrollado como **Trabajo de Fin de Grado (Ingeniería de Tecnologías Específicas de Telecomunicación)** para la Universidad de Valladolid.

## Descripción

Este proyecto proporciona una interfaz gráfica interactiva, segura y reactiva para el control remoto de los nodos de adquisición de datos del sistema de Monitorización de Salud Estructural (SHM) **ReMo**. 

Sustituye la antigua configuración basada en la edición manual de texto plano JSON por un entorno con validación semántica estricta. Está diseñado para operar bajo un paradigma de *Edge Computing*, donde la aplicación se compila de forma estática y es servida directamente por el hardware embebido sin depender de servidores en la nube.

## Características Principales

* **Control de Sesión Seguro:** Autenticación de operadores perimetrada y cifrada.
* **Monitorización en Tiempo Real:** Dashboard interactivo con el estado de salud y la topología de los sensores físicos mediante rutinas de sondeo (*polling*).
* **Gestión Semántica de Medidas:** Interfaz de parametrización a prueba de errores lógicos, incluyendo validación de límites de intervalos y condiciones de disparo (*triggers*).
* **Configuración Profunda de Hardware:** Gestión de la calibración ATH/AD, nodos lógicos y procesamiento analítico post-captura (FFT, OMA, FRF).
* **Mantenimiento del Sistema:** Herramientas integradas para la importación/exportación de copias de seguridad de la configuración, actualización de *firmware* y reinicio remoto del equipo.

## Arquitectura y Tecnologías

El proyecto sigue una arquitectura fuertemente desacoplada:
* **Framework:** Vue 3 (Composition API)
* **Lenguaje:** TypeScript (Tipado estricto contra la API JSON heredada)
* **Gestor de Estado:** Pinia (Separación por dominios: `auth`, `config`, `measures`)
* **Enrutamiento:** Vue Router (Protección mediante *Navigation Guards*)
* **Cliente HTTP:** Axios
* **Construcción:** Vite

## Instalación y Despliegue Local

### Requisitos previos
* [Node.js](https://nodejs.org/) (v18.0 o superior)
* `npm` (Node Package Manager)

### Instrucciones

1. Clonar el repositorio:
   ```bash
   git clone [https://github.com/jaimeac2004/TFG_Interfaz_Web_control_dispositivos_ReMo.git](https://github.com/jaimeac2004/TFG_Interfaz_Web_control_dispositivos_ReMo.git)
   cd TFG_Interfaz_Web_control_dispositivos_ReMo