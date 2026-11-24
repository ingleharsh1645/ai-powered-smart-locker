import { useEffect, useRef, useState } from 'react';
import lottie, { type AnimationItem } from 'lottie-web';

// Self-contained Lottie JSON with complete bezier tangents for lottie-web
const SIRI_ROBOT_LOTTIE_DATA = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 60,
  w: 120,
  h: 120,
  nm: 'LockerBotOrb',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'OuterPulseRing',
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 0, s: [50], e: [15], i: { x: [0.42], y: [1] }, o: { x: [0.58], y: [0] } },
            { t: 30, s: [15], e: [50], i: { x: [0.42], y: [1] }, o: { x: [0.58], y: [0] } },
            { t: 60, s: [50] },
          ],
        },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [60, 60, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            {
              t: 0,
              s: [84, 84, 100],
              e: [110, 110, 100],
              i: { x: [0.42, 0.42, 0.42], y: [1, 1, 1] },
              o: { x: [0.58, 0.58, 0.58], y: [0, 0, 0] },
            },
            {
              t: 30,
              s: [110, 110, 100],
              e: [84, 84, 100],
              i: { x: [0.42, 0.42, 0.42], y: [1, 1, 1] },
              o: { x: [0.58, 0.58, 0.58], y: [0, 0, 0] },
            },
            { t: 60, s: [84, 84, 100] },
          ],
        },
      },
      shapes: [
        {
          ty: 'el',
          p: { a: 0, k: [0, 0] },
          s: { a: 0, k: [92, 92] },
          nm: 'RingEllipse',
        },
        {
          ty: 'st',
          c: { a: 0, k: [0.22, 0.74, 0.97, 1] },
          o: { a: 0, k: 100 },
          w: { a: 0, k: 4 },
          nm: 'RingStroke',
        },
      ],
      ip: 0,
      op: 60,
      st: 0,
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: 'RobotHead',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: {
          a: 1,
          k: [
            {
              t: 0,
              s: [60, 62, 0],
              e: [60, 56, 0],
              i: { x: 0.42, y: 1 },
              o: { x: 0.58, y: 0 },
            },
            {
              t: 30,
              s: [60, 56, 0],
              e: [60, 62, 0],
              i: { x: 0.42, y: 1 },
              o: { x: 0.58, y: 0 },
            },
            { t: 60, s: [60, 62, 0] },
          ],
        },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      shapes: [
        {
          ty: 'rc',
          d: 1,
          s: { a: 0, k: [64, 54] },
          p: { a: 0, k: [0, 0] },
          r: { a: 0, k: 18 },
          nm: 'HeadShell',
        },
        {
          ty: 'fl',
          c: { a: 0, k: [0.11, 0.31, 0.85, 1] },
          o: { a: 0, k: 100 },
          nm: 'HeadFill',
        },
        {
          ty: 'rc',
          d: 1,
          s: { a: 0, k: [48, 30] },
          p: { a: 0, k: [0, 0] },
          r: { a: 0, k: 10 },
          nm: 'Visor',
        },
        {
          ty: 'fl',
          c: { a: 0, k: [0.06, 0.09, 0.16, 1] },
          o: { a: 0, k: 100 },
          nm: 'VisorFill',
        },
      ],
      ip: 0,
      op: 60,
      st: 0,
    },
    {
      ddd: 0,
      ind: 3,
      ty: 4,
      nm: 'Eyes',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: {
          a: 1,
          k: [
            {
              t: 0,
              s: [60, 62, 0],
              e: [60, 56, 0],
              i: { x: 0.42, y: 1 },
              o: { x: 0.58, y: 0 },
            },
            {
              t: 30,
              s: [60, 56, 0],
              e: [60, 62, 0],
              i: { x: 0.42, y: 1 },
              o: { x: 0.58, y: 0 },
            },
            { t: 60, s: [60, 62, 0] },
          ],
        },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            {
              t: 0,
              s: [100, 100, 100],
              e: [100, 100, 100],
              i: { x: [0.5, 0.5, 0.5], y: [1, 1, 1] },
              o: { x: [0.5, 0.5, 0.5], y: [0, 0, 0] },
            },
            {
              t: 24,
              s: [100, 100, 100],
              e: [100, 20, 100],
              i: { x: [0.5, 0.5, 0.5], y: [1, 1, 1] },
              o: { x: [0.5, 0.5, 0.5], y: [0, 0, 0] },
            },
            {
              t: 27,
              s: [100, 20, 100],
              e: [100, 100, 100],
              i: { x: [0.5, 0.5, 0.5], y: [1, 1, 1] },
              o: { x: [0.5, 0.5, 0.5], y: [0, 0, 0] },
            },
            { t: 60, s: [100, 100, 100] },
          ],
        },
      },
      shapes: [
        {
          ty: 'el',
          p: { a: 0, k: [-11, -1] },
          s: { a: 0, k: [10, 10] },
          nm: 'LeftEye',
        },
        {
          ty: 'el',
          p: { a: 0, k: [11, -1] },
          s: { a: 0, k: [10, 10] },
          nm: 'RightEye',
        },
        {
          ty: 'fl',
          c: { a: 0, k: [0.22, 0.74, 0.97, 1] },
          o: { a: 0, k: 100 },
          nm: 'EyeGlow',
        },
      ],
      ip: 0,
      op: 60,
      st: 0,
    },
    {
      ddd: 0,
      ind: 4,
      ty: 4,
      nm: 'AntennaOrb',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: {
          a: 1,
          k: [
            {
              t: 0,
              s: [60, 25, 0],
              e: [60, 19, 0],
              i: { x: 0.42, y: 1 },
              o: { x: 0.58, y: 0 },
            },
            {
              t: 30,
              s: [60, 19, 0],
              e: [60, 25, 0],
              i: { x: 0.42, y: 1 },
              o: { x: 0.58, y: 0 },
            },
            { t: 60, s: [60, 25, 0] },
          ],
        },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      shapes: [
        {
          ty: 'el',
          p: { a: 0, k: [0, 0] },
          s: { a: 0, k: [10, 10] },
          nm: 'Orb',
        },
        {
          ty: 'fl',
          c: { a: 0, k: [0.96, 0.62, 0.04, 1] },
          o: { a: 0, k: 100 },
          nm: 'OrbFill',
        },
      ],
      ip: 0,
      op: 60,
      st: 0,
    },
  ],
};

