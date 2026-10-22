import type { ReactNode } from 'react';

export function Icon({ name, className = '' }: { name: string; className?: string }) {
  const paths: Record<string, ReactNode> = {
    arrow: <path d="M4 12h15m-6-6 6 6-6 6"/>,
    camera: <><path d="m8 5 2-2h4l2 2h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="4"/></>,
    dots: <>{[5,12,19].flatMap(x => [5,12,19].map(y => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.7" fill="currentColor" stroke="none"/>))}</>,
    building: <><path d="M3 21V3h12v18M15 9h6v12M1 21h22M8 21v-4h3v4M7 7h1m3 0h1M7 11h1m3 0h1m7 2h1m-1 4h1"/></>,
    download: <><path d="M12 2v13m-5-5 5 5 5-5M3 15v6h18v-6"/></>,
    leaf: <><path d="M20 3C8 0 1 9 5 16c7 7 17-1 15-13ZM3 22l13-15"/></>,
    chart: <><path d="M4 21V12h3v9m4 0V3h3v18m4 0V8h3v13"/></>,
    check: <path d="m4 12 5 5L20 6"/>,
    play: <path d="m8 4 12 8-12 8Z" fill="currentColor" stroke="none"/>,
    shield: <><path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z"/><path d="m7 12 3 3 7-7"/></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
    close: <path d="m5 5 14 14M19 5 5 19"/>,
  };
  return <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.leaf}</svg>;
}

export function BirdLogo() {
  return <svg viewBox="0 0 52 48" fill="none" aria-hidden="true"><path d="M8 34c7-2 11-7 14-17 2-8 8-12 14-9 4 2 5 6 3 10-1 3-4 5-5 9-3 9-11 13-26 7Z" fill="#d6f4e3" stroke="#101d38" strokeWidth="1.8"/><path d="M14 31c8 1 14-2 18-10-8-2-13 2-18 10Z" fill="#059669" stroke="#101d38" strokeWidth="1.5"/><path d="m39 12 7 3-7 2M11 34l-6 5 15-4M23 37l-2 6m9-9-1 9M15 44h22" stroke="#101d38" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><circle cx="34" cy="12" r="1.6" fill="#101d38"/></svg>;
}

export function Foliage({ className = '' }: { className?: string }) {
  return <svg className={`foliage ${className}`} viewBox="0 0 150 260" fill="none" aria-hidden="true"><path d="M20 252c38-74 52-136 83-220" stroke="#8abf57" strokeWidth="2"/>{[0,1,2,3,4].map(i => <g key={i} transform={`translate(${30+i*13} ${204-i*36})`}><path d="M0 0C-40-1-36-28-38-41-8-33 2-17 0 0Z" fill={i%2?'#a9d773':'#73b854'}/><path d="M0-9c5-33 28-42 44-44-4 26-19 41-44 44Z" fill={i%2?'#65ad4a':'#b1dc80'}/></g>)}</svg>;
}
