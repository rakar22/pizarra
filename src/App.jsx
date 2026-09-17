import { useMemo, useState } from 'react';
import { Activity, BarChart3, Brain, CalendarDays, ChevronRight, CircleDollarSign, Database, Gauge, Menu, RefreshCw, Search, ShieldCheck, Sparkles, TrendingUp, X } from 'lucide-react';

const matches = [
  { id: 1, league: 'LaLiga', home: 'Barcelona', away: 'Atlético Madrid', time: '21:00', model: 58, market: 52, odds: 1.92, goals: 'O 2.5', confidence: 'Alta' },
  { id: 2, league: 'Premier League', home: 'Arsenal', away: 'Chelsea', time: '18:30', model: 54, market: 49, odds: 2.05, goals: '1', confidence: 'Media' },
  { id: 3, league: 'Serie A', home: 'Inter', away: 'Napoli', time: '20:45', model: 63, market: 57, odds: 1.82, goals: 'O 2.5', confidence: 'Alta' },
  { id: 4, league: 'Bundesliga', home: 'Bayern', away: 'Leverkusen', time: '20:30', model: 51, market: 48, odds: 2.10, goals: 'BTTS', confidence: 'Media' },
];

function App() {
  const [active, setActive] = useState('Dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const filtered = useMemo(() => matches.filter(m => `${m.home} ${m.away} ${m.league}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const refresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 700); };

  const nav = [
    ['Dashboard', Gauge], ['Partidos', CalendarDays], ['Value', TrendingUp], ['Modelo', Brain], ['Scout IA', Sparkles], ['Bankroll', CircleDollarSign], ['Datos', Database],
  ];

  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark">P</div><div><strong>Pizarra</strong><span>Football Intelligence</span></div><button className="icon-btn mobile-close" onClick={() => setMobileOpen(false)}><X size={18}/></button></div>
      <nav>{nav.map(([label, Icon]) => <button key={label} className={active === label ? 'nav-item active' : 'nav-item'} onClick={() => {setActive(label);setMobileOpen(false)}}><Icon size={18}/><span>{label}</span></button>)}</nav>
      <div className="data-status"><div className="status-dot"/><div><strong>Data Engine</strong><span>4 fuentes conectadas</span></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="icon-btn menu-btn" onClick={() => setMobileOpen(true)}><Menu size={20}/></button><div><div className="eyebrow">17 SEP 2026 · ESPAÑA</div><h1>{active}</h1></div><div className="top-actions"><div className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar partido..."/></div><button className="icon-btn" onClick={refresh}><RefreshCw size={17} className={refreshing ? 'spin' : ''}/></button><div className="avatar">M</div></div></header>
      <section className="hero"><div><div className="pill"><Activity size={14}/> MOTOR OPERATIVO</div><h2>Analiza el mercado<br/><em>con datos, no con ruido.</em></h2><p>Pizarra combina datos deportivos, cuotas y modelos probabilísticos para convertir partidos en señales de análisis trazables.</p></div><div className="hero-metric"><span>EDGE MEDIO</span><strong>+5.8%</strong><small>sobre 24 señales</small></div></section>
      <section className="stats"><Stat icon={TrendingUp} label="Value detectado" value="24" detail="+7 hoy"/><Stat icon={BarChart3} label="Precisión modelo" value="61.4%" detail="últimos 30 días"/><Stat icon={Database} label="Datos frescos" value="96%" detail="4 fuentes activas"/><Stat icon={ShieldCheck} label="Riesgo" value="Bajo" detail="sin ejecución automática"/></section>
      <section className="content-grid"><div className="panel matches-panel"><div className="panel-head"><div><span className="section-kicker">OPORTUNIDADES</span><h3>Partidos con señal</h3></div><button className="text-btn" onClick={()=>setActive('Partidos')}>Ver todos <ChevronRight size={15}/></button></div><div className="table-wrap"><table><thead><tr><th>PARTIDO</th><th>MODELO</th><th>MERCADO</th><th>CUOTA</th><th>EDGE</th><th/></tr></thead><tbody>{filtered.map(m=><tr key={m.id}><td><strong>{m.home}</strong><span>{m.away} · {m.league} · {m.time}</span></td><td><b>{m.model}%</b></td><td>{m.market}%</td><td>{m.odds.toFixed(2)}</td><td><span className="edge">+{m.model-m.market}%</span></td><td><button className="row-btn">Analizar</button></td></tr>)}</tbody></table></div></div>
        <div className="panel insight"><div className="panel-head"><div><span className="section-kicker">SCOUT IA</span><h3>Lectura rápida</h3></div><Sparkles size={18}/></div><div className="insight-card"><div className="mini-badge">BARCELONA — ATLÉTICO</div><h4>El modelo encuentra margen en Over 2.5</h4><p>La estimación actual supera la probabilidad implícita del mercado. Antes de interpretar el edge, Pizarra debe validar alineaciones, lesiones y movimiento de cuota.</p><div className="confidence"><span>Confianza de datos</span><strong>91%</strong></div><div className="progress"><i style={{width:'91%'}}/></div></div><div className="note">La IA explica señales; no genera recomendaciones de apuesta por sí sola.</div></div></section>
      <footer>18+ · Juego responsable · Herramienta de análisis, no asesoramiento financiero ni garantía de resultados.</footer>
    </main>
  </div>
}

function Stat({icon:Icon,label,value,detail}) { return <div className="stat"><div className="stat-icon"><Icon size={18}/></div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div> }

export default App;
