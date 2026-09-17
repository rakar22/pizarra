# Pizarra

**Football Intelligence Dashboard** — una plataforma de análisis futbolístico que combina datos, cuotas y modelos probabilísticos de forma trazable.

## V1 implementada

- Dashboard oscuro, responsive y orientado a analista.
- Navegación preparada para Dashboard, Partidos, Value, Modelo, Scout IA, Bankroll y Datos.
- Motor Poisson transparente para 1X2 y Over/Under 2.5.
- Cálculo de probabilidad implícita, edge y Kelly a un cuarto.
- Registro multi-fuente con ESPN, OpenLigaDB y TheSportsDB.
- Separación entre capa de datos y capa de modelado para poder añadir proveedores sin rehacer la interfaz.
- Sin claves API hardcodeadas ni ejecución automática de apuestas.

## Fuentes

El catálogo de [public-apis/public-apis](https://github.com/public-apis/public-apis) se utiliza como mapa de proveedores, pero cada API se valida individualmente antes de pasar a producción. La V1 incorpora adaptadores iniciales para ESPN, OpenLigaDB y TheSportsDB.

## Arquitectura

```text
UI React
  ↓
Data Registry → ESPN / OpenLigaDB / TheSportsDB / Odds providers
  ↓
Normalization layer
  ↓
Poisson / future Dixon-Coles / ML ensemble
  ↓
Value Engine
  ↓
Scout IA + Backtesting + Bankroll
```

## Próximas fases

1. Conectar datos reales y normalizarlos a un esquema único.
2. Añadir proveedor de cuotas con API key almacenada únicamente en variables de entorno del servidor.
3. Historial + backtesting y métricas de calibración.
4. Dixon-Coles y modelos ML como ensemble, sin sustituir el modelo base hasta validar rendimiento.
5. Scout IA con evidencia y fuentes asociadas a cada afirmación.
6. Base de datos, caché y health checks de proveedores.
7. Tests unitarios/integración y despliegue.

> 18+. Juego responsable. Pizarra es una herramienta de análisis y no garantiza resultados ni constituye asesoramiento financiero.
