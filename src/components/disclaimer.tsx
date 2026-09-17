export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={className ?? "text-xs leading-relaxed text-faint"}>
      18+. Juego responsable. Pizarra es una herramienta de análisis: el modelo Poisson y el Scout
      no predicen el futuro ni constituyen consejo de apuestas. Las cuotas proceden de mercados
      públicos y pueden cambiar. Nunca apuestes dinero que no puedas permitirte perder.
    </p>
  );
}
