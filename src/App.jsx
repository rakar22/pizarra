import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Brain, CalendarDays, ChevronRight, CircleDollarSign, Database, Gauge, Menu, RefreshCw, Search, ShieldCheck, Sparkles, TrendingUp, X } from 'lucide-react';
import { loadFootballData } from './data/footballData.js';

function App() {
  const [active, setActive] = useState('Dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState({ matches: [], sources: [], isLive: false, fetchedAt: null });
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      setData(await loadFootballData());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los datos.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(() => data.matches.filter(m => `${m.home} ${m.away} ${m.league}`.toLowerCase().includes(query.toLowerCase())), [data.matches, query]);
  const analysed = data.matches.filter(m => m.model !== null).length;
  const freshness = data.isLive ? 'LIVE' : 'DEMO';

  const nav = [
    ['Dashboard', Gauge], ['Partidos', CalendarDays], ['Value', TrendingUp], ['Modelo', Brain], ['Scout IA', Sparkles], ['Bankroll', CircleDollarSign], ['Datos', Database],
  ];

  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark">P</div><div><strong>Pizarra</strong><span>Football Intelligence</span></div><button className="icon-btn mobile-close" onClick={() => setMobileOpen(false)}><X size={18}/></button></div>
      <nav>{nav.map(([label, Icon]) => <button key={label} className={active === label ? 'nav-item active' : 'nav-item'} onClick={() => {setActive(label);setMobileOpen(false)}}><Icon size={18}/><span>{label}</span></button>)}</nav>
      <div className="data-status"><div className="status-dot"/><div><strong>Data Engine</strong><span>{data.isLive ? `${data.matches.length} eventos reales` : 'Fallback demo activo'}</span></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="icon-btn menu-btn" onClick={() => setMobileOpen(true)}><Menu size={20}/></button><div><div className="eyebrow">17 SEP 2026 · ESPAÑA</div><h1>{active}</h1></div><div className="top-actions"><div className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar partido..."/></div><button className="icon-btn" onClick={refresh} aria-label="Actualizar datos"><RefreshCw size={17} className={refreshing ? 'spin' : ''}/></button><div className="avatar">M</div></div></header>
      {error && <div className="alert">No se pudo actualizar la fuente. Se mantienen los datos disponibles. {error}</div>}
      <section className="hero"><div><div className="pill"><Activity size={14}/> MOTOR OPERATIVO · {freshness}</div><h2>Analiza el mercado<br/><em>con datos, no con ruido.</em></h2><p>Pizarra combina datos deportivos, cuotas y modelos probabilísticos para convertir partidos en señales de análisis trazables.</p></div><div className="hero-metric"><span>EVENTOS CARGADOS</span><strong>{data.matches.length || '—'}</strong><small>{data.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'}) : 'esperando datos'}</small></div></section>
      <section className="stats"><Stat icon={TrendingUp} label="Value detectado" value={analysed || '—'} detail="requiere cuotas y modelo"/><Stat icon={BarChart3} label="Precisión modelo" value="Pendiente" detail="sin inventar métricas"/><Stat icon={Database} label="Datos frescos" value={freshness} detail={`${data.sources.length} fuentes registradas`}/><Stat icon={ShieldCheck} label="Riesgo" value="Bajo" detail="sin ejecución automática"/></section>
      <section className="content-grid"><div className="panel matches-panel"><div className="panel-head"><div><span className="section-kicker">AGENDA REAL</span><h3>Partidos cargados</h3></div><button className="text-btn" onClick={()=>setActive('Partidos')}>Ver todos <ChevronRight size={15}/></button></div><div className="table-wrap"><table><thead><tr><th>PARTIDO</th><th>ESTADO</th><th>FUENTE</th><th>MODELO</th><th>CUOTA</th><th/></tr></thead><tbody>{filtered.map(m=><tr key={m.id}><td><strong>{m.home}</strong><span>{m.away} · {m.league} · {m.time}</span></td><td>{m.status}</td><td>{m.source || 'DEMO'}</td><td>{m.model === null ? 'Pendiente' : `${m.model}%`}</td><td>{m.odds === null ? '—' : m.odds.toFixed(2)}</td><td><button className="row-btn">Analizar</button></td></tr>)}{!filtered.length && <tr><td colSpan="6" className="empty">No hay partidos que coincidan con la búsqueda.</td></tr>}</tbody></table></div></div>
        <div className="panel insight"><div className="panel-head"><div><span className="section-kicker">SCOUT IA</span><h3>Lectura rápida</h3></div><Sparkles size={18}/></div><div className="insight-card"><div className="mini-badge">MODO EVIDENCIA</div><h4>El Scout espera datos antes de interpretar</h4><p>Las conclusiones deben apoyarse en partidos, forma, alineaciones, lesiones y movimiento de mercado verificables. Sin evidencia suficiente, Pizarra marca el análisis como pendiente.</p><div className="confidence"><span>Fuente principal</span><strong>{data.isLive ? 'ESPN' : 'DEMO'}</strong></div><div className="progress"><i style={{width: data.isLive ? '100%' : '35%'}}/></div></div><div className="note">La IA explica señales; no genera recomendaciones de apuesta por sí sola.</div></div></section>
      {active === 'Datos' && <section className="panel data-panel"><div className="panel-head"><div><span className="section-kicker">DATA ENGINE</span><h3>Fuentes registradas</h3></div></div>{data.sources.map(source => <div className="source-row" key={source.name}><div><strong>{source.name}</strong><span>{source.role}</span></div><b>{source.status}</b></div>)}</section>}
      <footer>18+ · Juego responsable · Herramienta de análisis, no asesoramiento financiero ni garantía de resultados.</footer>
    </main>
  </div>
}

function Stat({icon:Icon,label,value,detail}) { return <div className="stat"><div className="stat-icon"><Icon size={18}/></div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div> }

export default App;
