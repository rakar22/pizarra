export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={className ?? "text-xs leading-relaxed text-faint"}>
      18+. Juego responsable. Pizarra es una herramienta de análisis: el modelo Poisson, el Scout y el
      filtro de Crear Apuesta no predicen el futuro ni constituyen consejo de apuestas. Las cuotas
      proceden de mercados públicos o se marcan como justas del modelo — nunca se fingen cuotas Bet365.
      Nunca apuestes dinero que no puedas permitirte perder.
    </p>
  );
}
