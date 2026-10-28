import { useEffect, useState } from 'react';
import { Activity, Cloud, ShieldCheck, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';

type Investigation = { id:string; service:string; title:string; message:string; severity:string; detectedAt:string; pageUrl:string };
export default function App() {
 const [items,setItems] = useState<Investigation[]>([]);
 const [consent,setConsent] = useState(false);
 const [status,setStatus] = useState('Local-only detection is enabled');
 useEffect(()=>{ browser.storage.local.get(['investigations','cloudAnalysisConsent']).then(s=>{setItems(Array.isArray(s.investigations)?s.investigations:[]);setConsent(s.cloudAnalysisConsent===true);}); const listener=(changes:Record<string,any>)=>{if(changes.investigations)setItems(changes.investigations.newValue||[]);if(changes.cloudAnalysisConsent)setConsent(changes.cloudAnalysisConsent.newValue===true)};browser.storage.onChanged.addListener(listener);return()=>browser.storage.onChanged.removeListener(listener)},[]);
 async function saveConsent(value:boolean){setConsent(value);await browser.storage.local.set({cloudAnalysisConsent:value});setStatus(value?'Cloud diagnosis consent enabled. Each diagnosis still requires a separate action.':'Cloud diagnosis disabled.');}
 async function clearHistory(){await browser.storage.local.set({investigations:[]});setItems([]);}
 return <main className="shell"><header><div className="brand"><div className="mark"><Activity size={19}/></div><div><p className="eyebrow">SAMEWINDOW</p><h1>AWS Assistant</h1></div></div><span className="local-pill"><span/>LOCAL FIRST</span></header>
 <section className="hero"><p className="eyebrow">INVESTIGATION TIMELINE</p><h2>Understand the error.<br/><em>Find the next step.</em></h2><p className="muted">Visible AWS Console errors are detected on your device. Nothing is sent to cloud AI automatically.</p></section>
 <section className="privacy"><ShieldCheck size={20}/><div><strong>Your data stays local by default</strong><p>Cloud analysis is not active until you opt in and explicitly request a diagnosis.</p></div></section>
 <section className="section-head"><div><h3>Recent detections</h3><p>{items.length} saved locally</p></div><button className="icon-button" title="Clear local history" onClick={clearHistory}><Trash2 size={16}/></button></section>
 {items.length===0?<div className="empty"><div className="empty-icon"><CheckCircle2 size={24}/></div><strong>No errors detected yet</strong><p>Open an AWS Console page. When a supported visible error appears, it will show here.</p></div>:<div className="timeline">{items.map(item=><article className="incident" key={item.id}><div className="incident-icon"><AlertTriangle size={17}/></div><div className="incident-body"><div className="incident-meta"><span>{item.service}</span><span>{new Date(item.detectedAt).toLocaleString()}</span></div><strong>{item.title}</strong><p>{item.message}</p><small>{item.pageUrl}</small></div></article>)}</div>}
 <section className="section-head cloud-head"><div><h3>Cloud diagnosis</h3><p>Optional AI assistance</p></div><Cloud size={20}/></section>
 <div className="consent-card"><div className="consent-top"><div><strong>Allow cloud diagnostics</strong><p>Save your preference. You will still confirm the context before each request.</p></div><button className={consent?'toggle on':'toggle'} aria-pressed={consent} onClick={()=>saveConsent(!consent)}><span/></button></div><div className="notice">{status}</div><button className="primary" disabled>{consent?'Diagnosis API not configured yet':'Enable consent to configure'}</button></div>
 <footer><span>MODEL 6 · AI INVESTIGATION TIMELINE</span><span>Firefox preview</span></footer></main>
}