export function LottieRobot({
  size = 54,
  speed = 1,
  active = false,
}: {
  size?: number;
  speed?: number;
  active?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<AnimationItem | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    try {
      animRef.current = lottie.loadAnimation({
        container: el,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: JSON.parse(JSON.stringify(SIRI_ROBOT_LOTTIE_DATA)),
      });
    } catch {
      setFallback(true);
    }

    return () => {
      try {
        animRef.current?.destroy();
      } catch {
        // ignore cleanup error
      }
    };
  }, []);

  useEffect(() => {
    if (animRef.current) {
      animRef.current.setSpeed(active ? 1.8 : speed);
    }
  }, [active, speed]);

  if (fallback) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        className="pointer-events-none select-none"
        aria-hidden="true"
      >
        <circle cx="60" cy="60" r="46" fill="none" stroke="#38BDF8" strokeWidth="4" opacity="0.5" />
        <rect x="28" y="34" width="64" height="54" rx="18" fill="#1D4ED8" />
        <rect x="36" y="46" width="48" height="30" rx="10" fill="#0F172A" />
        <circle cx="49" cy="60" r="5" fill="#38BDF8" />
        <circle cx="71" cy="60" r="5" fill="#38BDF8" />
        <circle cx="60" cy="22" r="5" fill="#F59E0B" />
      </svg>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ width: size, height: size }}
      className="pointer-events-none select-none"
      aria-hidden="true"
    />
  );
}
