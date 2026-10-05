export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface FrenetFrame {
  /** Point on the curve r(s) in mathematical coordinates (x, y, z where z is vertical axis) */
  position: Vec3;
  /** Unit Tangent vector T(s) = dr/ds */
  T: Vec3;
  /** Principal Normal vector N(s) = (dT/ds) / ||dT/ds|| */
  N: Vec3;
  /** Binormal vector B(s) = T(s) x N(s) */
  B: Vec3;
  /** Darboux angular velocity vector ω = τT + κB */
  darboux: Vec3;
  /** Center of the osculating circle C(s) = r(s) + (1/κ) N(s) */
  osculatingCenter: Vec3;
  /** Phase angle t in radians */
  phaseRad: number;
}

export interface HelixMetrics {
  /** Curvature κ (1 / length) */
  kappa: number;
  /** Torsion τ (1 / length) */
  tau: number;
  /** Squared magnitude κ² + τ² */
  omegaSq: number;
  /** Total angular speed ω = sqrt(κ² + τ²) = ||ω_Darboux|| */
  omega: number;
  /** Cylinder radius a = κ / (κ² + τ²) */
  cylinderRadius: number;
  /** Rise rate per radian b = τ / (κ² + τ²) */
  pitchRate: number;
  /** Vertical pitch per full 2π revolution P = 2π |b| */
  pitchPerTurn: number;
  /** Radius of curvature (osculating circle radius) R = 1 / κ */
  osculatingRadius: number;
  /** Lancret ratio τ / κ = b / a = cot(α) */
  lancretRatio: number;
  /** Helix slope angle θ = arctan(tau / kappa) in degrees relative to horizontal xy-plane */
  slopeAngleDeg: number;
  /** Axis angle α = arccos(b / sqrt(a² + b²)) in degrees relative to vertical cylinder axis */
  axisAngleDeg: number;
  /** Chirality classification */
  chirality: 'Right-Handed (τ > 0)' | 'Planar Circle (τ = 0)' | 'Left-Handed (τ < 0)';
  /** Short classification code for accessible non-color state signaling */
  regimeLabel: string;
}

export interface LearningStage {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  kappa: number;
  tau: number;
  arcLength: number;
  keyInsight: string;
  formulaFocus: string;
}

export const LEARNING_STAGES: LearningStage[] = [
  {
    id: 'planar-circle',
    number: '01',
    title: 'Planar Circle Limit',
    subtitle: 'Zero Torsion (τ = 0, κ = 0.50)',
    kappa: 0.5,
    tau: 0.0,
    arcLength: 26,
    keyInsight:
      'When torsion τ = 0, the binormal vector B remains completely constant along the curve. With zero out-of-plane twisting, the helix collapses into a flat circle of radius a = 1/κ = 2.00 in the horizontal xy-plane, and the osculating circle coincides with the curve itself.',
    formulaFocus: 'τ = 0  ⇒  b = 0,  a = R = 1/κ',
  },
  {
    id: 'balanced-helix',
    number: '02',
    title: 'Canonical Right-Handed Helix',
    subtitle: 'Balanced Curvature & Torsion (κ = 0.45, τ = 0.30)',
    kappa: 0.45,
    tau: 0.3,
    arcLength: 32,
    keyInsight:
      'Positive torsion (τ > 0) pulls the curve upward out of its osculating plane according to the right-hand rule. Because κ and τ are constant, the tangent vector T maintains a fixed angle with the vertical axis (Lancret’s Theorem: τ/κ = cot α).',
    formulaFocus: 'a = κ/(κ² + τ²),  b = τ/(κ² + τ²)',
  },
  {
    id: 'equal-partition',
    number: '03',
    title: 'Isogonal 45° Pitch Regime',
    subtitle: 'Equal Curvature & Torsion (κ = 0.40, τ = 0.40)',
    kappa: 0.4,
    tau: 0.4,
    arcLength: 32,
    keyInsight:
      'When κ = τ, the Lancret ratio τ/κ equals exactly 1.00. The cylinder radius a and vertical rise rate b are identical (a = b = 1/(2κ)), so the helix climbs at a constant 45° inclination everywhere along the bounding cylinder.',
    formulaFocus: 'τ / κ = 1.00  ⇒  θ = 45.0°,  R = 2a',
  },
  {
    id: 'high-torsion',
    number: '04',
    title: 'Torsion-Dominated Steep Helix',
    subtitle: 'High Axial Twist (κ = 0.25, τ = 0.70)',
    kappa: 0.25,
    tau: 0.7,
    arcLength: 30,
    keyInsight:
      'Counterintuitively, increasing torsion τ while holding curvature κ fixed makes the bounding cylinder narrower (a decreases) while stretching the osculating circle radius R = 1/κ much wider than the cylinder itself.',
    formulaFocus: 'τ ≫ κ  ⇒  a ≪ R = 1/κ',
  },
  {
    id: 'left-handed',
    number: '05',
    title: 'Left-Handed Chirality',
    subtitle: 'Negative Torsion Inversion (κ = 0.45, τ = -0.35)',
    kappa: 0.45,
    tau: -0.35,
    arcLength: 32,
    keyInsight:
      'Flipping the sign of torsion (τ < 0) reverses the handedness (chirality) of the helix into a mirror-image left-handed coil. Notice that the cylinder radius a and osculating radius R = 1/κ remain invariant under τ → −τ.',
    formulaFocus: 'dB/ds = −τ N  (Opposite binormal rotation)',
  },
];

