import { useState, useMemo, useCallback, useRef } from "react";

// ─── Involute Gear Math ─────────────────────────────────────────────
function involute(angle) {
  return Math.tan(angle) - angle;
}

function inverseInvolute(y, tol = 1e-12) {
  let x = Math.pow(3 * y, 1 / 3);
  for (let i = 0; i < 50; i++) {
    const f = Math.tan(x) - x - y;
    const df = Math.tan(x) * Math.tan(x);
    const dx = f / df;
    x -= dx;
    if (Math.abs(dx) < tol) break;
  }
  return x;
}

function generateGearProfile(params) {
  const {
    numTeeth,
    module: m,
    pressureAngleDeg,
    clearanceCoeff,
    addendumCoeff,
    profileShift,
    centerHoleDia,
    resolution,
  } = params;

  const alpha = (pressureAngleDeg * Math.PI) / 180;
  const pitchRadius = (m * numTeeth) / 2;
  const baseRadius = pitchRadius * Math.cos(alpha);
  const addendum = m * (addendumCoeff + profileShift);
  const dedendum = m * (1 + clearanceCoeff - profileShift);
  const outerRadius = pitchRadius + addendum;
  const rootRadius = Math.max(pitchRadius - dedendum, baseRadius * 0.95);
  const toothAngle = (2 * Math.PI) / numTeeth;

  // Involute tooth profile points for one side
  function involutePoint(baseR, t) {
    const x = baseR * (Math.cos(t) + t * Math.sin(t));
    const y = baseR * (Math.sin(t) - t * Math.cos(t));
    return [x, y];
  }

  // Half-tooth angular width at pitch circle
  const invAlpha = involute(alpha);
  const halfToothAngle = Math.PI / (2 * numTeeth) + invAlpha + (2 * profileShift * Math.tan(alpha)) / numTeeth;

  // Max involute parameter (at outer radius)
  const tMax = Math.sqrt(Math.max(0, (outerRadius / baseRadius) ** 2 - 1));
  const tMin = rootRadius > baseRadius ? Math.sqrt(Math.max(0, (rootRadius / baseRadius) ** 2 - 1)) : 0;

  const steps = resolution;
  const points = [];

  for (let tooth = 0; tooth < numTeeth; tooth++) {
    const rotAngle = tooth * toothAngle;

    // Right flank (involute curve)
    const rightFlank = [];
    for (let i = 0; i <= steps; i++) {
      const t = tMin + (tMax - tMin) * (i / steps);
      const [ix, iy] = involutePoint(baseRadius, t);
      const invT = involute(Math.atan2(Math.sqrt(ix * ix + iy * iy - baseRadius * baseRadius), baseRadius));
      const angle = rotAngle + halfToothAngle - invT;
      const r = Math.sqrt(ix * ix + iy * iy);
      rightFlank.push([r * Math.cos(angle), r * Math.sin(angle)]);
    }

    // Left flank (mirror involute)
    const leftFlank = [];
    for (let i = steps; i >= 0; i--) {
      const t = tMin + (tMax - tMin) * (i / steps);
      const [ix, iy] = involutePoint(baseRadius, t);
      const r = Math.sqrt(ix * ix + iy * iy);
      const invT = involute(Math.atan2(Math.sqrt(r * r - baseRadius * baseRadius), baseRadius));
      const angle = rotAngle - halfToothAngle + invT;
      leftFlank.push([r * Math.cos(angle), r * Math.sin(angle)]);
    }

    // Tip arc between flanks
    const tipArc = [];
    const rightTipAngle = Math.atan2(rightFlank[rightFlank.length - 1][1], rightFlank[rightFlank.length - 1][0]);
    const leftTipAngle = Math.atan2(leftFlank[0][1], leftFlank[0][0]);

    let tipSpan = leftTipAngle - rightTipAngle;
    if (tipSpan < 0) tipSpan += 2 * Math.PI;
    if (tipSpan > toothAngle) tipSpan -= 2 * Math.PI;

    const tipSteps = Math.max(2, Math.round(steps / 3));
    for (let i = 1; i < tipSteps; i++) {
      const a = rightTipAngle + tipSpan * (i / tipSteps);
      tipArc.push([outerRadius * Math.cos(a), outerRadius * Math.sin(a)]);
    }

    // Root arc to next tooth
    const nextTooth = (tooth + 1) % numTeeth;
    const nextRotAngle = nextTooth * toothAngle;
    const nextHalfTooth = halfToothAngle;

    // End of left flank
    const leftEnd = leftFlank[leftFlank.length - 1];
    const leftEndAngle = Math.atan2(leftEnd[1], leftEnd[0]);

    // Start of next right flank
    const nextRightStart = [];
    const tStart = tMin;
    const [nix, niy] = involutePoint(baseRadius, tStart);
    const nr = Math.sqrt(nix * nix + niy * niy);
    const nInvT = involute(Math.atan2(Math.sqrt(nr * nr - baseRadius * baseRadius), baseRadius));
    const nextStartAngle = nextRotAngle + nextHalfTooth - nInvT;

    let rootSpan = nextStartAngle - leftEndAngle;
    if (rootSpan < 0) rootSpan += 2 * Math.PI;
    if (rootSpan > toothAngle) rootSpan -= 2 * Math.PI;

    const rootSteps = Math.max(2, Math.round(steps / 3));
    const rootArc = [];
    for (let i = 1; i < rootSteps; i++) {
      const a = leftEndAngle + rootSpan * (i / rootSteps);
      rootArc.push([rootRadius * Math.cos(a), rootRadius * Math.sin(a)]);
    }

    points.push(...rightFlank, ...tipArc, ...leftFlank, ...rootArc);
  }

  return {
    points,
    pitchRadius,
    baseRadius,
    outerRadius,
    rootRadius,
    toothAngle,
    centerHoleDia,
  };
}

