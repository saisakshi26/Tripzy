import type { ReactNode } from 'react';

/**
 * Original, hand-drawn SVG landscapes — one per destination — used as the artwork
 * underneath real photos (and as the graceful fallback when no photo is available).
 */

interface Palette {
  sky: [string, string, string];
  sun: [number, number, number, string];
  far: string;
  mid: string;
  near: string;
  ground: [string, string];
}

const PALETTES: Record<string, Palette> = {
  kerala: { sky: ['#1d2e2b', '#8d7a55', '#f1c48b'], sun: [560, 318, 54, '#ffe0a8'], far: '#26423b', mid: '#1b3029', near: '#10201b', ground: ['#2f5a52', '#13211d'] },
  goa: { sky: ['#3b1c2a', '#b5563a', '#ffb468'], sun: [400, 330, 78, '#ffd89a'], far: '#5b2a35', mid: '#3a1a22', near: '#1d0e12', ground: ['#7a3a3a', '#2a1316'] },
  rajasthan: { sky: ['#4a2217', '#c4733f', '#f6c98b'], sun: [610, 250, 60, '#ffe7b8'], far: '#8c4a2c', mid: '#6a3520', near: '#3a1b10', ground: ['#b9773f', '#4b2412'] },
  meghalaya: { sky: ['#20312f', '#6f8a7a', '#cfd9c3'], sun: [250, 190, 46, '#f3f1d8'], far: '#46614f', mid: '#2f4a3b', near: '#1a2d22', ground: ['#2c4a3a', '#13241b'] },
  maharashtra: { sky: ['#2a2036', '#a2603f', '#f0b277'], sun: [180, 320, 50, '#ffd9a0'], far: '#4a3335', mid: '#33232a', near: '#1b1218', ground: ['#3b5a66', '#142129'] },
  telangana: { sky: ['#3a1d1b', '#b0623f', '#f2b87a'], sun: [130, 230, 52, '#ffe1ab'], far: '#6a3a2c', mid: '#4a2a22', near: '#25120f', ground: ['#8a5036', '#2d1710'] },
  tamilnadu: { sky: ['#2e1d17', '#b4793a', '#f6cf8e'], sun: [650, 200, 56, '#fff0c4'], far: '#6a4529', mid: '#4a2f1c', near: '#241409', ground: ['#8a6234', '#2b1a0c'] },
  karnataka: { sky: ['#321f1a', '#c0794a', '#f7c88c'], sun: [560, 300, 62, '#ffe6b6'], far: '#7a4b34', mid: '#573624', near: '#2c190f', ground: ['#a56a41', '#3a1f12'] },
};

const palm = (x: number, y: number, s: number, c: string) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} stroke={c} fill="none" strokeLinecap="round">
    <path d="M0 0 C6 -60 4 -110 -6 -160" strokeWidth="7" />
    <path d="M-6 -160 C-40 -176 -70 -160 -92 -128 M-6 -160 C-30 -190 -62 -196 -96 -184 M-6 -160 C10 -196 42 -204 78 -190 M-6 -160 C30 -170 64 -156 88 -122 M-6 -160 C-4 -192 -12 -214 -30 -230" strokeWidth="5" />
  </g>
);

