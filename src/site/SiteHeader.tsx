import { useEffect, useRef, useState } from 'react';
import { BirdLogo, Icon } from './Icon';

export const workspaceAnchors = new Set(['assess','studio','photo-workspace','calibrate','pattern-results','choose-treatment','priority-assessment','building-plan','export-plan']);
export const isWorkspaceHash = (hash: string) => workspaceAnchors.has(hash.replace(/^#/, ''));

export function SiteHeader({ hash, onGuide, guideOpen }: { hash: string; onGuide: () => void; guideOpen: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [hash]);
  const toggle = useRef<HTMLButtonElement>(null);
  const items = [['Home','#home'],['Assess','#assess']];
  const active = isWorkspaceHash(hash) ? '#assess' : '#home';
  return <header className="site-header"><div className="site-header-inner">
    <a className="site-brand" href="#home" aria-label="BirdGlass home" onClick={() => setOpen(false)}><BirdLogo/><span>BirdGlass</span></a>
    <button ref={toggle} type="button" className="menu-toggle" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="site-navigation" onClick={() => setOpen(!open)}><Icon name={open?'close':'menu'}/></button>
    <nav id="site-navigation" className="site-links" data-open={open} aria-label="Main navigation" onKeyDown={event => { if(event.key === 'Escape') { setOpen(false); toggle.current?.focus(); } }}>
      {items.map(([label, href]) => <a key={href} href={href} aria-current={active === href ? 'page' : undefined} onClick={() => setOpen(false)}>{label}</a>)}
      {isWorkspaceHash(hash) && <button className="mobile-guide" onClick={()=>{onGuide();setOpen(false);}}>{guideOpen?'Close guide':'Quick guide'}</button>}
      <a className="site-button site-button-green mobile-start" href="#assess" onClick={() => setOpen(false)}>Start assessment <Icon name="arrow"/></a>
    </nav>
    <div className="site-header-end">{isWorkspaceHash(hash) && <button className="site-guide" aria-expanded={guideOpen} onClick={onGuide}>{guideOpen?'Close guide':'Quick guide'}</button>}<a className="site-button site-button-green" href="#assess">Get Started <Icon name="arrow"/></a></div>
  </div></header>;
}

