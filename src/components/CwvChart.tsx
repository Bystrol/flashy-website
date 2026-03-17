import { useRef, useState } from "react";

export interface CwvDataPoint {
  date: string;
  technology: string;
  pct: number;
}

interface Props {
  data: CwvDataPoint[];
}

const TECH_COLORS: Record<string, string> = {
  Astro: "#8d18f3",
  WordPress: "#ffffff",
  "Next.js": "#22d3ee",
  "Nuxt.js": "#00dc82",
  Gatsby: "#f59e0b",
};

const CHART_W = 373;
const CHART_H = 424;
const Y_MIN = 0;
const Y_MAX = 80;

export default function CwvChart({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    tech: string;
    pct: number;
    date: string;
  } | null>(null);
  const [hoveredTech, setHoveredTech] = useState<string | null>(null);

  // Group data by technology
  const techMap = new Map<string, { date: string; pct: number }[]>();
  for (const d of data) {
    if (!techMap.has(d.technology)) techMap.set(d.technology, []);
    techMap.get(d.technology)!.push({ date: d.date, pct: d.pct });
  }

  // Sort each series by date
  for (const series of techMap.values()) {
    series.sort((a, b) => a.date.localeCompare(b.date));
  }

  // Collect all unique dates for x-axis mapping
  const allDates = [...new Set(data.map((d) => d.date))].sort();
  const dateToX = (date: string) => {
    const idx = allDates.indexOf(date);
    return (idx / (allDates.length - 1)) * CHART_W;
  };
  const pctToY = (pct: number) => {
    return CHART_H - ((pct - Y_MIN) / (Y_MAX - Y_MIN)) * CHART_H;
  };

  // Build path for each tech
  const techPaths: { tech: string; d: string; color: string; points: { x: number; y: number; date: string; pct: number }[] }[] = [];
  for (const [tech, series] of techMap) {
    const color = TECH_COLORS[tech] ?? "#888";
    const points = series.map((s) => ({
      x: dateToX(s.date),
      y: pctToY(s.pct),
      date: s.date,
      pct: s.pct,
    }));
    const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    techPaths.push({ tech, d, color, points });
  }

  // Astro fill area path
  const astroSeries = techPaths.find((t) => t.tech === "Astro");
  const firstAstroPoint = astroSeries?.points[0];
  const lastAstroPoint = astroSeries?.points.at(-1);
  const astroFillD = astroSeries && firstAstroPoint && lastAstroPoint
    ? `${astroSeries.d} L${lastAstroPoint.x},${CHART_H} L${firstAstroPoint.x},${CHART_H} Z`
    : "";

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * CHART_W;
    const mouseY = ((e.clientY - rect.top) / rect.height) * CHART_H;

    // Find closest point across all techs
    let closest: { tech: string; x: number; y: number; pct: number; date: string; dist: number } | null = null;
    for (const { tech, points } of techPaths) {
      for (const p of points) {
        const dist = Math.hypot(p.x - mouseX, p.y - mouseY);
        if (!closest || dist < closest.dist) {
          closest = { tech, x: p.x, y: p.y, pct: p.pct, date: p.date, dist };
        }
      }
    }

    if (closest && closest.dist < 30) {
      setTooltip({ x: closest.x, y: closest.y, tech: closest.tech, pct: closest.pct, date: closest.date });
      setHoveredTech(closest.tech);
    } else {
      setTooltip(null);
      setHoveredTech(null);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        preserveAspectRatio="none"
        style={{ display: "block", width: "100%", height: "100%", overflow: "visible" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setTooltip(null); setHoveredTech(null); }}
      >
        {/* Grid lines */}
        {Array.from({ length: 9 }, (_, i) => {
          const y = (i / 8) * CHART_H;
          return <line key={i} x1={0} y1={y} x2={CHART_W} y2={y} stroke="white" strokeOpacity={0.1} />;
        })}

        {/* Astro fill area */}
        {astroFillD && (
          <path
            d={astroFillD}
            fill="url(#astroGradient)"
            opacity={hoveredTech && hoveredTech !== "Astro" ? 0.15 : 0.4}
            style={{ transition: "opacity 0.2s" }}
          />
        )}

        {/* Lines */}
        {techPaths.map(({ tech, d, color }) => (
          <path
            key={tech}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={tech === "Astro" ? 2.5 : 1.5}
            opacity={hoveredTech && hoveredTech !== tech ? 0.2 : 1}
            style={{ transition: "opacity 0.2s" }}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Hover indicator */}
        {tooltip && (
          <circle
            cx={tooltip.x}
            cy={tooltip.y}
            r={4}
            fill={TECH_COLORS[tooltip.tech] ?? "#888"}
            stroke="white"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        )}

        <defs>
          <linearGradient id="astroGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8d18f3" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#8d18f3" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: "absolute",
            left: `${(tooltip.x / CHART_W) * 100}%`,
            top: `${(tooltip.y / CHART_H) * 100}%`,
            transform: "translate(-50%, -140%)",
            background: "rgba(0, 0, 0, 0.85)",
            border: `1px solid ${TECH_COLORS[tooltip.tech] ?? "#888"}`,
            borderRadius: 8,
            padding: "6px 10px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: TECH_COLORS[tooltip.tech] ?? "#888",
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <span style={{ color: "white", fontSize: 13, fontWeight: 600 }}>{tooltip.tech}</span>
          </div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>
            {formatDate(tooltip.date)} · {tooltip.pct}% good CWV
          </div>
        </div>
      )}
    </div>
  );
}
