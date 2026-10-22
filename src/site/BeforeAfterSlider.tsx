import { useId, useState } from 'react';
import type { PhotoPreviewData } from './preview';

export function BeforeAfterSlider({ preview }: { preview: PhotoPreviewData }) {
  const [position, setPosition] = useState(50);
  const clipId = useId().replace(/:/g,'');
  return <div className="before-after" aria-label="Interactive window treatment comparison">
    <svg viewBox={`0 0 ${preview.width} ${preview.height}`} role="img" aria-label="The same window photograph with a simulated dot treatment on the right">
      <defs><clipPath id={clipId}><rect x={preview.width*position/100} y="0" width={preview.width*(100-position)/100} height={preview.height}/></clipPath></defs>
      <image href={preview.image.preview?.dataUrl??preview.image.dataUrl} width={preview.width} height={preview.height}/>
      <path data-testid="comparison-dots" d={preview.outline} fill="white" clipPath={`url(#${clipId})`}/>
    </svg>
    <span className="comparison-label before-label">Original</span><span className="comparison-label after-label">Simulated treatment</span>
    <input className="comparison-range" type="range" min="0" max="100" step="1" value={position} aria-label="Before and after comparison" aria-valuetext={`${position}% original, ${100-position}% simulated treatment`} onChange={event => setPosition(Number(event.target.value))}/>
    <div className="comparison-divider" style={{left:`${position}%`}} aria-hidden="true"><span>‹ ›</span></div>
  </div>;
}
