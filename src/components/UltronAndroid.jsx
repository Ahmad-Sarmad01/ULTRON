function UltronAndroid({ state = "idle" }) {
  const outerTicks = Array.from({ length: 36 }, (_, i) => i * 10);
  const orbitAngles = [0, 120, 240];

  return (
    <svg
      className={`android-figure state-${state}`}
      viewBox="0 0 320 320"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* =====================================================
            PURPLE ENERGY
        ===================================================== */}

        <radialGradient id="ultronCoreEnergy">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="18%" stopColor="#ead7ff" />
          <stop offset="42%" stopColor="#c084fc" />
          <stop offset="68%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#4c1d95" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="ultronCoreGlass">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="35%" stopColor="#c084fc" stopOpacity="0.14" />
          <stop offset="75%" stopColor="#7c3aed" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#160b27" stopOpacity="0.02" />
        </radialGradient>

        <linearGradient
          id="ultronArcGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="35%" stopColor="#c084fc" stopOpacity="0.8" />
          <stop offset="70%" stopColor="#8b5cf6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4c1d95" stopOpacity="0.05" />
        </linearGradient>

        <linearGradient
          id="ultronScanGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor="#c084fc" stopOpacity="0" />
          <stop offset="45%" stopColor="#d8b4fe" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>

        {/* =====================================================
            FILTERS
        ===================================================== */}

        <filter id="ultronGlow">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="ultronSoftGlow">
          <feGaussianBlur stdDeviation="10" />
        </filter>

        <filter id="ultronCoreGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* =====================================================
          AMBIENT ENERGY FIELD
      ===================================================== */}

      <circle
        className="android-aura"
        cx="160"
        cy="160"
        r="132"
      />

      <circle
        className="android-aura-soft"
        cx="160"
        cy="160"
        r="105"
      />

      {/* =====================================================
          HUD CORNER MARKERS
      ===================================================== */}

      <g className="core-corner-system">
        <path d="M28 52 V28 H52" />
        <path d="M268 28 H292 V52" />
        <path d="M292 268 V292 H268" />
        <path d="M52 292 H28 V268" />
      </g>

      {/* tiny corner status marks */}

      <g className="core-status-markers">
        <circle cx="38" cy="62" r="2" />
        <circle cx="282" cy="62" r="2" />
        <circle cx="282" cy="258" r="2" />
        <circle cx="38" cy="258" r="2" />
      </g>

      {/* =====================================================
          CENTER CROSSHAIR
      ===================================================== */}

      <g className="core-crosshair-system">
        <line x1="160" y1="8" x2="160" y2="28" />
        <line x1="160" y1="292" x2="160" y2="312" />

        <line x1="8" y1="160" x2="28" y2="160" />
        <line x1="292" y1="160" x2="312" y2="160" />

        <circle cx="160" cy="160" r="3" />
      </g>

      {/* =====================================================
          OUTER DATA RING
      ===================================================== */}

      <g className="core-data-ring">
        <circle
          className="core-ring-track"
          cx="160"
          cy="160"
          r="126"
        />

        {outerTicks.map((angle) => {
          const major = angle % 30 === 0;

          return (
            <line
              key={angle}
              className={
                major
                  ? "core-tick core-tick-major"
                  : "core-tick"
              }
              x1="160"
              y1={major ? "126" : "130"}
              x2="160"
              y2={major ? "116" : "124"}
              transform={`rotate(${angle} 160 160)`}
            />
          );
        })}
      </g>

      {/* =====================================================
          SEGMENTED ENERGY ARCS
      ===================================================== */}

      <g className="core-energy-arcs">
        <circle
          className="energy-arc arc-one"
          cx="160"
          cy="160"
          r="112"
        />

        <circle
          className="energy-arc arc-two"
          cx="160"
          cy="160"
          r="103"
        />

        <circle
          className="energy-arc arc-three"
          cx="160"
          cy="160"
          r="92"
        />
      </g>

      {/* =====================================================
          ORBITAL NODES
      ===================================================== */}

      <g className="core-orbit-system">
        {orbitAngles.map((angle) => (
          <g
            key={angle}
            transform={`rotate(${angle} 160 160)`}
          >
            <circle
              className="orbit-line-node"
              cx="160"
              cy="67"
              r="3"
            />

            <circle
              className="orbit-node-glow"
              cx="160"
              cy="67"
              r="7"
            />

            <line
              className="orbit-node-line"
              x1="160"
              y1="73"
              x2="160"
              y2="82"
            />
          </g>
        ))}
      </g>

      {/* =====================================================
          INNER GLASS CHAMBER
      ===================================================== */}

      <circle
        className="core-glass-shell"
        cx="160"
        cy="160"
        r="69"
      />

      <circle
        className="core-glass-shell-inner"
        cx="160"
        cy="160"
        r="60"
      />

      {/* =====================================================
          INNER ROTATING ENERGY SYSTEM
      ===================================================== */}

      <g className="inner-energy-system">
        <path
          className="inner-energy-arc"
          d="M160 91 A69 69 0 0 1 220 125"
        />

        <path
          className="inner-energy-arc"
          d="M229 160 A69 69 0 0 1 194 219"
        />

        <path
          className="inner-energy-arc"
          d="M160 229 A69 69 0 0 1 100 195"
        />

        <path
          className="inner-energy-arc"
          d="M91 160 A69 69 0 0 1 126 101"
        />
      </g>

      {/* =====================================================
          CORE ENERGY FIELD
      ===================================================== */}

      <circle
        className="android-core-field"
        cx="160"
        cy="160"
        r="48"
        fill="url(#ultronCoreEnergy)"
        filter="url(#ultronSoftGlow)"
      />

      <circle
        className="android-core-glass"
        cx="160"
        cy="160"
        r="42"
        fill="url(#ultronCoreGlass)"
      />

      {/* =====================================================
          CENTRAL GEOMETRIC NUCLEUS
      ===================================================== */}

      <g className="core-nucleus">
        <rect
          className="nucleus-outer"
          x="139"
          y="139"
          width="42"
          height="42"
          rx="8"
          transform="rotate(45 160 160)"
        />

        <rect
          className="nucleus-inner"
          x="147"
          y="147"
          width="26"
          height="26"
          rx="5"
          transform="rotate(45 160 160)"
        />

        <circle
          className="nucleus-center"
          cx="160"
          cy="160"
          r="7"
        />

        <circle
          className="nucleus-highlight"
          cx="157"
          cy="157"
          r="2"
        />
      </g>

      {/* =====================================================
          SCANNING SWEEP
      ===================================================== */}

      <g className="core-scan-system">
        <path
          className="core-scan-line"
          d="M88 160 H232"
        />

        <circle
          className="core-scan-point"
          cx="160"
          cy="160"
          r="4"
        />
      </g>

      {/* =====================================================
          SPEAKING WAVEFORM
      ===================================================== */}

      <g className="core-eq">
        <rect
          className="core-eq-bar"
          x="137"
          y="246"
          width="3"
          height="8"
        />

        <rect
          className="core-eq-bar"
          x="146"
          y="242"
          width="3"
          height="16"
        />

        <rect
          className="core-eq-bar"
          x="155"
          y="238"
          width="3"
          height="24"
        />

        <rect
          className="core-eq-bar"
          x="164"
          y="238"
          width="3"
          height="24"
        />

        <rect
          className="core-eq-bar"
          x="173"
          y="242"
          width="3"
          height="16"
        />

        <rect
          className="core-eq-bar"
          x="182"
          y="246"
          width="3"
          height="8"
        />
      </g>
    </svg>
  );
}

export default UltronAndroid;