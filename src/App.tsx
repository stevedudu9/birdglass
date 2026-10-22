import { useEffect, useRef, useState } from 'react';
import { BirdGlassWindowEditor, createWindow, LIMITS, setImage } from './features/member2';
import type { WindowDraft } from './features/member2';
import { BASELINE_GUIDELINE } from './config/baseline';
import { createSampleWindow, upgradeLegacySamples } from './demo/sample';
import { calculateLayout } from './features/member3';
import { loadProject, saveProject } from './demo/storage';
import { Member3Results } from './demo/Member3Results';
import { TreatmentActions } from './demo/TreatmentActions';
import { BuildingPlan } from './demo/BuildingPlan';
import { emptyPlan, planEntry } from './demo/planning';
import type { BuildingPlan as Plan, Treatment } from './demo/planning';
import { downloadTreatmentReport } from './demo/treatmentReport';
import { downloadLayoutSheet } from './demo/layoutSheet';
import './app.css';
import './demo/planning.css';
import './web-design.css';
import { HomePage } from './site/HomePage';
import { SiteHeader, isWorkspaceHash } from './site/SiteHeader';
import './site/site.css';
import { MaterialPlanner } from './features/materials/MaterialPlanner';
import { PriorityAssessment } from './features/screening/PriorityAssessment';
import { NatureWorkspaceHero } from './site/NatureWorkspaceHero';
import './nature-workspace.css';

function WindowIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M12 3V21M4 12H20" stroke="currentColor" strokeWidth="1.5"/></svg>; }
function BirdMark() { return <svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M7 22 16 25 30 11 25 26 16 29 7 22Z" fill="currentColor"/><path d="m16 25-3-14 10 9M30 11l5-1-4 5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><circle cx="8" cy="32" r="1.5" fill="currentColor"/><circle cx="13" cy="35" r="1.5" fill="currentColor"/><circle cx="3" cy="29" r="1.5" fill="currentColor"/></svg>; }
const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });

