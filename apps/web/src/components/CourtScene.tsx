/** Brand illustration built from table-tennis geometry. No external image dependency. */
export function CourtScene(){return <svg className="court-scene" viewBox="0 0 640 440" fill="none" aria-hidden="true">
 <defs><linearGradient id="table-face" x1="130" y1="40" x2="520" y2="370" gradientUnits="userSpaceOnUse"><stop stopColor="#4961e9"/><stop offset="1" stopColor="#243cca"/></linearGradient><radialGradient id="ball-light" cx=".3" cy=".2"><stop stopColor="#fffef4"/><stop offset=".75" stopColor="#efede2"/><stop offset="1" stopColor="#c3c3b9"/></radialGradient><pattern id="rubber-grain" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".9" fill="#73291e" opacity=".25"/></pattern><filter id="court-shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="20" stdDeviation="18" floodOpacity=".19"/></filter></defs>
 <ellipse cx="338" cy="371" rx="235" ry="24" fill="#181f73" opacity=".16"/>
 <g transform="rotate(-14 325 245)" filter="url(#court-shadow)">
  <rect x="80" y="102" width="475" height="253" rx="8" fill="#182e9c"/>
  <rect x="80" y="92" width="475" height="253" rx="8" fill="url(#table-face)"/>
  <path d="M93 105H542V332H93V105Z" stroke="#eaeee9" strokeWidth="3"/>
  <path d="M318 106V332M94 219H542" stroke="#eaeee9" strokeWidth="2" opacity=".85"/>
  <path d="M314 105V66M314 332V293" stroke="#172258" strokeWidth="7" strokeLinecap="round"/>
  <path d="M316 72V300L340 318V90L316 72Z" fill="#151f53" opacity=".88"/>
  <path d="M316 72L340 90V318" stroke="#e2e7ef" strokeWidth="3"/>
  <path d="M321 78V305M328 82V309M335 87V314M316 118L340 136M316 164L340 182M316 210L340 228M316 256L340 274" stroke="#a1acd3" opacity=".5"/>
 </g>
 <g className="scene-paddle" transform="rotate(27 190 260)">
  <rect x="169" y="275" width="37" height="109" rx="16" fill="#232925"/>
  <rect x="175" y="293" width="25" height="76" rx="10" fill="#e6c79b"/>
  <ellipse cx="188" cy="235" rx="69" ry="81" fill="#f0d4aa"/>
  <ellipse cx="185" cy="229" rx="68" ry="79" fill="#e86031"/>
  <ellipse cx="185" cy="229" rx="67" ry="78" fill="url(#rubber-grain)"/>
  <path d="M143 245L214 183" stroke="#ffb289" strokeWidth="1" opacity=".7"/>
  <text x="185" y="238" textAnchor="middle" fill="#ffddc9" fontSize="17" fontWeight="700" fontFamily="sans-serif">пинг</text>
 </g>
 <ellipse cx="451" cy="205" rx="26" ry="10" fill="#152785" opacity=".24"/>
 <g className="scene-ball"><circle cx="448" cy="130" r="27" fill="url(#ball-light)"/><path d="M431 114C438 106 450 104 460 110" stroke="white" strokeWidth="2" opacity=".7"/></g>
 <path d="M476 97C518 51 560 95 531 150" stroke="#ecedfa" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" opacity=".65"/>
 </svg>;}
