import React, { useState, useMemo } from 'react';
import {
  computeHelixMetrics,
  evaluateFrenetFrame,
  LEARNING_STAGES,
  LearningStage,
} from './math/helixMath';
import {
  HelixViewport3D,
  CameraPreset,
  LayerVisibility,
} from './components/HelixViewport3D';
import { ParameterPhaseDiagram } from './components/ParameterPhaseDiagram';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react';

type DeckSection = 'controls' | 'stages' | 'frenet' | 'theory';

export default function App() {
  const [kappa, setKappa] = useState<number>(0.45);
  const [tau, setTau] = useState<number>(0.3);
  const [arcLengthS, setArcLengthS] = useState<number>(0.0);
  const [maxArcLength, setMaxArcLength] = useState<number>(32);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('isometric');
  const [activeSection, setActiveSection] = useState<DeckSection>('controls');
  const [activeStageId, setActiveStageId] = useState<string>('balanced-helix');

  const [layers, setLayers] = useState<LayerVisibility>({
    frenetTrihedron: true,
    osculatingCircle: true,
    osculatingPlane: true,
    normalPlane: false,
    rectifyingPlane: false,
    boundingCylinder: true,
    darbouxVector: false,
  });

  const metrics = useMemo(() => computeHelixMetrics(kappa, tau), [kappa, tau]);
  const currentFrame = useMemo(
    () => evaluateFrenetFrame(metrics, arcLengthS),
    [metrics, arcLengthS]
  );

  const handleApplyStage = (stage: LearningStage) => {
    setActiveStageId(stage.id);
    setKappa(stage.kappa);
    setTau(stage.tau);
    setMaxArcLength(stage.arcLength);
  };

  const handleResetAll = () => {
    setKappa(0.45);
    setTau(0.3);
    setArcLengthS(0);
    setMaxArcLength(32);
    setCameraPreset('isometric');
    setActiveStageId('balanced-helix');
  };

  const toggleLayer = (key: keyof LayerVisibility) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const activeStage =
    LEARNING_STAGES.find((s) => s.id === activeStageId) || LEARNING_STAGES[1];

  return (
    <div className="min-h-screen lg:h-screen w-full bg-[#0B1120] text-[#F8FAFC] flex flex-col lg:overflow-hidden">
      {/* Top Bar Contract: Strictly 1 Row, 3 Zones */}
      <header className="h-13 shrink-0 flex items-center justify-between px-4 sm:px-6 border-b border-slate-800/90 bg-[#0B1120]/95 backdrop-blur-md z-30">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveSection('controls');
          }}
          className="font-serif-display text-lg sm:text-xl font-semibold tracking-tight text-white whitespace-nowrap"
        >
          HelixLab
        </a>

        <nav
          aria-label="Simulation Modes"
          className="flex items-center gap-4 sm:gap-7 text-xs sm:text-sm font-medium text-slate-400 overflow-x-auto no-scrollbar"
        >
          {(
            [
              { id: 'controls', label: 'Parameters' },
              { id: 'stages', label: 'Guided Stages' },
              { id: 'frenet', label: 'Frenet Matrix' },
              { id: 'theory', label: 'Lancret Theorem' },
            ] as { id: DeckSection; label: string }[]
          ).map((nav) => (
            <button
              key={nav.id}
              type="button"
              onClick={() => setActiveSection(nav.id)}
              className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 focus-visible:outline-2 focus-visible:outline-sky-400 ${
                activeSection === nav.id
                  ? 'text-white border-sky-400 font-semibold'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {nav.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-300"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pause Frame</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">Animate Frame</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleResetAll}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors whitespace-nowrap hidden sm:flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </header>

      {/* Main Two-Zone Educational Sandbox Layout */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left / Top Zone: Interactive 3D Three.js Stage */}
        <section
          aria-label="3D Differential Geometry Stage"
          className="w-full h-[52vh] sm:h-[56vh] lg:h-full lg:flex-1 relative border-b lg:border-b-0 lg:border-r border-slate-800/90 shrink-0"
        >
          <HelixViewport3D
            metrics={metrics}
            arcLengthS={arcLengthS}
            maxArcLength={maxArcLength}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            layers={layers}
            cameraPreset={cameraPreset}
            onSelectCameraPreset={setCameraPreset}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            onChangeArcLengthS={setArcLengthS}
            onResetAll={handleResetAll}
          />
        </section>

        {/* Right / Bottom Zone: Parameter Sliders & Analysis Deck */}
        <aside
          aria-label="Helix Parameter Controls and Differential Geometry Analysis"
          className="w-full lg:w-[440px] xl:w-[480px] shrink-0 bg-[#0F172A] lg:h-full lg:overflow-y-auto divide-y divide-slate-800/80"
        >
          <div className="p-5 sm:p-6 space-y-5">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Intrinsic Space Curve Equations</span>
                <span className="font-mono tabular-nums text-sky-400">
                  ω = √(κ² + τ²) = {metrics.omega.toFixed(3)}
                </span>
              </div>
              <h1
                className="text-xl sm:text-2xl font-semibold text-white tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                Curvature (κ) &amp; Torsion (τ) Explorer
              </h1>
            </div>

            {/* Slider 1: Curvature κ */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <label
                  htmlFor="slider-kappa"
                  className="text-sm font-semibold text-slate-100 flex items-center gap-2"
                >
                  <span>Curvature κ (Kappa)</span>
                  <span className="text-xs font-normal text-slate-400">
                    · Bending in osculating plane
                  </span>
                </label>
                <span className="font-mono text-sm font-semibold text-rose-400 tabular-nums whitespace-nowrap">
                  κ = {kappa.toFixed(2)} m⁻¹
                </span>
              </div>

              <input
                id="slider-kappa"
                type="range"
                min={0.08}
                max={1.25}
                step={0.01}
                value={kappa}
                onChange={(e) => setKappa(parseFloat(e.target.value))}
                className="helix-slider text-rose-400 bg-slate-800"
              />

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums">
                <span>0.08 (Gentle Arc)</span>
                <span className="text-slate-300">
                  Osculating Radius R = 1/κ = {metrics.osculatingRadius.toFixed(2)} m
                </span>
                <span>1.25 (Tight Coil)</span>
              </div>
            </div>

            {/* Slider 2: Torsion τ */}
            <div className="space-y-2 pt-1">
              <div className="flex items-baseline justify-between gap-2">
                <label
                  htmlFor="slider-tau"
                  className="text-sm font-semibold text-slate-100 flex items-center gap-2"
                >
                  <span>Torsion τ (Tau)</span>
                  <span className="text-xs font-normal text-slate-400">
                    · Out-of-plane binormal twist
                  </span>
                </label>
                <span className="font-mono text-sm font-semibold text-amber-400 tabular-nums whitespace-nowrap">
                  τ = {tau >= 0 ? '+' : ''}
                  {tau.toFixed(2)} m⁻¹
                </span>
              </div>

              <input
                id="slider-tau"
                type="range"
                min={-1.0}
                max={1.0}
                step={0.01}
                value={tau}
                onChange={(e) => setTau(parseFloat(e.target.value))}
                className="helix-slider text-amber-400 bg-slate-800"
              />

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums">
                <span>-1.00 (Left-Handed)</span>
                <button
                  type="button"
                  onClick={() => setTau(0)}
                  className="text-sky-400 hover:underline cursor-pointer"
                >
                  Set τ = 0 (Planar Circle)
                </button>
                <span>+1.00 (Right-Handed)</span>
              </div>
            </div>

            {/* Secondary Controls: Arc Length L & Traversal Speed */}
            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="slider-arclength" className="text-slate-400">
                    Curve Span L
                  </label>
                  <span className="font-mono tabular-nums text-slate-200">
                    {maxArcLength} m
                  </span>
                </div>
                <input
                  id="slider-arclength"
                  type="range"
                  min={12}
                  max={60}
                  step={2}
                  value={maxArcLength}
                  onChange={(e) => setMaxArcLength(parseFloat(e.target.value))}
                  className="helix-slider text-sky-400 bg-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="slider-speed" className="text-slate-400">
                    Traversal Speed
                  </label>
                  <span className="font-mono tabular-nums text-slate-200">
                    {playbackSpeed.toFixed(1)}×
                  </span>
                </div>
                <input
                  id="slider-speed"
                  type="range"
                  min={0.2}
                  max={2.5}
                  step={0.1}
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  className="helix-slider text-emerald-400 bg-slate-800"
                />
              </div>
            </div>
          </div>

          {activeSection === 'controls' && (
            <>
              {/* 3D Geometric Overlays & Planes */}
              <div className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-white">
                    3D Geometric Apparatus Overlays
                  </h2>
                  <span className="text-xs text-slate-400">Toggle active 3D helpers</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      {
                        key: 'frenetTrihedron',
                        label: 'Frenet Trihedron (T, N, B)',
                        accent: 'text-emerald-400',
                      },
                      {
                        key: 'osculatingCircle',
                        label: 'Osculating Circle (R=1/κ)',
                        accent: 'text-rose-400',
                      },
                      {
                        key: 'osculatingPlane',
                        label: 'Osculating Plane (T×N)',
                        accent: 'text-rose-300',
                      },
                      {
                        key: 'boundingCylinder',
                        label: 'Cylinder Wall (r = a)',
                        accent: 'text-sky-400',
                      },
                      {
                        key: 'normalPlane',
                        label: 'Normal Plane (N×B)',
                        accent: 'text-sky-300',
                      },
                      {
                        key: 'rectifyingPlane',
                        label: 'Rectifying Plane (T×B)',
                        accent: 'text-emerald-300',
                      },
                      {
                        key: 'darbouxVector',
                        label: 'Darboux Vector (ω=τT+κB)',
                        accent: 'text-purple-300',
                      },
                    ] as { key: keyof LayerVisibility; label: string; accent: string }[]
                  ).map((item) => {
                    const active = layers[item.key];
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => toggleLayer(item.key)}
                        className={`px-3 py-2 rounded-lg text-left text-xs font-medium border transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                          active
                            ? 'bg-slate-800/90 border-sky-500/40 text-white'
                            : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        {active ? (
                          <Eye className={`w-3.5 h-3.5 shrink-0 ${item.accent}`} />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interactive 2D Phase Diagram & Derived Invariants */}
              <div className="p-5 sm:p-6 space-y-4">
                <ParameterPhaseDiagram
                  metrics={metrics}
                  onSelectKappaTau={(k, t) => {
                    setKappa(k);
                    setTau(t);
                  }}
                />

                <div className="pt-2 space-y-2.5">
                  <div className="text-xs font-semibold text-slate-300">
                    Derived Differential Geometry Invariants
                  </div>
                  <dl className="divide-y divide-slate-800/70 text-xs font-mono tabular-nums">
                    <div className="py-1.5 flex items-center justify-between">
                      <dt className="text-slate-400 font-sans">
                        Cylinder Radius a = κ / (κ² + τ²)
                      </dt>
                      <dd className="text-slate-100 font-semibold">
                        {metrics.cylinderRadius.toFixed(3)} m
                      </dd>
                    </div>
                    <div className="py-1.5 flex items-center justify-between">
                      <dt className="text-slate-400 font-sans">
                        Rise Rate b = τ / (κ² + τ²)
                      </dt>
                      <dd className="text-slate-100 font-semibold">
                        {metrics.pitchRate >= 0 ? '+' : ''}
                        {metrics.pitchRate.toFixed(3)} m/rad
                      </dd>
                    </div>
                    <div className="py-1.5 flex items-center justify-between">
                      <dt className="text-slate-400 font-sans">
                        Vertical Pitch P = 2π|b|
                      </dt>
                      <dd className="text-slate-100 font-semibold">
                        {metrics.pitchPerTurn.toFixed(3)} m/turn
                      </dd>
                    </div>
                    <div className="py-1.5 flex items-center justify-between">
                      <dt className="text-slate-400 font-sans">
                        Osculating Radius R = 1/κ = a + b²/a
                      </dt>
                      <dd className="text-rose-300 font-semibold">
                        {metrics.osculatingRadius.toFixed(3)} m
                      </dd>
                    </div>
                    <div className="py-1.5 flex items-center justify-between">
                      <dt className="text-slate-400 font-sans">
                        Lancret Slope Angle θ = arctan(τ/κ)
                      </dt>
                      <dd className="text-amber-300 font-semibold">
                        {metrics.slopeAngleDeg >= 0 ? '+' : ''}
                        {metrics.slopeAngleDeg.toFixed(2)}°
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </>
          )}

          {activeSection === 'stages' && (
            <div className="p-5 sm:p-6 space-y-4">
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-white">
                  Guided Discovery Stages
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Step through five canonical regimes to observe how curvature κ and torsion τ
                  jointly sculpt the space curve in ℝ³.
                </p>
              </div>

              <div className="space-y-2.5">
                {LEARNING_STAGES.map((stage) => {
                  const isSelected = stage.id === activeStageId;
                  return (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => handleApplyStage(stage)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800/90 border-sky-500/60'
                          : 'bg-slate-900/40 border-slate-800/90 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span className="font-mono text-sky-400 font-semibold">
                          {stage.number}. {stage.subtitle}
                        </span>
                        <ChevronRight
                          className={`w-4 h-4 transition-transform ${
                            isSelected ? 'text-sky-400 translate-x-0.5' : 'text-slate-600'
                          }`}
                        />
                      </div>
                      <div className="text-sm font-semibold text-white mb-1.5">
                        {stage.title}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed mb-2">
                        {stage.keyInsight}
                      </p>
                      <div className="text-[11px] font-mono text-amber-300 tabular-nums pt-1.5 border-t border-slate-800">
                        {stage.formulaFocus}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeSection === 'frenet' && (
            <div className="p-5 sm:p-6 space-y-5">
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-white">
                  Live Frenet-Serret Apparatus
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  As a point traverses the helix at unit speed with respect to arc length s,
                  the orthonormal frame &#123;T, N, B&#125; obeys the skew-symmetric matrix ODE:
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0B1120] border border-slate-800 font-mono text-xs tabular-nums space-y-3">
                <div className="text-slate-400 text-[11px]">
                  d/ds [T, N, B]ᵀ = M(κ, τ) · [T, N, B]ᵀ
                </div>

                <div className="grid grid-cols-4 items-center gap-2 text-center py-2 border-y border-slate-800/80">
                  <div className="text-left space-y-2 font-semibold">
                    <div className="text-emerald-400">dT/ds =</div>
                    <div className="text-sky-400">dN/ds =</div>
                    <div className="text-amber-400">dB/ds =</div>
                  </div>
                  <div className="space-y-2 text-slate-500">
                    <div>0</div>
                    <div className="text-rose-400 font-semibold">
                      -{metrics.kappa.toFixed(2)}
                    </div>
                    <div>0</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-rose-400 font-semibold">
                      +{metrics.kappa.toFixed(2)}
                    </div>
                    <div className="text-slate-500">0</div>
                    <div className="text-amber-400 font-semibold">
                      {-metrics.tau >= 0 ? '+' : ''}
                      {(-metrics.tau).toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-2 text-slate-500">
                    <div>0</div>
                    <div className="text-amber-400 font-semibold">
                      {metrics.tau >= 0 ? '+' : ''}
                      {metrics.tau.toFixed(2)}
                    </div>
                    <div>0</div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  Notice the skew-symmetry (Mᵀ = -M): curvature κ couples{' '}
                  <span className="text-emerald-400 font-medium">T</span> and{' '}
                  <span className="text-sky-400 font-medium">N</span> in the osculating plane,
                  while torsion τ couples <span className="text-sky-400 font-medium">N</span> and{' '}
                  <span className="text-amber-400 font-medium">B</span>.
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">
                    Instantaneous Frame at s = {arcLengthS.toFixed(2)}
                  </span>
                  <span className="font-mono text-slate-400 tabular-nums">
                    t = {currentFrame.phaseRad.toFixed(2)} rad
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0B1120] border border-slate-800 font-mono text-xs tabular-nums space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">r(s)</span>
                    <span className="text-slate-200">
                      ⟨{currentFrame.position.x.toFixed(2)},{' '}
                      {currentFrame.position.y.toFixed(2)},{' '}
                      {currentFrame.position.z.toFixed(2)}⟩
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-semibold">T(s) Tangent</span>
                    <span className="text-emerald-300">
                      ⟨{currentFrame.T.x.toFixed(2)}, {currentFrame.T.y.toFixed(2)},{' '}
                      {currentFrame.T.z.toFixed(2)}⟩
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sky-400 font-semibold">N(s) Normal</span>
                    <span className="text-sky-300">
                      ⟨{currentFrame.N.x.toFixed(2)}, {currentFrame.N.y.toFixed(2)},{' '}
                      {currentFrame.N.z.toFixed(2)}⟩
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400 font-semibold">B(s) Binormal</span>
                    <span className="text-amber-300">
                      ⟨{currentFrame.B.x.toFixed(2)}, {currentFrame.B.y.toFixed(2)},{' '}
                      {currentFrame.B.z.toFixed(2)}⟩
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-purple-300 font-semibold">ω Darboux</span>
                    <span className="text-purple-200">
                      ⟨{currentFrame.darboux.x.toFixed(2)},{' '}
                      {currentFrame.darboux.y.toFixed(2)},{' '}
                      {currentFrame.darboux.z.toFixed(2)}⟩
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'theory' && (
            <div className="p-5 sm:p-6 space-y-4">
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-white">
                  Lancret’s Theorem &amp; Inverse Bijection
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  A space curve is a generalized helix (its tangent T makes a constant angle α
                  with a fixed axis) if and only if the ratio of torsion to curvature is
                  constant:
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#0B1120] border border-slate-800 space-y-2.5 font-mono text-xs tabular-nums">
                <div className="text-amber-300 font-semibold">
                  τ / κ = b / a = cot(α) = tan(θ) = {metrics.lancretRatio.toFixed(3)}
                </div>
                <div className="text-slate-300">
                  Axis Angle α = {metrics.axisAngleDeg.toFixed(1)}° · Slope θ ={' '}
                  {metrics.slopeAngleDeg.toFixed(1)}°
                </div>
                <div className="pt-2 border-t border-slate-800 text-slate-400 font-sans leading-relaxed">
                  For a circular helix r(t) = ⟨a cos t, a sin t, b t⟩, forward differentiation
                  yields κ = a/(a²+b²) and τ = b/(a²+b²). Inverting this system gives:
                </div>
                <div className="text-sky-300">
                  a = κ / (κ² + τ²) = {metrics.cylinderRadius.toFixed(3)}
                </div>
                <div className="text-sky-300">
                  b = τ / (κ² + τ²) = {metrics.pitchRate.toFixed(3)}
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                <div className="font-semibold text-white">
                  Why does increasing τ shrink the cylinder radius a?
                </div>
                <p className="text-slate-400">
                  When curvature κ is held fixed at {metrics.kappa.toFixed(2)}, the radius of
                  the osculating circle R = 1/κ = {metrics.osculatingRadius.toFixed(2)} is
                  locked. Adding torsion τ tilts the curve more steeply along the vertical
                  axis, so the helix must wind around a tighter cylinder of radius a ={' '}
                  {metrics.cylinderRadius.toFixed(2)} to maintain the same local bending κ.
                </p>
              </div>
            </div>
          )}

          {/* Active Stage Callout Footer */}
          <div className="p-5 sm:p-6 bg-[#0B1120]/60 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Current Regime Note</span>
              <button
                type="button"
                onClick={() =>
                  setActiveSection(activeSection === 'stages' ? 'controls' : 'stages')
                }
                className="text-sky-400 hover:underline cursor-pointer"
              >
                {activeSection === 'stages' ? 'Back to Controls' : 'Explore 5 Stages →'}
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {activeStage.keyInsight}
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
