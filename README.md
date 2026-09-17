# Pizarra

**Football Intelligence Dashboard** — una plataforma de análisis futbolístico que combina datos, cuotas y modelos probabilísticos de forma trazable.

## Estado actual — V1 operativa

- Dashboard oscuro, responsive y orientado a analista.
- Navegación preparada para Dashboard, Partidos, Value, Modelo, Scout IA, Bankroll y Datos.
- Carga de agenda real desde ESPN para las principales ligas configuradas.
- Fallback DEMO explícito cuando las fuentes no devuelven eventos.
- Motor Poisson transparente para 1X2 y Over/Under 2.5.
- Modelo Dixon-Coles implementado para ajustar los marcadores de baja puntuación y normalizar sus probabilidades.
- Comparación Poisson vs Dixon-Coles disponible de forma descriptiva; no se selecciona un modelo ganador sin validación fuera de muestra.
- Pipeline de modelo conectado a estadísticas GF/GA de standings cuando hay datos suficientes.
- Backtesting histórico rolling disponible con separación temporal y métricas Brier, Log Loss y calibración.
- Value Engine con probabilidad implícita, edge, EV, de-vig y Kelly a un cuarto.
- Gates de calidad para impedir señales cuando faltan datos o el edge es insuficiente.
- Registro multi-fuente con ESPN, OpenLigaDB y TheSportsDB.
- Búsqueda, actualización manual, estados de carga/error y panel de fuentes.
- Tests unitarios del núcleo matemático, modelos, backtesting y Value Engine, además de CI para test + build.
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
Team stats → Poisson + Dixon-Coles → model comparison
  ↓
Odds normalization → de-vig → Value Engine → quality gates
  ↓
Historical rolling backtest → calibration → Scout IA → Bankroll analytics
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

1. Completar contratos y normalización con fixtures reales de cada proveedor.
2. Integrar un proveedor de cuotas con API key almacenada únicamente en variables de entorno del servidor.
3. Conectar histórico real suficiente y reportar calibración/ECE únicamente cuando el tamaño de muestra sea adecuado.
4. Validar Poisson vs Dixon-Coles y, posteriormente, un ensemble ML mediante backtesting fuera de muestra.
5. Scout IA con evidencia, procedencia y trazabilidad para cada afirmación.
6. Base de datos, caché, sincronización idempotente y health checks reales de proveedores.
7. Tests de integración, observabilidad y despliegue final.

> 18+. Juego responsable. Pizarra es una herramienta de análisis y no garantiza resultados ni constituye asesoramiento financiero.
