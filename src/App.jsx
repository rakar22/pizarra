import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Brain, CalendarDays, ChevronRight, CircleDollarSign, Database, Gauge, Menu, RefreshCw, Search, ShieldCheck, Sparkles, TrendingUp, X } from 'lucide-react';
import { loadFootballData } from './data/footballData.js';
import { dixonColesMatchProbabilities, dixonColesOverUnder25 } from './core/dixonColes.js';

function App() {
  const [active, setActive] = useState('Dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [data, setData] = useState({ matches: [], sources: [], isLive: false, fetchedAt: null });
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setRefreshing(true); setError('');
    try { setData(await loadFootballData()); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudieron cargar los datos.'); }
    finally { setRefreshing(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(() => data.matches.filter(m => `${m.home} ${m.away} ${m.league}`.toLowerCase().includes(query.toLowerCase())), [data.matches, query]);
  const selected = data.matches.find(m => m.id === selectedId) ?? filtered[0] ?? null;
  const analysed = data.matches.filter(m => m.model !== null).length;
  const withOdds = data.matches.filter(m => m.odds !== null).length;
  const freshness = data.isLive ? 'LIVE' : 'DEMO';
  const nav = [['Dashboard', Gauge], ['Partidos', CalendarDays], ['Value', TrendingUp], ['Modelo', Brain], ['Scout IA', Sparkles], ['Bankroll', CircleDollarSign], ['Datos', Database]];
  const selectMatch = (match) => { setSelectedId(match.id); setActive('Modelo'); };

  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark">P</div><div><strong>Pizarra</strong><span>Football Intelligence</span></div><button className="icon-btn mobile-close" onClick={() => setMobileOpen(false)}><X size={18}/></button></div>
      <nav>{nav.map(([label, Icon]) => <button key={label} className={active === label ? 'nav-item active' : 'nav-item'} onClick={() => { setActive(label); setMobileOpen(false); }}><Icon size={18}/><span>{label}</span></button>)}</nav>
      <div className="data-status"><div className="status-dot"/><div><strong>Data Engine</strong><span>{data.isLive ? `${data.matches.length} eventos reales` : 'Fallback demo activo'}</span></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="icon-btn menu-btn" onClick={() => setMobileOpen(true)}><Menu size={20}/></button><div><div className="eyebrow">17 SEP 2026 · ESPAÑA</div><h1>{active}</h1></div><div className="top-actions"><div className="search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar partido..."/></div><button className="icon-btn" onClick={refresh} aria-label="Actualizar datos"><RefreshCw size={17} className={refreshing ? 'spin' : ''}/></button><div className="avatar">M</div></div></header>
      {error && <div className="alert">No se pudo actualizar la fuente. Se mantienen los datos disponibles. {error}</div>}
      {active === 'Dashboard' && <><section className="hero"><div><div className="pill"><Activity size={14}/> MOTOR OPERATIVO · {freshness}</div><h2>Analiza el mercado<br/><em>con datos, no con ruido.</em></h2><p>Pizarra combina datos deportivos, cuotas y modelos probabilísticos para convertir partidos en señales de análisis trazables.</p></div><div className="hero-metric"><span>EVENTOS CARGADOS</span><strong>{data.matches.length || '—'}</strong><small>{data.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'esperando datos'}</small></div></section><section className="stats"><Stat icon={TrendingUp} label="Partidos con modelo" value={analysed || '—'} detail={withOdds ? `${withOdds} con cuotas disponibles` : 'cuotas aún pendientes'}/><Stat icon={BarChart3} label="Calibración" value="Pendiente" detail="histórico out-of-sample requerido"/><Stat icon={Database} label="Datos frescos" value={freshness} detail={`${data.sources.length} fuentes registradas`}/><Stat icon={ShieldCheck} label="Ejecución" value="Desactivada" detail="análisis sin apuestas automáticas"/></section></>}
      {(active === 'Dashboard' || active === 'Partidos') && <section className="content-grid"><div className="panel matches-panel"><div className="panel-head"><div><span className="section-kicker">AGENDA REAL</span><h3>Partidos cargados</h3></div><button className="text-btn" onClick={() => setActive('Partidos')}>Ver todos <ChevronRight size={15}/></button></div><div className="table-wrap"><table><thead><tr><th>PARTIDO</th><th>ESTADO</th><th>FUENTE</th><th>MODELO</th><th>CUOTA</th><th/></tr></thead><tbody>{filtered.map(m => <tr key={m.id}><td><strong>{m.home}</strong><span>{m.away} · {m.league} · {m.time}</span></td><td>{m.status}</td><td>{m.source || 'DEMO'}</td><td>{m.model === null ? 'Pendiente' : `${m.model}%`}</td><td>{m.odds === null ? '—' : m.odds.toFixed(2)}</td><td><button className="row-btn" onClick={() => selectMatch(m)}>Analizar</button></td></tr>)}{!filtered.length && <tr><td colSpan="6" className="empty">No hay partidos que coincidan con la búsqueda.</td></tr>}</tbody></table></div></div><div className="panel insight"><div className="panel-head"><div><span className="section-kicker">SCOUT IA</span><h3>Lectura rápida</h3></div><Sparkles size={18}/></div><div className="insight-card"><div className="mini-badge">MODO EVIDENCIA</div><h4>El Scout espera datos antes de interpretar</h4><p>Las conclusiones deben apoyarse en partidos, forma, alineaciones, lesiones y movimiento de mercado verificables. Sin evidencia suficiente, Pizarra marca el análisis como pendiente.</p><div className="confidence"><span>Fuente principal</span><strong>{data.isLive ? 'ESPN' : 'DEMO'}</strong></div><div className="progress"><i style={{ width: data.isLive ? '100%' : '35%' }}/></div></div><div className="note">La IA explica señales; no genera recomendaciones de apuesta por sí sola.</div></div></section>}
      {active === 'Value' && <ValuePanel matches={data.matches} isLive={data.isLive}/>} {active === 'Modelo' && <ModelPanel match={selected}/>} {active === 'Scout IA' && <ScoutPanel/>} {active === 'Bankroll' && <BankrollPanel/>} {active === 'Datos' && <DataPanel sources={data.sources}/>}<footer>18+ · Juego responsable · Herramienta de análisis, no asesoramiento financiero ni garantía de resultados.</footer>
    </main>
  </div>;
}

function ValuePanel({ matches, isLive }) { const withOdds = matches.filter(m => m.odds !== null); return <section className="panel data-panel"><div className="panel-head"><div><span className="section-kicker">VALUE ENGINE</span><h3>Mercado para revisión</h3></div></div>{!withOdds.length ? <div className="empty">No hay cuotas disponibles en los datos actuales. El análisis de value queda pendiente hasta disponer de un mercado normalizado.</div> : <div className="table-wrap"><table><thead><tr><th>PARTIDO</th><th>CUOTA</th><th>MODELO</th><th>ESTADO</th></tr></thead><tbody>{withOdds.map(m => <tr key={m.id}><td><strong>{m.home} — {m.away}</strong><span>{m.league} · {m.source}</span></td><td>{m.odds.toFixed(2)}</td><td>{m.model == null ? 'Pendiente' : `${m.model}%`}</td><td>{isLive ? 'Revisión pendiente' : 'DEMO · no validar'}</td></tr>)}</tbody></table></div>}<p className="note">Value requiere probabilidades del modelo, mercado normalizado, calidad de datos y validación histórica.</p></section>; }

function ModelPanel({ match }) {
  if (!match?.analysis) return <section className="panel data-panel"><div className="panel-head"><div><span className="section-kicker">MODELO</span><h3>Detalle del partido</h3></div></div><div className="empty">Selecciona un partido con datos suficientes para mostrar el detalle.</div></section>;
  const { analysis } = match;
  const dc = dixonColesMatchProbabilities(analysis.expectedGoals.homeLambda, analysis.expectedGoals.awayLambda);
  const goals = dixonColesOverUnder25(analysis.expectedGoals.homeLambda, analysis.expectedGoals.awayLambda);
  return <section className="panel data-panel"><div className="panel-head"><div><span className="section-kicker">MODELO · COMPARATIVA</span><h3>{match.home} — {match.away}</h3></div></div><div className="stats"><Stat label="Poisson Local" value={`${Math.round(analysis.probabilities.home*100)}%`} detail="modelo base"/><Stat label="Dixon-Coles Local" value={`${Math.round(dc.home*100)}%`} detail="corrección baja anotación"/><Stat label="Dixon-Coles Empate" value={`${Math.round(dc.draw*100)}%`} detail="rho = -0.13"/><Stat label="Dixon-Coles +2.5" value={`${Math.round(goals.over*100)}%`} detail="modelo ajustado"/></div><div className="model-comparison"><span>Poisson 1X2</span><b>{Math.round(analysis.probabilities.home*100)}% / {Math.round(analysis.probabilities.draw*100)}% / {Math.round(analysis.probabilities.away*100)}%</b><span>Dixon-Coles 1X2</span><b>{Math.round(dc.home*100)}% / {Math.round(dc.draw*100)}% / {Math.round(dc.away*100)}%</b></div><div className="validation-card"><div><span className="section-kicker">VALIDACIÓN HISTÓRICA</span><strong>Estado: pendiente</strong></div><p>La interfaz no presenta métricas de rendimiento como si fueran válidas hasta disponer de un histórico cronológico suficiente. Cuando se cargue, Pizarra podrá mostrar Brier Score, Log Loss, ECE, MCE y calibración por bins.</p><div className="validation-grid"><span>Muestra mínima</span><b>100 predicciones</b><span>Split</span><b>cronológico</b><span>Leakage</span><b>evitado</b><span>Comparación</span><b>descriptiva</b></div></div><p className="note">Dixon-Coles está disponible como segunda capa de modelización. La comparación es descriptiva; la selección del modelo debe validarse con histórico out-of-sample.</p></section>;
}
function ScoutPanel() { return <section className="panel data-panel"><div className="panel-head"><div><span className="section-kicker">SCOUT IA</span><h3>Motor de evidencia</h3></div></div><div className="insight-card"><div className="mini-badge">SIN ALUCINACIONES</div><h4>Interpretación bloqueada si faltan evidencias</h4><p>La capa Scout queda preparada para incorporar lesiones, alineaciones, forma y movimientos de mercado con referencias verificables. No se inventan datos ausentes.</p></div></section>; }
function BankrollPanel() { return <section className="panel data-panel"><div className="panel-head"><div><span className="section-kicker">BANKROLL</span><h3>Gestión preparada</h3></div></div><p className="note">El cuarto de Kelly está disponible para análisis. La ejecución automática permanece desactivada y no se muestran tamaños de apuesta sin señal validada y datos suficientes.</p></section>; }
function DataPanel({ sources }) { return <section className="panel data-panel"><div className="panel-head"><div><span className="section-kicker">DATA ENGINE</span><h3>Fuentes registradas</h3></div></div>{sources.map(source => <div className="source-row" key={source.name}><div><strong>{source.name}</strong><span>{source.role}</span></div><b>{source.status}</b></div>)}<div className="validation-card"><div><span className="section-kicker">CALIDAD</span><strong>Health checks reales: pendiente</strong></div><p>El registro identifica proveedores configurados. La siguiente integración añadirá latencia, último éxito, errores y frescura por fuente para distinguir configuración de disponibilidad real.</p></div></section>; }
function Stat({ icon: Icon, label, value, detail }) { return <div className="stat">{Icon && <div className="stat-icon"><Icon size={18}/></div>}<div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>; }
export default App;
