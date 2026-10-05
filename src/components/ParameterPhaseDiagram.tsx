import React, { useRef } from 'react';
import { HelixMetrics } from '../math/helixMath';

interface ParameterPhaseDiagramProps {
  metrics: HelixMetrics;
  onSelectKappaTau: (kappa: number, tau: number) => void;
}

export const ParameterPhaseDiagram: React.FC<ParameterPhaseDiagramProps> = ({
  metrics,
  onSelectKappaTau,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Coordinate mapping for (κ ∈ [0.05, 1.25], τ ∈ [-1.0, 1.0])
  const width = 320;
  const height = 200;
  const padL = 38;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const kMin = 0.05;
  const kMax = 1.25;
  const tMin = -1.0;
  const tMax = 1.0;

  const kToX = (k: number) => padL + ((k - kMin) / (kMax - kMin)) * plotW;
  const tToY = (t: number) => padT + ((tMax - t) / (tMax - tMin)) * plotH;

  const xToK = (x: number) => {
    const raw = kMin + ((x - padL) / plotW) * (kMax - kMin);
    return Number(Math.max(kMin, Math.min(kMax, raw)).toFixed(2));
  };

  const yToT = (y: number) => {
    const raw = tMax - ((y - padT) / plotH) * (tMax - tMin);
    return Number(Math.max(tMin, Math.min(tMax, raw)).toFixed(2));
  };

  const handlePointerEvent = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.buttons !== 1 && e.type !== 'pointerdown') return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const clientX = (e.clientX - rect.left) * scaleX;
    const clientY = (e.clientY - rect.top) * scaleY;
    onSelectKappaTau(xToK(clientX), yToT(clientY));
  };

  const curX = kToX(Math.min(kMax, Math.max(kMin, metrics.kappa)));
  const curY = tToY(Math.min(tMax, Math.max(tMin, metrics.tau)));
  const zeroY = tToY(0);
  const originX = kToX(kMin);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Interactive (κ, τ) Phase Space</span>
        <span className="font-mono tabular-nums text-slate-300">
          θ = {metrics.slopeAngleDeg >= 0 ? '+' : ''}
          {metrics.slopeAngleDeg.toFixed(1)}°
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          handlePointerEvent(e);
        }}
        onPointerMove={handlePointerEvent}
        className="w-full h-auto bg-[#0B1120] border border-slate-800 rounded-xl cursor-crosshair touch-none select-none"
        role="img"
        aria-label="Interactive Curvature Kappa vs Torsion Tau Phase Plane"
      >
        {[0.25, 0.5, 0.75, 1.0].map((kVal) => {
          const x = kToX(kVal);
          return (
            <g key={`k-${kVal}`}>
              <line
                x1={x}
                y1={padT}
                x2={x}
                y2={height - padB}
                stroke="#1E293B"
                strokeWidth="1"
              />
              <text
                x={x}
                y={height - 10}
                textAnchor="middle"
                className="fill-slate-500 text-[9px] font-mono"
              >
                {kVal.toFixed(2)}
              </text>
            </g>
          );
        })}

        {[-0.8, -0.4, 0, 0.4, 0.8].map((tVal) => {
          const y = tToY(tVal);
          return (
            <g key={`t-${tVal}`}>
              <line
                x1={padL}
                y1={y}
                x2={width - padR}
                y2={y}
                stroke={tVal === 0 ? '#334155' : '#1E293B'}
                strokeWidth={tVal === 0 ? '1.5' : '1'}
                strokeDasharray={tVal === 0 ? undefined : '2 2'}
              />
              <text
                x={padL - 6}
                y={y + 3}
                textAnchor="end"
                className="fill-slate-500 text-[9px] font-mono"
              >
                {tVal > 0 ? `+${tVal.toFixed(1)}` : tVal.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Isogonal Lancret Rays: τ = ±κ (45° pitch) */}
        <line
          x1={kToX(0.05)}
          y1={tToY(0.05)}
          x2={kToX(1.0)}
          y2={tToY(1.0)}
          stroke="#F59E0B"
          strokeOpacity="0.28"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
        <line
          x1={kToX(0.05)}
          y1={tToY(-0.05)}
          x2={kToX(1.0)}
          y2={tToY(-1.0)}
          stroke="#F59E0B"
          strokeOpacity="0.28"
          strokeWidth="1"
          strokeDasharray="4 3"
        />

        <text
          x={width - padR - 4}
          y={padT + 11}
          textAnchor="end"
          className="fill-slate-500 text-[9px] font-mono"
        >
          Right-Handed (τ &gt; 0)
        </text>
        <text
          x={width - padR - 4}
          y={zeroY - 4}
          textAnchor="end"
          className="fill-sky-400/70 text-[9px] font-mono"
        >
          Planar Circle (τ = 0)
        </text>
        <text
          x={width - padR - 4}
          y={height - padB - 6}
          textAnchor="end"
          className="fill-slate-500 text-[9px] font-mono"
        >
          Left-Handed (τ &lt; 0)
        </text>

        {/* Active Lancret Slope Triangle */}
        <polygon
          points={`${originX},${zeroY} ${curX},${zeroY} ${curX},${curY}`}
          fill="#38BDF8"
          fillOpacity="0.12"
        />
        <line
          x1={originX}
          y1={zeroY}
          x2={curX}
          y2={curY}
          stroke="#A855F7"
          strokeWidth="1.75"
        />
        <line
          x1={curX}
          y1={zeroY}
          x2={curX}
          y2={curY}
          stroke="#F59E0B"
          strokeWidth="1.5"
          strokeDasharray="2 2"
        />

        {/* Active (κ, τ) Handle */}
        <circle
          cx={curX}
          cy={curY}
          r="6"
          fill="#0B1120"
          stroke="#38BDF8"
          strokeWidth="2.5"
        />
        <circle cx={curX} cy={curY} r="2.2" fill="#F8FAFC" />

        <text
          x={padL + plotW / 2}
          y={height - 1}
          textAnchor="middle"
          className="fill-slate-400 text-[9px] font-mono"
        >
          Curvature κ →
        </text>
      </svg>
    </div>
  );
};