function pointsToPath(points) {
  if (points.length === 0) return "";
  let d = `M ${points[0][0].toFixed(4)} ${points[0][1].toFixed(4)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i][0].toFixed(4)} ${points[i][1].toFixed(4)}`;
  }
  d += " Z";
  return d;
}

// ─── Gear Info Panel ────────────────────────────────────────────────
function GearInfo({ gear, params }) {
  const rows = [
    ["Teeth", params.numTeeth],
    ["Module", `${params.module.toFixed(2)} mm`],
    ["Pressure Angle", `${params.pressureAngleDeg}°`],
    ["Pitch Diameter", `${(gear.pitchRadius * 2).toFixed(3)} mm`],
    ["Base Diameter", `${(gear.baseRadius * 2).toFixed(3)} mm`],
    ["Outer Diameter", `${(gear.outerRadius * 2).toFixed(3)} mm`],
    ["Root Diameter", `${(gear.rootRadius * 2).toFixed(3)} mm`],
    ["Circular Pitch", `${(Math.PI * params.module).toFixed(3)} mm`],
    ["Diametral Pitch", `${(1 / params.module).toFixed(4)} /mm`],
    ["Tooth Thickness (pitch)", `${((Math.PI * params.module) / 2).toFixed(3)} mm`],
  ];

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">
        Calculated Properties
      </h3>
      <div className="space-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-gray-400">{label}</span>
            <span className="text-gray-100 font-mono">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Param Slider ───────────────────────────────────────────────────
function ParamSlider({ label, value, min, max, step, onChange, unit, tooltip }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="text-sm text-gray-300" title={tooltip}>
          {label}
        </label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(parseFloat(e.target.value) || min)}
            className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-0.5 text-sm text-right text-gray-100 font-mono focus:border-blue-500 focus:outline-none"
          />
          {unit && <span className="text-xs text-gray-500 w-6">{unit}</span>}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
    </div>
  );
}

