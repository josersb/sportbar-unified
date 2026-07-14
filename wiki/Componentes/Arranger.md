# Arranger

Componente simple que renderiza la ruta `/arranger` con links directos a la interfaz web del controlador Arranger IPEX5000 en `192.168.2.254`. No consume estado ni interactúa con la API; solo abre pestañas externas a las distintas secciones del panel de administración del hardware.

## Props / Estado

No recibe props. No consume el contexto global. Es un componente puramente presentacional.

## APIs y Endpoints

No llama a la [[../API/ArrangerApi]] directamente. En cambio, abre las siguientes URLs de la interfaz web nativa del Arranger en pestañas nuevas (`target="blank"`):

- **Estados de Fuentes y TVs**: `http://192.168.2.254/#/status`
- **Matriz de Audio Video**: `http://192.168.2.254/#/matrix`
- **Preview de Fuentes de Señal**: `http://192.168.2.254/#/tools/previews`
- **Ajustes de Dispositivos**: `http://192.168.2.254/#/device-settings`
- **Herramientas**: `http://192.168.2.254/#/tools`

## Relaciones

- Sirve como puente visual hacia la interfaz web del hardware Arranger
- Complementa a la [[../API/ArrangerApi]] (la API se usa desde otros componentes; este componente da acceso a la UI nativa)
- Usado por [[../Componentes/App]] a través del router
- [[../README]] — documentación general
- [[../AGENTS]] — schema de la wiki
