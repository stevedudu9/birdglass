import { BirdSilhouette } from '../features/materials/NatureLuxeVisuals';

export function NatureWorkspaceHero() {
  return <header className="nature-workspace-hero">
    <img src="/images/ara-damansara-township.jpg" alt="" className="nature-workspace-scene" fetchPriority="high"/>
    <div className="nature-workspace-copy">
      <a className="workspace-back" href="#home">← Back to BirdGlass</a>
      <h1>Assess your glass.<br/>Create a safer tomorrow.</h1>
      <p>Bring your photos, measurements and treatment costs together.<br/>A considered plan for every pane.</p>
    </div>
    <div className="nature-workspace-signature" aria-hidden="true"><BirdSilhouette/><span>Small patterns.<br/>Thoughtful spaces.</span></div>
  </header>;
}