/**
 * Computes exact differential geometry invariants for a circular helix
 * specified by curvature κ > 0 and torsion τ.
 */
export function computeHelixMetrics(kappaInput: number, tauInput: number): HelixMetrics {
  const kappa = Math.max(0.05, kappaInput);
  const tau = Math.abs(tauInput) < 1e-4 ? 0 : tauInput;

  const omegaSq = kappa * kappa + tau * tau;
  const omega = Math.sqrt(omegaSq);

  const cylinderRadius = kappa / omegaSq;
  const pitchRate = tau / omegaSq;
  const pitchPerTurn = 2 * Math.PI * Math.abs(pitchRate);
  const osculatingRadius = 1 / kappa;

  const lancretRatio = tau / kappa;
  const slopeAngleRad = Math.atan2(tau, kappa);
  const slopeAngleDeg = (slopeAngleRad * 180) / Math.PI;

  // Angle with the positive vertical z-axis: cos(α) = b / sqrt(a² + b²) = τ / ω
  const axisAngleRad = Math.acos(Math.max(-1, Math.min(1, tau / omega)));
  const axisAngleDeg = (axisAngleRad * 180) / Math.PI;

  let chirality: HelixMetrics['chirality'] = 'Planar Circle (τ = 0)';
  let regimeLabel = '● PLANAR (τ = 0)';

  if (tau > 0) {
    chirality = 'Right-Handed (τ > 0)';
    regimeLabel =
      tau > kappa * 1.15
        ? '▲ STEEP RIGHT-HANDED'
        : tau < kappa * 0.35
          ? '◆ SHALLOW RIGHT-HANDED'
          : '● BALANCED RIGHT-HANDED';
  } else if (tau < 0) {
    chirality = 'Left-Handed (τ < 0)';
    regimeLabel =
      Math.abs(tau) > kappa * 1.15
        ? '▼ STEEP LEFT-HANDED'
        : Math.abs(tau) < kappa * 0.35
          ? '◆ SHALLOW LEFT-HANDED'
          : '● BALANCED LEFT-HANDED';
  }

  return {
    kappa,
    tau,
    omegaSq,
    omega,
    cylinderRadius,
    pitchRate,
    pitchPerTurn,
    osculatingRadius,
    lancretRatio,
    slopeAngleDeg,
    axisAngleDeg,
    chirality,
    regimeLabel,
  };
}

/**
 * Evaluates the point r(s) and Frenet-Serret frame (T, N, B) at arc-length s.
 * Mathematical coordinates: (x, y) is horizontal plane, z is vertical axis.
 * Parameterization by phase t = ω * s:
 *   r(s) = (a cos t, a sin t, b t)
 */
export function evaluateFrenetFrame(
  metrics: HelixMetrics,
  arcLengthS: number
): FrenetFrame {
  const { kappa, tau, omega, cylinderRadius: a, pitchRate: b, osculatingRadius: R } = metrics;
  const t = omega * arcLengthS;
  const cosT = Math.cos(t);
  const sinT = Math.sin(t);

  // Position r(s) = <a cos t, a sin t, b t>
  const position: Vec3 = {
    x: a * cosT,
    y: a * sinT,
    z: b * t,
  };

  // Since sqrt(a^2 + b^2) = 1 / omega:
  // T(s) = dr/ds = omega * <-a sin t, a cos t, b> = <-(kappa/omega) sin t, (kappa/omega) cos t, tau/omega>
  const kOverOmega = kappa / omega;
  const tauOverOmega = tau / omega;

  const T: Vec3 = {
    x: -kOverOmega * sinT,
    y: kOverOmega * cosT,
    z: tauOverOmega,
  };

  // Principal Normal N(s) points radially inward toward the z-axis:
  // N(s) = <-cos t, -sin t, 0>
  const N: Vec3 = {
    x: -cosT,
    y: -sinT,
    z: 0,
  };

  // Binormal B(s) = T(s) x N(s) = <(tau/omega) sin t, -(tau/omega) cos t, kappa/omega>
  const B: Vec3 = {
    x: tauOverOmega * sinT,
    y: -tauOverOmega * cosT,
    z: kOverOmega,
  };

  // Darboux vector ω_D = τ T + κ B = (0, 0, ω)
  const darboux: Vec3 = {
    x: tau * T.x + kappa * B.x,
    y: tau * T.y + kappa * B.y,
    z: tau * T.z + kappa * B.z,
  };

  // Center of the osculating circle: C(s) = r(s) + R * N(s)
  const osculatingCenter: Vec3 = {
    x: position.x + R * N.x,
    y: position.y + R * N.y,
    z: position.z + R * N.z,
  };

  return {
    position,
    T,
    N,
    B,
    darboux,
    osculatingCenter,
    phaseRad: t,
  };
}