function Art({ id, p }: { id: string; p: Palette }): ReactNode {
  switch (id) {
    case 'goa':
      return (
        <>
          <rect y="352" width="800" height="120" fill={`url(#sea-${id})`} />
          <g stroke="#ffd9a0" strokeOpacity=".35" strokeWidth="2">{[372, 392, 414, 440].map((y, i) => <path key={y} d={`M${80 + i * 40} ${y} h${200 - i * 18}`} />)}</g>
          <path d="M0 470 C160 450 300 478 460 462 S700 452 800 468 V600 H0Z" fill={p.ground[0]} />
          <path d="M0 520 C200 500 420 540 800 510 V600 H0Z" fill={p.ground[1]} />
          {palm(110, 520, 1.15, p.near)}
          {palm(700, 530, 1.3, p.near)}
          <path d="M470 470 l30 -34 l30 34z M486 470 v20 h28 v-20" fill={p.near} />
        </>
      );
    case 'rajasthan':
      return (
        <>
          <path d="M0 400 C120 360 240 380 330 360 L330 330 h14 v-16 h16 v16 h14 v-34 h14 v34 h14 v-16 h16 v16 h14 v-24 h14 v24 h60 v14 h20 l0 -40 q18 -30 36 0 v40 h26 v-26 h14 v26 h30 v-22 h14 v22 C640 380 720 392 800 380 V600 H0Z" fill={p.mid} />
          <path d="M395 336 q22 -44 44 0z" fill={p.near} />
          <g fill={p.near}>{[0, 1, 2, 3].map((i) => <rect key={i} x={352 + i * 54} y={374} width="9" height="22" rx="4" />)}</g>
          <path d="M0 470 C140 430 300 500 470 470 S720 440 800 470 V600 H0Z" fill={p.ground[0]} />
          <path d="M0 540 C200 500 420 560 800 520 V600 H0Z" fill={p.ground[1]} />
        </>
      );
    case 'meghalaya':
      return (
        <>
          <path d="M0 330 C100 280 200 320 300 290 S520 250 640 300 S760 290 800 310 V600 H0Z" fill={p.far} />
          <path d="M0 400 C120 350 250 400 360 360 S560 330 700 380 L800 360 V600 H0Z" fill={p.mid} />
          <rect x="468" y="342" width="16" height="170" rx="8" fill="#e6efe4" opacity=".9" />
          <rect x="482" y="352" width="8" height="150" rx="4" fill="#e6efe4" opacity=".55" />
          <ellipse cx="478" cy="520" rx="46" ry="12" fill="#e6efe4" opacity=".45" />
          <path d="M0 470 C180 430 360 500 560 462 S740 440 800 460 V600 H0Z" fill={p.near} />
          <path d="M120 540 C220 490 330 490 430 540" stroke="#8fae78" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray="1 12" />
          <g fill="#fff" opacity=".22"><ellipse cx="180" cy="250" rx="110" ry="14" /><ellipse cx="600" cy="220" rx="130" ry="12" /></g>
        </>
      );
    case 'maharashtra':
      return (
        <>
          <rect y="440" width="800" height="160" fill={`url(#sea-${id})`} />
          <path d="M240 440 C330 330 420 290 520 280 C620 270 700 330 800 400 V440 Z" fill={p.mid} />
          <path d="M470 300 h12 v-14 h12 v14 h12 v-14 h12 v14 h12 v-14 h12 v14 h12 v-14 h12 v14 h14 v26 h-98z" fill={p.near} />
          <path d="M430 330 q12 -22 24 0z M560 322 q12 -22 24 0z" fill={p.near} />
          <path d="M0 500 C140 480 280 520 440 500 S700 490 800 505 V600 H0Z" fill={p.near} />
          <path d="M120 470 l40 0 l-8 14 h-24z M142 470 v-26 l22 20z" fill={p.near} opacity=".9" />
          <g stroke="#ffd9a0" strokeOpacity=".3" strokeWidth="2">{[462, 478].map((y) => <path key={y} d={`M${140 + (y - 462) * 3} ${y} h120`} />)}</g>
        </>
      );
    case 'telangana':
      return (
        <>
          <path d="M0 430 H800 V600 H0Z" fill={p.mid} />
          <g fill={p.near}>
            <rect x="300" y="330" width="200" height="110" />
            <path d="M345 440 v-60 q55 -40 110 0 v60z" fill={p.mid} />
            {[290, 480].map((x) => (
              <g key={x}>
                <rect x={x} y="248" width="30" height="192" />
                <rect x={x - 4} y="296" width="38" height="8" />
                <rect x={x - 4} y="340" width="38" height="8" />
                <path d={`M${x + 2} 248 q13 -42 26 0z`} />
                <rect x={x + 13} y="196" width="4" height="12" />
              </g>
            ))}
            <path d="M380 330 q20 -34 40 0z" />
          </g>
          <path d="M0 500 C200 480 400 520 800 490 V600 H0Z" fill={p.near} />
          <g fill="#ffcf8a" opacity=".85">{[330, 360, 440, 470].map((x) => <rect key={x} x={x} y="360" width="8" height="14" rx="4" />)}</g>
        </>
      );
    case 'tamilnadu':
      return (
        <>
          <path d="M0 440 H800 V600 H0Z" fill={p.mid} />
          <g fill={p.near}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <path key={i} d={`M${400 - (130 - i * 18)} ${440 - i * 34} h${(130 - i * 18) * 2} v-30 h${-(130 - i * 18) * 2}z`} />
            ))}
            <rect x="388" y="196" width="24" height="26" />
            <path d="M386 196 q14 -36 28 0z" />
          </g>
          <g fill={p.mid} opacity=".85">
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={i}>{[-1, 0, 1].map((k) => <rect key={k} x={394 + k * (34 - i * 5)} y={410 - i * 34} width="12" height="14" rx="6" />)}</g>
            ))}
          </g>
          <rect y="470" width="800" height="130" fill={`url(#sea-${id})`} opacity=".9" />
          <path d="M90 470 l8 -60 l8 60 M670 470 l8 -60 l8 60" stroke={p.near} strokeWidth="6" />
          {palm(130, 480, 0.9, p.near)}
          {palm(690, 480, 1, p.near)}
        </>
      );
    case 'karnataka':
      return (
        <>
          <path d="M0 400 C150 360 300 410 460 380 S700 350 800 390 V600 H0Z" fill={p.far} />
          <g fill={p.mid}>
            <ellipse cx="170" cy="420" rx="120" ry="80" />
            <ellipse cx="270" cy="396" rx="70" ry="58" />
            <ellipse cx="640" cy="414" rx="130" ry="86" />
            <ellipse cx="560" cy="380" rx="68" ry="52" />
          </g>
          <g fill={p.near}>
            <rect x="330" y="392" width="150" height="14" />
            {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={338 + i * 32} y="406" width="14" height="70" />)}
            <path d="M322 392 h166 l-18 -22 h-130z" />
          </g>
          <path d="M0 490 C200 470 420 510 800 480 V600 H0Z" fill={p.near} />
          <ellipse cx="90" cy="500" rx="64" ry="38" fill={p.mid} />
          <ellipse cx="720" cy="505" rx="80" ry="40" fill={p.mid} />
        </>
      );
    default:
      // kerala — backwaters at dusk
      return (
        <>
          <path d="M0 340 Q120 306 240 332 T480 326 T800 338 V420 H0Z" fill={p.far} />
          <rect y="352" width="800" height="150" fill={`url(#sea-${id})`} />
          <g stroke="#ffe0a8" strokeOpacity=".4" strokeWidth="3" strokeLinecap="round">{[372, 392, 416, 444].map((y, i) => <path key={y} d={`M${500 + i * 8} ${y} h${90 - i * 14}`} />)}</g>
          <path d="M330 440 h170 l-22 22 h-130z" fill={p.near} />
          <path d="M350 440 q70 -48 140 0z" fill={p.mid} />
          <path d="M0 470 C100 450 160 480 220 486 L0 520Z" fill={p.near} />
          <path d="M800 480 C720 460 670 490 620 500 L800 540Z" fill={p.near} />
          {palm(70, 500, 1.2, p.near)}
          {palm(140, 506, 0.9, p.near)}
          {palm(730, 520, 1.1, p.near)}
          <path d="M0 540 C200 520 420 560 800 530 V600 H0Z" fill={p.near} />
        </>
      );
  }
}

export default function Scene({ id, className = '' }: { id: string; className?: string }) {
  const key = PALETTES[id] ? id : 'kerala';
  const p = PALETTES[key];
  const uid = key; // gradient ids only need to be unique per scene type, identical scenes share identical defs
  return (
    <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} />
          <stop offset="0.55" stopColor={p.sky[1]} />
          <stop offset="1" stopColor={p.sky[2]} />
        </linearGradient>
        <linearGradient id={`sea-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.ground[0]} />
          <stop offset="1" stopColor={p.ground[1]} />
        </linearGradient>
        <radialGradient id={`sun-${uid}`}>
          <stop offset="0" stopColor={p.sun[3]} stopOpacity="1" />
          <stop offset="0.45" stopColor={p.sun[3]} stopOpacity="0.55" />
          <stop offset="1" stopColor={p.sun[3]} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="600" fill={`url(#sky-${uid})`} />
      <circle cx={p.sun[0]} cy={p.sun[1]} r={p.sun[2] * 3.2} fill={`url(#sun-${uid})`} />
      <circle cx={p.sun[0]} cy={p.sun[1]} r={p.sun[2]} fill={p.sun[3]} opacity=".92" />
      <Art id={key} p={p} />
    </svg>
  );
}