// ─── SVG Export ──────────────────────────────────────────────────────
function exportSVG(gear, params) {
  const pad = 5;
  const size = gear.outerRadius * 2 + pad * 2;
  const path = pointsToPath(gear.points);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${size.toFixed(2)}mm" height="${size.toFixed(2)}mm"
     viewBox="${(-gear.outerRadius - pad).toFixed(4)} ${(-gear.outerRadius - pad).toFixed(4)} ${size.toFixed(4)} ${size.toFixed(4)}">
  <g fill="none" stroke="black" stroke-width="0.1">
    <!-- Gear outline -->
    <path d="${path}" />
    <!-- Center hole -->
    ${params.centerHoleDia > 0 ? `<circle cx="0" cy="0" r="${(params.centerHoleDia / 2).toFixed(4)}" />` : ""}
  </g>
</svg>`;

  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gear_${params.numTeeth}t_m${params.module}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportDXF(gear, params) {
  const pts = gear.points;
  let dxf = `0\nSECTION\n2\nENTITIES\n`;

  // Gear outline as LWPOLYLINE
  dxf += `0\nLWPOLYLINE\n8\n0\n70\n1\n90\n${pts.length}\n`;
  for (const [x, y] of pts) {
    dxf += `10\n${x.toFixed(6)}\n20\n${y.toFixed(6)}\n`;
  }

  // Center hole
  if (params.centerHoleDia > 0) {
    dxf += `0\nCIRCLE\n8\n0\n10\n0\n20\n0\n40\n${(params.centerHoleDia / 2).toFixed(6)}\n`;
  }

  dxf += `0\nENDSEC\n0\nEOF\n`;

  const blob = new Blob([dxf], { type: "application/dxf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gear_${params.numTeeth}t_m${params.module}.dxf`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Component ─────────────────────────────────────────────────
export default function GearGenerator() {
  const svgRef = useRef(null);

  const [params, setParams] = useState({
    numTeeth: 24,
    module: 3,
    pressureAngleDeg: 20,
    clearanceCoeff: 0.25,
    addendumCoeff: 1.0,
    profileShift: 0,
    centerHoleDia: 8,
    resolution: 30,
  });

  const [view, setView] = useState({
    showPitchCircle: true,
    showBaseCircle: false,
    showRootCircle: false,
    showOuterCircle: false,
    showCenterMark: true,
    darkGear: true,
  });

  const updateParam = useCallback((key, val) => {
    setParams((p) => ({ ...p, [key]: val }));
  }, []);

  const gear = useMemo(() => generateGearProfile(params), [params]);
  const gearPath = useMemo(() => pointsToPath(gear.points), [gear]);

  const viewBox = useMemo(() => {
    const pad = gear.outerRadius * 0.15;
    const r = gear.outerRadius + pad;
    return `${-r} ${-r} ${r * 2} ${r * 2}`;
  }, [gear.outerRadius]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 24 24" className="w-7 h-7 text-blue-400" fill="currentColor">
            <path d="M12 2a2.5 2.5 0 00-2.4 1.8L9 6.2l-2.5-1.5a2.5 2.5 0 00-3.4.9 2.5 2.5 0 00.4 3.2L5.8 11l-2.3 2.2a2.5 2.5 0 00-.4 3.2 2.5 2.5 0 003.4.9L9 15.8l.6 2.4A2.5 2.5 0 0012 20a2.5 2.5 0 002.4-1.8l.6-2.4 2.5 1.5a2.5 2.5 0 003.4-.9 2.5 2.5 0 00-.4-3.2L18.2 11l2.3-2.2a2.5 2.5 0 00.4-3.2 2.5 2.5 0 00-3.4-.9L15 6.2l-.6-2.4A2.5 2.5 0 0012 2zm0 5a4 4 0 110 8 4 4 0 010-8z" />
          </svg>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Involute Gear Generator</h1>
            <p className="text-xs text-gray-500">Parametric gear profile with involute tooth geometry</p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar controls */}
        <aside className="w-80 border-r border-gray-800 overflow-y-auto p-4 space-y-5 flex-shrink-0">
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Gear Parameters
            </h2>
            <div className="space-y-4">
              <ParamSlider label="Number of Teeth" value={params.numTeeth} min={6} max={120} step={1}
                onChange={(v) => updateParam("numTeeth", Math.round(v))}
                tooltip="Z — number of teeth on the gear" />
              <ParamSlider label="Module" value={params.module} min={0.5} max={10} step={0.1}
                onChange={(v) => updateParam("module", v)} unit="mm"
                tooltip="m — tooth size (pitch diameter / teeth)" />
              <ParamSlider label="Pressure Angle" value={params.pressureAngleDeg} min={14.5} max={30} step={0.5}
                onChange={(v) => updateParam("pressureAngleDeg", v)} unit="°"
                tooltip="α — angle of tooth contact force direction" />
              <ParamSlider label="Addendum Coeff" value={params.addendumCoeff} min={0.5} max={1.5} step={0.05}
                onChange={(v) => updateParam("addendumCoeff", v)}
                tooltip="ha* — addendum = ha* × module" />
              <ParamSlider label="Clearance Coeff" value={params.clearanceCoeff} min={0.1} max={0.5} step={0.05}
                onChange={(v) => updateParam("clearanceCoeff", v)}
                tooltip="c* — root clearance = c* × module" />
              <ParamSlider label="Profile Shift" value={params.profileShift} min={-0.5} max={0.5} step={0.05}
                onChange={(v) => updateParam("profileShift", v)}
                tooltip="x — profile shift coefficient" />
              <ParamSlider label="Center Hole Dia" value={params.centerHoleDia} min={0} max={50} step={0.5}
                onChange={(v) => updateParam("centerHoleDia", v)} unit="mm"
                tooltip="Bore diameter for the shaft" />
              <ParamSlider label="Curve Resolution" value={params.resolution} min={8} max={60} step={1}
                onChange={(v) => updateParam("resolution", Math.round(v))}
                tooltip="Points per involute curve segment" />
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Display Options
            </h2>
            <div className="space-y-2">
              {[
                ["showPitchCircle", "Pitch Circle", "#f59e0b"],
                ["showBaseCircle", "Base Circle", "#3b82f6"],
                ["showRootCircle", "Root Circle", "#ef4444"],
                ["showOuterCircle", "Outer Circle", "#10b981"],
                ["showCenterMark", "Center Mark", "#9ca3af"],
              ].map(([key, label, color]) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={view[key]}
                    onChange={() => setView((v) => ({ ...v, [key]: !v[key] }))}
                    className="rounded accent-blue-500"
                  />
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  <span className="text-gray-300">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <GearInfo gear={gear} params={params} />

          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Export
            </h2>
            <div className="space-y-2">
              <button
                onClick={() => exportSVG(gear, params)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Download SVG (Laser Cut)
              </button>
              <button
                onClick={() => exportDXF(gear, params)}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Download DXF
              </button>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Gear Tooth Basics</h3>
            <div className="text-xs text-gray-400 space-y-1.5 leading-relaxed">
              <p><strong className="text-gray-300">Module (m)</strong> = pitch diameter / teeth. Defines tooth size. Meshing gears must share the same module.</p>
              <p><strong className="text-gray-300">Pressure Angle (α)</strong> = angle of the tooth contact force. Standard: 20°. Higher values give stronger but noisier teeth.</p>
              <p><strong className="text-gray-300">Involute Profile</strong> — the curve traced by unwinding a string from the base circle. Ensures constant velocity ratio between meshing gears.</p>
              <p><strong className="text-gray-300">Addendum</strong> = tooth height above pitch circle. <strong className="text-gray-300">Dedendum</strong> = depth below it.</p>
              <p><strong className="text-gray-300">Profile Shift</strong> — shifts the cutter to avoid undercut (when teeth &lt; 17 at 20°) or adjust center distance.</p>
            </div>
          </div>
        </aside>

        {/* Viewport */}
        <main className="flex-1 relative overflow-hidden bg-gray-900">
          <svg
            ref={svgRef}
            viewBox={viewBox}
            className="w-full h-full"
            style={{ background: "radial-gradient(circle, #1a1a2e 0%, #0d0d1a 100%)" }}
          >
            {/* Grid */}
            <defs>
              <pattern id="grid" width={params.module * 5} height={params.module * 5} patternUnits="userSpaceOnUse">
                <path
                  d={`M ${params.module * 5} 0 L 0 0 0 ${params.module * 5}`}
                  fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.2"
                />
              </pattern>
            </defs>
            <rect x="-9999" y="-9999" width="19998" height="19998" fill="url(#grid)" />

            {/* Reference circles */}
            {view.showRootCircle && (
              <circle cx={0} cy={0} r={gear.rootRadius} fill="none"
                stroke="#ef4444" strokeWidth="0.3" strokeDasharray="2 2" opacity={0.5} />
            )}
            {view.showBaseCircle && (
              <circle cx={0} cy={0} r={gear.baseRadius} fill="none"
                stroke="#3b82f6" strokeWidth="0.3" strokeDasharray="3 2" opacity={0.5} />
            )}
            {view.showPitchCircle && (
              <circle cx={0} cy={0} r={gear.pitchRadius} fill="none"
                stroke="#f59e0b" strokeWidth="0.4" strokeDasharray="4 3" opacity={0.6} />
            )}
            {view.showOuterCircle && (
              <circle cx={0} cy={0} r={gear.outerRadius} fill="none"
                stroke="#10b981" strokeWidth="0.3" strokeDasharray="2 2" opacity={0.5} />
            )}

            {/* Gear body */}
            <path
              d={gearPath}
              fill={view.darkGear ? "rgba(30, 64, 175, 0.15)" : "none"}
              stroke="#60a5fa"
              strokeWidth="0.5"
              strokeLinejoin="round"
            />

            {/* Center hole */}
            {params.centerHoleDia > 0 && (
              <circle cx={0} cy={0} r={params.centerHoleDia / 2}
                fill={view.darkGear ? "#0d0d1a" : "none"}
                stroke="#60a5fa" strokeWidth="0.5" />
            )}

            {/* Center mark */}
            {view.showCenterMark && (
              <g stroke="#9ca3af" strokeWidth="0.2" opacity={0.5}>
                <line x1={-gear.outerRadius * 0.08} y1={0} x2={gear.outerRadius * 0.08} y2={0} />
                <line x1={0} y1={-gear.outerRadius * 0.08} x2={0} y2={gear.outerRadius * 0.08} />
              </g>
            )}
          </svg>

          {/* Corner info overlay */}
          <div className="absolute top-3 left-3 bg-gray-950/80 backdrop-blur-sm rounded px-3 py-2 text-xs text-gray-400 font-mono border border-gray-800">
            <div>Z={params.numTeeth} &nbsp; m={params.module} &nbsp; α={params.pressureAngleDeg}°</div>
            <div>OD={( gear.outerRadius * 2).toFixed(2)}mm &nbsp; PD={(gear.pitchRadius * 2).toFixed(2)}mm</div>
          </div>
        </main>
      </div>
    </div>
  );
}