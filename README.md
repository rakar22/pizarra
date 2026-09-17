# Pizarra

**Football Intelligence Dashboard** — una plataforma de análisis futbolístico que combina datos, cuotas y modelos probabilísticos de forma trazable.

## Estado actual — V2 en construcción

- Dashboard oscuro, responsive y orientado a analista.
- Navegación preparada para Dashboard, Partidos, Value, Modelo, Scout IA, Bankroll y Datos.
- Carga de agenda real desde ESPN para las principales ligas configuradas.
- Fallback DEMO explícito cuando las fuentes no devuelven eventos.
- Motor Poisson transparente para 1X2 y Over/Under 2.5.
- Modelo Dixon-Coles implementado como segunda capa para corregir la zona de baja anotación.
- Pipeline de modelo conectado a estadísticas GF/GA de standings cuando hay datos suficientes.
- Value Engine con probabilidad implícita, edge, EV, de-vig y Kelly a un cuarto.
- Gates de calidad para impedir señales cuando faltan datos o el edge es insuficiente.
- Registro multi-fuente con ESPN, OpenLigaDB y TheSportsDB.
- Adaptador de cuotas normalizado preparado para integración server-side sin exponer credenciales.
- Backtesting rolling cronológico sin fuga del resultado del partido al momento de predecir.
- Backtesting Poisson y Dixon-Coles sobre el mismo flujo histórico, con comparación estrictamente descriptiva.
- Brier Score, Log Loss, bins de calibración, ECE y MCE como métricas descriptivas.
- Umbral explícito de 100 predicciones para considerar la calibración como muestra suficiente; por debajo se marca `insufficient_sample`.
- Auditoría de datasets históricos: duplicados, IDs, resultados, fechas, orden cronológico y rango temporal.
- Comparación Poisson vs Dixon-Coles sin declarar un modelo ganador antes de la validación out-of-sample.
- Búsqueda, actualización manual, estados de carga/error y panel de fuentes.
- Tests unitarios del núcleo matemático, backtesting, calibración, calidad de datos y Value Engine, además de CI para test + build.
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
Normalization layer → dataset quality audit
  ↓
Team stats → Poisson / Dixon-Coles → probabilities
  ↓
Odds normalization → de-vig → Value Engine → quality gates
  ↓
Historical events → chronological rolling backtests
  ↓
Brier / Log Loss / ECE / MCE → calibration status
  ↓
Scout IA evidence layer → Bankroll analytics
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

1. Completar contratos y normalización entre proveedores reales.
2. Integrar un proveedor de cuotas real mediante un backend/serverless y secretos de despliegue.
3. Ingesta histórica persistente para alimentar el backtesting con partidos reales y alcanzar una muestra suficiente.
4. Estimar parámetros Dixon-Coles a partir del histórico en lugar de depender de `rho` por defecto.
5. Añadir modelos ML como ensemble únicamente después de comparar de forma reproducible y out-of-sample.
6. Scout IA con evidencia, timestamps y fuentes asociadas a cada afirmación.
7. Base de datos, caché, sincronización idempotente y health checks reales de proveedores.
8. Tests de integración, observabilidad y despliegue final.

> 18+. Juego responsable. Pizarra es una herramienta de análisis y no garantiza resultados ni constituye asesoramiento financiero.