export default function App() {
  const [hash,setHash] = useState(() => window.location.hash || '#home');
  const workspace = isWorkspaceHash(hash);
  const [debugMode] = useState(()=>new URLSearchParams(window.location.search).get('debug')==='1');
  useEffect(() => { const change = () => setHash(window.location.hash || '#home'); window.addEventListener('hashchange',change); return () => window.removeEventListener('hashchange',change); }, []);
  const [windows, setWindows] = useState<WindowDraft[]>([]), [activeId, setActiveId] = useState(''), [ready, setReady] = useState(false);
  const [plan, setPlan] = useState<Plan>(emptyPlan);
  const [changedWindows, setChangedWindows] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState('Loading local project…'), [storageError, setStorageError] = useState(''), [notice, setNotice] = useState('');
  const [deleted, setDeleted] = useState<WindowDraft | null>(null), [sampleBusy, setSampleBusy] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [summaryExport, setSummaryExport] = useState(false);
  const saveGeneration = useRef(0);
  useEffect(() => { if(ready) document.getElementById(window.location.hash.slice(1) || 'home')?.scrollIntoView?.({block:'start'}); }, [workspace,ready]);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const stored = await loadProject();
        let list = stored?.windows ?? [await createSampleWindow()];
        if (stored) {
          try { list = await upgradeLegacySamples(list); }
          catch { if(active) setNotice('The updated example image could not be loaded. Your saved windows have been retained.'); }
        }
        if (!active) return;
        setWindows(list); setPlan(stored?.buildingPlan ?? emptyPlan());
        setActiveId(list.some(window => window.windowId === stored?.activeId) ? stored!.activeId : list[0].windowId); setReady(true);
      } catch (error) {
        if (active) { const first = createWindow('Window 1'); setWindows([first]); setActiveId(first.windowId); setStorageError((error as Error).message); setReady(true); }
      }
    })();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!ready || storageError) return;
    const generation = ++saveGeneration.current; setSaveStatus('Saving on this device…');
    const timer = setTimeout(() => {
      void saveProject({ version: 1, windows, activeId, buildingPlan: plan }).then(() => {
        if (generation === saveGeneration.current) setSaveStatus('Saved on this device');
      }).catch(() => setStorageError('Local saving is unavailable. Back up your project before closing this page.'));
    }, 350);
    return () => clearTimeout(timer);
  }, [windows, activeId, plan, ready, storageError]);
  const current = windows.find(window => window.windowId === activeId) ?? windows[0];
  function updateWindow(value: WindowDraft) {
    const previous = windows.find(window => window.windowId === value.windowId);
    if (previous?.layout && !value.layout) setChangedWindows(list => [...new Set([...list, value.windowId])]);
    if (value.layout) setChangedWindows(list => list.filter(id => id !== value.windowId));
    setWindows(list => list.map(window => window.windowId === value.windowId ? value : window));
  }
  function addWindow(reuseImage = false) {
    if (windows.length >= LIMITS.windows) { setNotice('This prototype supports up to eight windows.'); return; }
    let draft = createWindow(`Window ${windows.length + 1}`);
    if (reuseImage && current?.image) draft = setImage(draft, current.image);
    setWindows(list => [...list, draft]); setActiveId(draft.windowId); setNotice(''); scrollTo('studio');
  }
  async function loadSample() {
    if (windows.length >= LIMITS.windows) { setNotice('Remove a window before adding an example.'); return; }
    setSampleBusy(true);
    try { const sample = await createSampleWindow(); setWindows(list => [...list, sample]); setActiveId(sample.windowId); setNotice('Illustrated example added with demonstration measurements.'); }
    catch (error) { setNotice((error as Error).message); }
    finally { setSampleBusy(false); }
  }
  function removeWindow() {
    if (!current) return;
    setDeleted(current); const remaining = windows.filter(window => window.windowId !== current.windowId);
    if (!remaining.length) remaining.push(createWindow('Window 1'));
    setWindows(remaining); setActiveId(remaining[0].windowId); setNotice('Window removed. Any building-plan entry is flagged until restored or removed.');
  }
  function addToPlan() {
    try {
      const existing = plan.entries.find(entry => entry.windowId === current.windowId);
      if (!existing && plan.entries.length >= LIMITS.windows) { setNotice('The plan holds up to eight windows. Remove an old plan entry before adding another.'); scrollTo('building-plan'); return; }
      const entry = { ...existing, ...planEntry(current, existing?.location) };
      setPlan(value => ({ ...value, entries: existing ? value.entries.map(item => item.windowId === entry.windowId ? entry : item) : [...value.entries, entry] }));
      setNotice('Treatment saved to your building plan.'); scrollTo('building-plan');
    } catch (error) { setNotice((error as Error).message); }
  }
  async function exportSummary(items: Treatment[], includePurchasing = false) {
    if (summaryExport) return;
    setSummaryExport(true); setNotice('Preparing treatment summary…');
    try {
      await downloadTreatmentReport(items, plan, includePurchasing, (completed, total) => setNotice(`Preparing treatment summary: ${completed} / ${total} windows…`), {debugMode});
      setNotice('Treatment summary downloaded. Open the HTML file in a browser to read, print or save it as a PDF.');
    }
    catch (error) { setNotice(`Summary could not be created. ${(error as Error).message}`); scrollTo('studio'); }
    finally { setSummaryExport(false); }
  }
  function exportPlacement(item: Treatment) {
    try { downloadLayoutSheet(item, {debugMode}); setNotice('Placement sheet downloaded. Use its written dimensions; the drawing is not to scale. Open the HTML file to print or save as PDF.'); }
    catch (error) { setNotice(`Placement sheet could not be created. ${(error as Error).message}`); scrollTo('studio'); }
  }
  return <div className="app-shell">
    <a className="skip-link" href={workspace?'#photo-workspace':'#how-it-works'}>Skip to content</a>
    <SiteHeader hash={hash} onGuide={() => setShowNotes(value => !value)} guideOpen={showNotes}/>
    {workspace ? <div className="app-body nature-workspace" id="assess"><main id="studio" className="studio-main"><NatureWorkspaceHero/>
      <nav className="user-workflow" aria-label="Planning workflow"><a href="#photo-workspace"><small>1</small><span><strong>Upload</strong><span>Your window photo</span></span></a><a href="#calibrate"><small>2</small><span><strong>Calibrate</strong><span>Corners & measured size</span></span></a><a href="#pattern-results"><small>3</small><span><strong>Design</strong><span>Generate & check</span></span></a><a href="#priority-assessment"><small>4</small><span><strong>Screen & plan</strong><span>Observations & treatment</span></span></a><a href="#export-plan"><small>5</small><span><strong>Export</strong><span>Preliminary reports</span></span></a></nav>
      {showNotes && <section className="quick-guide"><h2>From photo to treatment plan</h2><ol><li>Upload a JPEG or PNG with all four corners of one flat glass pane visible, or explore the illustrated example.</li><li>Select top-left, top-right, bottom-right and bottom-left. Enter the actual glass width and height, excluding the frame.</li><li>Generate the pattern. Compare the original photo with the proposed treatment and review the layout checks.</li><li>Add the treatment to your building plan. Record its location, compare windows and download a summary.</li></ol><p>The pattern uses 10 mm white dots at fixed 50 × 50 mm centre spacing on the exterior glass surface. Confirm material suitability, visibility, access and installation conditions on site.</p></section>}
      {storageError && <div className="app-warning" role="status">{storageError}</div>}
      {notice && <div className="app-notice" role="status">{notice}{deleted && windows.length < LIMITS.windows && <button onClick={() => { setWindows(list => [...list, deleted]); setActiveId(deleted.windowId); setDeleted(null); setNotice('Window restored.'); }}>Undo removal</button>}</div>}
      <section className="window-collection" aria-label="Window list"><div className="collection-heading"><div><h2>Your windows <span>{windows.length.toString().padStart(2, '0')}</span></h2><p>One measured pane at a time.</p></div><div className="collection-actions"><button className="hero-example" disabled={!ready || sampleBusy || windows.length >= LIMITS.windows} onClick={() => void loadSample()}>{sampleBusy ? 'Loading…' : 'Load example'}</button><button className="add-window" onClick={() => addWindow()} disabled={!ready || windows.length >= LIMITS.windows}>＋ Add window</button></div></div><div className="window-rail"><nav className="window-list" aria-label="Choose a window">{windows.map((window, index) => <button key={window.windowId} className={`window-item ${window.windowId === current?.windowId ? 'selected' : ''}`} onClick={() => { setActiveId(window.windowId); setNotice(''); }} aria-current={window.windowId === current?.windowId ? 'true' : undefined}><span className="window-thumb">{window.image ? <img src={window.image.preview?.dataUrl??window.image.dataUrl} alt=""/> : <WindowIcon/>}</span><span className="window-item-copy"><strong>{window.label || `Window ${index + 1}`}</strong><small>{window.image?.kind === 'illustration' ? 'Illustrated example' : window.image ? 'Photo added' : 'Awaiting photo'}</small></span><span className="window-selected" aria-hidden="true">{window.windowId === current?.windowId ? '✓' : ''}</span></button>)}</nav>{current?.image && <button className="sidebar-link" onClick={() => addWindow(true)} disabled={windows.length >= LIMITS.windows}>Another pane in this photo</button>}</div></section>
      {ready && current ? <BirdGlassWindowEditor debugMode={debugMode} key={`editor-${current.windowId}`} value={current} onChange={updateWindow} guideline={BASELINE_GUIDELINE} calculateLayout={calculateLayout} onLoadSample={() => void loadSample()} details={<div className="window-management"><button type="button" className="remove-window" onClick={removeWindow}>Remove this window</button></div>}/> : <div className="loading-state">Preparing your local workspace…</div>}
      {ready && current && <MaterialPlanner window={current} onChange={updateWindow} onAddToPlan={addToPlan}/>}
      {ready && current && <Member3Results debugMode={debugMode} window={current} changed={changedWindows.includes(current.windowId)}/>}
      {ready && current && <PriorityAssessment key={`screening-${current.windowId}`} window={current} onChange={updateWindow} legacyEntry={plan.entries.find(entry=>entry.windowId===current.windowId)}/>}
      {ready && current && <TreatmentActions window={current} inPlan={plan.entries.some(entry => entry.windowId === current.windowId)} onAdd={addToPlan} onExport={item => void exportSummary([item])} onPlacement={exportPlacement} exporting={summaryExport}/>}
      {ready && <BuildingPlan windows={windows} plan={plan} onChange={setPlan} onEdit={windowId => { setActiveId(windowId); setNotice(''); scrollTo('studio'); }} onAssess={windowId=>{setActiveId(windowId);window.location.hash='priority-assessment';scrollTo('priority-assessment');}} onChooseTreatment={windowId => {setActiveId(windowId); setNotice(''); window.location.hash='choose-treatment'; scrollTo('choose-treatment');}} onExport={(items, includePurchasing) => void exportSummary(items, includePurchasing)} exporting={summaryExport}/>}
      <footer className="studio-footer"><div className="footer-brand"><BirdMark/><span>BirdGlass <small>Thoughtful planning for shared spaces.</small></span></div><div className="save-note"><span className="local-indicator"/>{storageError ? 'Back up to keep your work' : saveStatus}<small>Photos and edits stay in this browser.</small></div></footer>
    </main></div> : <HomePage windows={windows} plan={plan} current={current} ready={ready} onSelectWindow={setActiveId}/>}
  </div>;
}




