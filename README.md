# Pizarra

**Football Intelligence Dashboard** — una plataforma de análisis futbolístico que combina datos, cuotas y modelos probabilísticos de forma trazable.

## Estado actual — V1 operativa

- Dashboard oscuro, responsive y orientado a analista.
- Navegación preparada para Dashboard, Partidos, Value, Modelo, Scout IA, Bankroll y Datos.
- Carga de agenda real desde ESPN para las principales ligas configuradas.
- Fallback DEMO explícito cuando las fuentes no devuelven eventos.
- Motor Poisson transparente para 1X2 y Over/Under 2.5.
- Cálculo de probabilidad implícita, edge y Kelly a un cuarto.
- Registro multi-fuente con ESPN, OpenLigaDB y TheSportsDB.
- Búsqueda, actualización manual, estados de carga/error y panel de fuentes.
- Tests unitarios del núcleo matemático y CI para test + build.
- Sin claves API hardcodeadas ni ejecución automática de apuestas.

## Configuración

Copia `.env.example` a `.env` o `.env.local` según tu entorno. Las variables `VITE_*` son públicas por diseño; **no deben contener secretos**. Cualquier proveedor de cuotas autenticado deberá integrarse en servidor y almacenar su clave como secreto del despliegue.

Variables actuales:

- `VITE_ESPN_BASE_URL`
- `VITE_ESPN_LEAGUES`

## Fuentes

El catálogo de `public-apis/public-apis` se utiliza como mapa de proveedores, pero cada API se valida individualmente antes de pasar a producción. La V1 incorpora adaptadores iniciales para ESPN, OpenLigaDB y TheSportsDB.

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

## Desarrollo

```bash
npm install
npm run dev
npm test
npm run build
```

GitHub Actions ejecuta automáticamente `npm test` y `npm run build` en pushes y pull requests.

## Próximas fases

1. Completar la capa de normalización y contratos de datos.
2. Añadir proveedor de cuotas con API key almacenada únicamente en variables de entorno del servidor.
3. Historial + backtesting y métricas de calibración.
4. Dixon-Coles y modelos ML como ensemble, sin sustituir el modelo base hasta validar rendimiento.
5. Scout IA con evidencia y fuentes asociadas a cada afirmación.
6. Base de datos, caché, sincronización idempotente y health checks de proveedores.
7. Tests de integración y despliegue final.

> 18+. Juego responsable. Pizarra es una herramienta de análisis y no garantiza resultados ni constituye asesoramiento financiero.
