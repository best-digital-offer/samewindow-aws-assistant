import { useEffect, useMemo, useState } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Activity, Cloud, ShieldCheck, Trash2, AlertTriangle, CheckCircle2, LogIn, LogOut } from 'lucide-react';

type Investigation = { id:string; service:string; title:string; message:string; severity:string; detectedAt:string; pageUrl:string; diagnosis?:string; resolutionSteps?:string[] };
type Diagnosis = { investigationId:string; diagnosis:string; likelyCauses:string[]; resolutionSteps:string[]; caution:string };
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const diagnosisApi = (import.meta.env.VITE_DIAGNOSE_API_URL as string | undefined) || '/api/diagnose';
const supabase: SupabaseClient | null = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }) : null;

export default function App() {
 const [items,setItems] = useState<Investigation[]>([]);
 const [consent,setConsent] = useState(false);
 const [status,setStatus] = useState('Local-only detection is enabled');
 const [email,setEmail] = useState('');
 const [password,setPassword] = useState('');
 const [userEmail,setUserEmail] = useState<string|null>(null);
 const [authMode,setAuthMode] = useState<'signin'|'signup'>('signin');
 const [busy,setBusy] = useState(false);
 const [selected,setSelected] = useState<Investigation|null>(null);
 const [diagnosis,setDiagnosis] = useState<Diagnosis|null>(null);
 const [error,setError] = useState('');
 const configured = Boolean(supabase);
 useEffect(()=>{
  browser.storage.local.get(['investigations','cloudAnalysisConsent']).then(s=>{setItems(Array.isArray(s.investigations)?s.investigations:[]);setConsent(s.cloudAnalysisConsent===true);});
  const listener=(changes:Record<string,any>)=>{if(changes.investigations)setItems(changes.investigations.newValue||[]);if(changes.cloudAnalysisConsent)setConsent(changes.cloudAnalysisConsent.newValue===true)};
  browser.storage.onChanged.addListener(listener);
  if(supabase){supabase.auth.getSession().then(({data})=>setUserEmail(data.session?.user.email||null));const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setUserEmail(session?.user.email||null));return()=>{browser.storage.onChanged.removeListener(listener);subscription.unsubscribe()};}
  return()=>browser.storage.onChanged.removeListener(listener);
 },[]);
 async function saveConsent(value:boolean){setConsent(value);await browser.storage.local.set({cloudAnalysisConsent:value});setStatus(value?'Cloud diagnosis preference enabled. Each request still requires a separate confirmation.':'Cloud diagnosis disabled.');}
 async function clearHistory(){await browser.storage.local.set({investigations:[]});setItems([]);setDiagnosis(null);}
 async function authenticate(){if(!supabase){setError('Supabase client configuration is missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY locally.');return;}setBusy(true);setError('');try{const result=authMode==='signin'?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password});if(result.error)throw result.error;if(authMode==='signup'&&!result.data.session)setStatus('Account created. Check your email if confirmation is enabled.');else setStatus('Signed in successfully.');}catch(e){setError(e instanceof Error?e.message:'Authentication failed.')}finally{setBusy(false)}}
 async function signOut(){if(supabase)await supabase.auth.signOut();setDiagnosis(null);setStatus('Signed out. Local detections remain on this device.');}
 async function runDiagnosis(item:Investigation){if(!consent){setError('Enable cloud diagnosis consent first.');return;}if(!supabase){setError('Supabase is not configured for this extension build.');return;}setBusy(true);setError('');setDiagnosis(null);try{const {data:{session}}=await supabase.auth.getSession();if(!session){setError('Sign in before requesting cloud diagnosis.');return;}const response=await fetch(diagnosisApi,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({consent:true,service:item.service,title:item.title,severity:item.severity,errorSummary:item.message})});const payload=await response.json();if(!response.ok)throw new Error(payload.error||'Diagnosis failed');const result:Diagnosis={investigationId:payload.investigationId,diagnosis:payload.diagnosis,likelyCauses:payload.likelyCauses||[],resolutionSteps:payload.resolutionSteps||[],caution:payload.caution||''};setDiagnosis(result);setStatus('Diagnosis complete. The redacted error summary was sent to the configured AI provider and saved to your account history.');}catch(e){setError(e instanceof Error?e.message:'Diagnosis failed.')}finally{setBusy(false)}}
 const canDiagnose=useMemo(()=>configured&&consent&&Boolean(userEmail),[configured,consent,userEmail]);
 return <main className="shell"><header><div className="brand"><div className="mark"><Activity size={19}/></div><div><p className="eyebrow">SAMEWINDOW</p><h1>AWS Assistant</h1></div></div><span className="local-pill"><span/>LOCAL FIRST</span></header>
 <section className="hero"><p className="eyebrow">INVESTIGATION TIMELINE</p><h2>Understand the error.<br/><em>Find the next step.</em></h2><p className="muted">Visible AWS Console errors are detected on your device. Nothing is sent to cloud AI automatically.</p></section>
 <section className="privacy"><ShieldCheck size={20}/><div><strong>Your data stays local by default</strong><p>Cloud sharing requires consent, sign-in, and a separate diagnosis action. Resource ARNs and account IDs are redacted server-side.</p></div></section>
 <section className="section-head"><div><h3>Recent detections</h3><p>{items.length} saved locally</p></div><button className="icon-button" title="Clear local history" onClick={clearHistory}><Trash2 size={16}/></button></section>
 {items.length===0?<div className="empty"><div className="empty-icon"><CheckCircle2 size={24}/></div><strong>No errors detected yet</strong><p>Open an AWS Console page. When a supported visible error appears, it will show here.</p></div>:<div className="timeline">{items.map(item=><article className="incident" key={item.id}><div className="incident-icon"><AlertTriangle size={17}/></div><div className="incident-body"><div className="incident-meta"><span>{item.service}</span><span>{new Date(item.detectedAt).toLocaleString()}</span></div><strong>{item.title}</strong><p>{item.message}</p><small>{item.pageUrl}</small><button className="secondary" disabled={!canDiagnose||busy} onClick={()=>setSelected(item)}>Review and diagnose</button></div></article>)}</div>}
 <section className="section-head cloud-head"><div><h3>Cloud diagnosis</h3><p>Optional AI assistance</p></div><Cloud size={20}/></section>
 <div className="consent-card"><div className="consent-top"><div><strong>Allow cloud diagnostics</strong><p>Preference only. Each request requires you to review and confirm the error summary before sending.</p></div><button className={consent?'toggle on':'toggle'} aria-pressed={consent} onClick={()=>saveConsent(!consent)}><span/></button></div><div className="notice">{status}</div>
 {!userEmail?<div className="auth-form"><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={authMode==='signin'?'current-password':'new-password'} placeholder="At least 8 characters"/></label><button className="primary" disabled={busy||!configured||!email||password.length<8} onClick={authenticate}><LogIn size={14}/>{busy?'Please wait…':authMode==='signin'?'Sign in':'Create account'}</button><button className="text-button" onClick={()=>setAuthMode(authMode==='signin'?'signup':'signin')}>{authMode==='signin'?'Need an account? Create one':'Already registered? Sign in'}</button>{!configured&&<p className="warning">Extension environment is not configured yet.</p>}</div>:<div className="signed-in"><span>Signed in as <strong>{userEmail}</strong></span><button className="icon-button" title="Sign out" onClick={signOut}><LogOut size={15}/></button></div>}
 {error&&<p className="error-message">{error}</p>}<p className="small-note">This new Supabase project uses its own authentication unless SameWindow's existing identity provider is explicitly connected.</p></div>
 {selected&&<div className="modal-backdrop"><section className="review-modal"><p className="eyebrow">CLOUD SHARING REVIEW</p><h3>Confirm this error can be shared?</h3><p className="muted">Only the redacted service, title, severity and error text below will be sent to the configured diagnosis API. The page URL is not sent.</p><div className="preview"><strong>{selected.service}: {selected.title}</strong><p>{selected.message}</p></div><div className="modal-actions"><button className="secondary" onClick={()=>setSelected(null)}>Cancel</button><button className="primary" disabled={busy||!canDiagnose} onClick={()=>{const item=selected;setSelected(null);void runDiagnosis(item)}}>{busy?'Diagnosing…':'Confirm and send'}</button></div></section></div>}
 {diagnosis&&<section className="diagnosis-result"><p className="eyebrow">AI DIAGNOSIS</p><h3>Likely explanation</h3><p>{diagnosis.diagnosis}</p>{diagnosis.likelyCauses.length>0&&<><h4>Possible causes</h4><ul>{diagnosis.likelyCauses.map((x,i)=><li key={i}>{x}</li>)}</ul></>}{diagnosis.resolutionSteps.length>0&&<><h4>Suggested next steps</h4><ol>{diagnosis.resolutionSteps.map((x,i)=><li key={i}>{x}</li>)}</ol></>}<p className="small-note">{diagnosis.caution}</p></section>}
 <footer><span>MODEL 6 · AI INVESTIGATION TIMELINE</span><span>Firefox preview</span></footer></main>
}
