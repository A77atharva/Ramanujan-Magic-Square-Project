import React, { useState, useMemo, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { useListEmployees, useCreateEmployee, useDeleteEmployee, useGenerateCard, apiFetch } from '../lib/api-hooks';
import { useQueryClient } from '@tanstack/react-query';
import { generateMagicSquarePDF, type OrgContext } from '../lib/pdf-generator';
import {
  Trash2, UserPlus, ArrowLeft, Mail, Calendar, User, Users, Download,
  Building2, Edit2, Plus, Upload, FileText, Phone, X, Check, AlertCircle,
} from 'lucide-react';
import { Link } from 'wouter';

interface Org { id: number; sr: number; orgName: string; csvName: string; logoName: string|null; logoData: string|null; createdAt: string; }

function todayDMY() { const d=new Date(); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; }
function isoToDMY(iso: string) { if(!iso)return''; const[y,m,dd]=iso.split('-'); return `${dd}/${m}/${y}`; }
function dmyToISO(dmy: string) { if(!dmy)return''; const[dd,mm,yyyy]=dmy.split('/'); if(!dd||!mm||!yyyy)return''; return `${yyyy}-${mm}-${dd}`; }

export default function Organizer() {
  const [tab, setTab] = useState<'employees'|'organizations'|'import'>('employees');
  const [toastMsg, setToastMsg] = useState<string|null>(null);
  const [toastErr, setToastErr] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<number|null>(() => {
    const s = localStorage.getItem('selectedOrgId'); return s ? Number(s) : null;
  });

  function flash(msg: string, err=false) { setToastMsg(msg); setToastErr(err); setTimeout(()=>setToastMsg(null),4500); }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 gap-6">
      <img src="/logo.png" alt="Alparambha" className="h-14 sm:h-16 w-auto object-contain drop-shadow-lg" onError={e=>(e.currentTarget.style.display='none')} />
      <Link href="/" className="flex items-center gap-2 text-sm font-sans text-purple-heading/70 hover:text-purple-heading transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Generator
      </Link>
      <div className="text-center">
        <h1 className="font-serif text-4xl font-bold text-purple-heading">Organizer Panel</h1>
        <p className="text-purple-heading/60 font-sans mt-1 text-sm">Manage organizations, employees and bulk-import via CSV.</p>
      </div>
      <div className="flex gap-1 bg-purple-50 border border-purple-100 rounded-2xl p-1 w-full max-w-3xl">
        {([{id:'employees',icon:<Users className="w-4 h-4"/>,label:'Employees'},{id:'organizations',icon:<Building2 className="w-4 h-4"/>,label:'Organizations'},{id:'import',icon:<Upload className="w-4 h-4"/>,label:'Import CSV'}] as const).map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold font-sans transition-all ${tab===t.id?'bg-white shadow text-purple-heading':'text-purple-heading/50 hover:text-purple-heading/80'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>
      {toastMsg && (
        <div className={`fixed top-4 right-4 z-50 shadow-lg border rounded-xl px-5 py-3 text-sm font-sans max-w-xs flex items-start gap-2 ${toastErr?'bg-red-50 border-red-200 text-red-700':'bg-white border-purple-200 text-purple-heading'}`}>
          {toastErr?<AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5"/>:<Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-500"/>}
          {toastMsg}
        </div>
      )}
      {tab==='employees' && <EmployeesTab flash={flash} selectedOrgId={selectedOrgId} setSelectedOrgId={id=>{setSelectedOrgId(id);if(id!==null)localStorage.setItem('selectedOrgId',String(id));else localStorage.removeItem('selectedOrgId');}}/>}
      {tab==='organizations' && <OrganizationsTab flash={flash}/>}
      {tab==='import' && <ImportTab flash={flash} setSelectedOrgId={id=>{setSelectedOrgId(id);if(id!==null)localStorage.setItem('selectedOrgId',String(id));else localStorage.removeItem('selectedOrgId');}}/>}
    </div>
  );
}

function EmployeesTab({ flash, selectedOrgId, setSelectedOrgId }: { flash:(m:string,e?:boolean)=>void; selectedOrgId:number|null; setSelectedOrgId:(id:number|null)=>void; }) {
  const [isAddOpen,setIsAddOpen]=useState(false);
  const [nameInput,setNameInput]=useState('');
  const [email,setEmail]=useState('');
  const [mobile,setMobile]=useState('');
  const [dobISO,setDobISO]=useState(dmyToISO(todayDMY()));
  const [sendingEmailId,setSendingEmailId]=useState<number|null>(null);
  const [nameSearch,setNameSearch]=useState('');
  const [orgs,setOrgs]=useState<Org[]>([]);
  const qc=useQueryClient();
  const {data:employees=[],isLoading}=useListEmployees();
  const {mutateAsync:generateCard}=useGenerateCard();

  const {mutate:createEmployee,isPending:isCreating}=useCreateEmployee({mutation:{
    onSuccess:async(newEmp)=>{
      qc.invalidateQueries({queryKey:['/api/employees']});
      setIsAddOpen(false);
      const savedName=nameInput,savedDob=isoToDMY(dobISO);
      setNameInput('');setEmail('');setMobile('');setDobISO(dmyToISO(todayDMY()));
      flash('Employee added! Generating birthday card PDF…');
      try {
        const cardData=await generateCard({data:{name:savedName,dateOfBirth:savedDob}});
        const org=orgs.find(o=>o.id===selectedOrgId)??null;
        const orgCtx:OrgContext|null=org?{orgName:org.orgName,logoData:org.logoData}:null;
        await generateMagicSquarePDF(cardData,orgCtx);
        flash(`Birthday card PDF for ${savedName} downloaded!`);
      } catch { flash('Employee added. (PDF generation failed.)'); }
    },
    onError:()=>flash('Error: Email may already be in use.',true),
  }});

  const {mutate:deleteEmployee,isPending:isDeleting}=useDeleteEmployee({mutation:{onSuccess:()=>{qc.invalidateQueries({queryKey:['/api/employees']});flash('Employee removed.');}}});

  useEffect(()=>{ apiFetch('/api/organizations').then(setOrgs).catch(()=>{}); },[]);

  const handleAdd=(e:React.FormEvent)=>{
    e.preventDefault();
    const dob=isoToDMY(dobISO);
    if(!nameInput||!email||!dob)return;
    createEmployee({data:{name:nameInput,email,dateOfBirth:dob,mobile:mobile||undefined} as any});
  };

  const handleDownloadPDF=async(emp:typeof employees[0])=>{
    flash(`Generating PDF for ${emp.name}…`);
    try {
      const cardData=await generateCard({data:{name:emp.name,dateOfBirth:emp.dateOfBirth}});
      const org=orgs.find(o=>o.id===selectedOrgId)??null;
      const orgCtx:OrgContext|null=org?{orgName:org.orgName,logoData:org.logoData}:null;
      await generateMagicSquarePDF(cardData,orgCtx);
      flash(`PDF for ${emp.name} downloaded!`);
    } catch { flash('Failed to generate PDF.',true); }
  };

  const handleSendEmail=async(emp:typeof employees[0])=>{
    setSendingEmailId(emp.id);
    try {
      await apiFetch(`/api/send-birthday-email/${emp.id}`,{method:'POST'});
      flash(`Birthday email sent to ${emp.email}!`);
    } catch(err:any){
      flash(err.message??'Failed to send email.',true);
    } finally {
      setSendingEmailId(null);
    }
  };

  const filtered=useMemo(()=>nameSearch.trim()?employees.filter(e=>e.name.toLowerCase().includes(nameSearch.toLowerCase())||e.email.toLowerCase().includes(nameSearch.toLowerCase())):employees,[employees,nameSearch]);
  const prevNames=useMemo(()=>Array.from(new Set(employees.map(e=>e.name))).slice(0,4),[employees]);
  const nameSuggestions=prevNames.filter(n=>nameInput&&n.toLowerCase().includes(nameInput.toLowerCase())&&n!==nameInput);

  return (
    <>
      {orgs.length>0&&(
        <div className="w-full max-w-3xl flex items-center gap-3 px-4 py-3 bg-purple-50/80 border border-purple-100 rounded-2xl">
          <Building2 className="w-4 h-4 text-purple-400 flex-shrink-0"/>
          <span className="text-sm font-sans font-medium text-purple-heading/70 flex-shrink-0">PDF Org:</span>
          <select value={selectedOrgId??''} onChange={e=>setSelectedOrgId(e.target.value?Number(e.target.value):null)} className="flex-1 text-sm font-sans text-purple-heading bg-white border border-purple-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-400">
            <option value="">— No organization (default logo) —</option>
            {orgs.map(o=><option key={o.id} value={o.id}>{o.orgName}</option>)}
          </select>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-3xl">
        <input type="text" placeholder="Search by name or email…" value={nameSearch} onChange={e=>setNameSearch(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl border border-purple-200 bg-white/80 text-purple-heading font-sans text-sm focus:outline-none focus:border-purple-400 transition"/>
        <button onClick={()=>setIsAddOpen(true)} className="btn-gold px-6 py-2.5 flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
          <UserPlus className="w-4 h-4 flex-shrink-0"/><span>Add Employee</span>
        </button>
      </div>
      {isAddOpen&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="white-card p-6 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="font-serif text-2xl font-bold text-purple-heading mb-1">Add New Employee</h2>
            <p className="text-purple-heading/60 text-sm font-sans mb-5">A PDF is auto-downloaded after adding.</p>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="text-sm font-medium font-sans text-purple-heading/80 flex items-center gap-2 mb-1.5"><User className="w-4 h-4"/> Full Name</label>
                <div className="relative">
                  <input type="text" placeholder="Jane Doe" value={nameInput} onChange={e=>setNameInput(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-purple-heading font-sans focus:outline-none focus:border-purple-400 transition"/>
                  {nameSuggestions.length>0&&(
                    <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-lg border border-purple-100 overflow-hidden">
                      {nameSuggestions.map(s=><button key={s} type="button" onClick={()=>setNameInput(s)} className="w-full text-left px-4 py-2 text-sm font-sans text-purple-heading hover:bg-purple-50">{s}</button>)}
                    </div>
                  )}
                </div>
                {prevNames.length>0&&(<div className="mt-2 flex flex-wrap gap-1.5"><span className="text-xs text-purple-heading/50 font-sans self-center">Recent:</span>{prevNames.map(n=><button key={n} type="button" onClick={()=>setNameInput(n)} className="text-xs px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-heading/80 hover:bg-purple-100 transition font-sans">{n}</button>)}</div>)}
              </div>
              <div>
                <label className="text-sm font-medium font-sans text-purple-heading/80 flex items-center gap-2 mb-1.5"><Mail className="w-4 h-4"/> Email Address</label>
                <input type="email" placeholder="jane@example.com" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-purple-heading font-sans focus:outline-none focus:border-purple-400 transition"/>
              </div>
              <div>
                <label className="text-sm font-medium font-sans text-purple-heading/80 flex items-center gap-2 mb-1.5"><Phone className="w-4 h-4"/> Mobile Number <span className="text-purple-heading/40 font-normal">(optional)</span></label>
                <input type="tel" placeholder="+91 98765 43210" value={mobile} onChange={e=>setMobile(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-purple-heading font-sans focus:outline-none focus:border-purple-400 transition"/>
              </div>
              <div>
                <label className="text-sm font-medium font-sans text-purple-heading/80 flex items-center gap-2 mb-1.5"><Calendar className="w-4 h-4"/> Date of Birth</label>
                <input type="date" value={dobISO} onChange={e=>setDobISO(e.target.value)} required max={new Date().toISOString().split('T')[0]} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-purple-heading font-sans focus:outline-none focus:border-purple-400 transition"/>
                {dobISO&&<p className="text-xs text-purple-heading/50 font-sans mt-1">Selected: {isoToDMY(dobISO)}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>{setIsAddOpen(false);setNameInput('');setEmail('');setMobile('');setDobISO(dmyToISO(todayDMY()));}} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-purple-heading/70 font-sans text-sm hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" disabled={isCreating} className="btn-gold flex-1 py-2.5 text-sm whitespace-nowrap">{isCreating?'Adding…':'Add & Generate PDF'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="white-card w-full max-w-3xl overflow-hidden">
        {isLoading?(<div className="py-16 text-center text-purple-heading/50 font-sans">Loading…</div>)
          :employees.length===0?(<div className="py-16 flex flex-col items-center text-center gap-3"><div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center"><Users className="w-7 h-7 text-purple-400"/></div><h3 className="font-serif text-lg font-bold text-purple-heading">No employees yet</h3><p className="text-purple-heading/60 text-sm font-sans max-w-xs">Add employees or use the Import CSV tab to bulk-import.</p></div>)
          :(<>
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-purple-50/40">
              <span className="text-sm font-sans font-medium text-purple-heading/70">{filtered.length} of {employees.length} employee{employees.length!==1?'s':''}</span>
              <span className="text-xs font-sans text-purple-heading/50">Click <Download className="w-3 h-3 inline"/> to download · <Mail className="w-3 h-3 inline"/> to email PDF</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full font-sans text-sm">
                <thead><tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-purple-heading/70 font-semibold">Name</th>
                  <th className="text-left py-3 px-4 text-purple-heading/70 font-semibold hidden sm:table-cell">Email</th>
                  <th className="text-left py-3 px-4 text-purple-heading/70 font-semibold hidden md:table-cell">Mobile</th>
                  <th className="text-left py-3 px-4 text-purple-heading/70 font-semibold">Birthday</th>
                  <th className="text-right py-3 px-4 text-purple-heading/70 font-semibold">Actions</th>
                </tr></thead>
                <tbody>{filtered.map((emp,idx)=>(
                  <tr key={emp.id} className={`border-b border-gray-50 hover:bg-purple-50/30 transition-colors ${idx%2===0?'':'bg-gray-50/30'}`}>
                    <td className="py-3 px-4 font-medium text-purple-heading">{emp.name}</td>
                    <td className="py-3 px-4 text-purple-heading/70 hidden sm:table-cell">{emp.email}</td>
                    <td className="py-3 px-4 text-purple-heading/70 hidden md:table-cell">{(emp as any).mobile||'—'}</td>
                    <td className="py-3 px-4 text-purple-heading/70">{emp.dateOfBirth}</td>
                    <td className="py-3 px-4 text-right"><div className="flex items-center justify-end gap-1">
                      <button onClick={()=>handleDownloadPDF(emp)} className="text-purple-400 hover:text-purple-700 transition-colors p-1.5 rounded-lg hover:bg-purple-50" title="Download birthday card PDF"><Download className="w-4 h-4"/></button>
                      <button onClick={()=>handleSendEmail(emp)} disabled={sendingEmailId===emp.id} className="text-blue-400 hover:text-blue-600 disabled:opacity-40 transition-colors p-1.5 rounded-lg hover:bg-blue-50" title="Send birthday PDF by email">
                        {sendingEmailId===emp.id ? <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin inline-block"/> : <Mail className="w-4 h-4"/>}
                      </button>
                      <button onClick={()=>{if(confirm(`Remove ${emp.name}?`))deleteEmployee({id:emp.id});}} disabled={isDeleting} className="text-red-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50" title="Remove employee"><Trash2 className="w-4 h-4"/></button>
                    </div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </>)}
      </div>
    </>
  );
}

function OrganizationsTab({ flash }: { flash:(m:string,e?:boolean)=>void }) {
  const [orgs,setOrgs]=useState<Org[]>([]);
  const [loading,setLoading]=useState(true);
  const [isFormOpen,setFormOpen]=useState(false);
  const [editOrg,setEditOrg]=useState<Org|null>(null);
  const [sr,setSr]=useState('');
  const [orgName,setOrgName]=useState('');
  const [logoName,setLogoName]=useState('');
  const [logoData,setLogoData]=useState<string|null>(null);
  const [logoPreview,setLogoPreview]=useState<string|null>(null);
  const [saving,setSaving]=useState(false);
  const fileRef=useRef<HTMLInputElement>(null);

  function makeCsvName(name:string){return name.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')||'org';}

  function loadOrgs(){setLoading(true);apiFetch('/api/organizations').then(setOrgs).catch(()=>flash('Failed to load organizations',true)).finally(()=>setLoading(false));}
  useEffect(()=>{loadOrgs();},[]);

  function openAdd(){setEditOrg(null);const nextSr=orgs.length>0?Math.max(...orgs.map(o=>o.sr))+1:1;setSr(String(nextSr));setOrgName('');setLogoName('');setLogoData(null);setLogoPreview(null);setFormOpen(true);}
  function openEdit(o:Org){setEditOrg(o);setSr(String(o.sr));setOrgName(o.orgName);setLogoName(o.logoName??'');setLogoData(o.logoData??null);setLogoPreview(o.logoData??null);setFormOpen(true);}

  function handleLogoFile(e:React.ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(!file)return;setLogoName(file.name);const reader=new FileReader();reader.onloadend=()=>{const b64=reader.result as string;setLogoData(b64);setLogoPreview(b64);};reader.readAsDataURL(file);}

  async function handleSave(e:React.FormEvent){
    e.preventDefault();if(!orgName||!sr)return;setSaving(true);
    try {
      const body={sr:Number(sr),orgName:orgName.trim(),csvName:makeCsvName(orgName.trim()),logoName:logoName||null,logoData};
      if(editOrg){await apiFetch(`/api/organizations/${editOrg.id}`,{method:'PUT',body:JSON.stringify(body)});flash('Organization updated!');}
      else{await apiFetch('/api/organizations',{method:'POST',body:JSON.stringify(body)});flash('Organization added!');}
      setFormOpen(false);loadOrgs();
    } catch(err:any){flash(err.message??'Save failed',true);}
    finally{setSaving(false);}
  }

  async function handleDelete(o:Org){
    if(!confirm(`Delete "${o.orgName}"?`))return;
    try{await apiFetch(`/api/organizations/${o.id}`,{method:'DELETE'});flash('Organization deleted.');loadOrgs();}
    catch(err:any){flash(err.message??'Delete failed',true);}
  }

  return (
    <>
      <div className="flex justify-end w-full max-w-3xl">
        <button onClick={openAdd} className="btn-gold px-6 py-2.5 flex items-center gap-2 text-sm font-semibold"><Plus className="w-4 h-4"/> Add Organization</button>
      </div>
      {isFormOpen&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="white-card p-6 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-2xl font-bold text-purple-heading">{editOrg?'Edit Organization':'Add Organization'}</h2>
              <button onClick={()=>setFormOpen(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400"/></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-semibold font-sans text-purple-heading/60 mb-1 block">Sr. No.</label>
                <div className="w-full px-3 py-2 rounded-xl border border-gray-100 bg-gray-50 text-purple-heading/70 font-sans text-sm select-none">{sr}</div>
              </div>
              <div>
                <label className="text-xs font-semibold font-sans text-purple-heading/60 mb-1 block">Organization Name</label>
                <input type="text" value={orgName} onChange={e=>setOrgName(e.target.value)} required placeholder="e.g. SWS Financial Solutions Pvt. Ltd." className="w-full px-3 py-2 rounded-xl border border-gray-200 text-purple-heading font-sans text-sm focus:outline-none focus:border-purple-400"/>
              </div>
              <div>
                <label className="text-xs font-semibold font-sans text-purple-heading/60 mb-1.5 block">Logo (PNG/JPG) — appears on PDF header</label>
                <div onClick={()=>fileRef.current?.click()} className="border-2 border-dashed border-purple-200 rounded-xl p-4 cursor-pointer hover:border-purple-400 transition flex flex-col items-center gap-2">
                  {logoPreview?<img src={logoPreview} alt="logo preview" className="h-12 object-contain"/>:<><Upload className="w-6 h-6 text-purple-300"/><span className="text-xs text-purple-heading/50 font-sans">Click to upload logo</span></>}
                  {logoName&&<span className="text-xs text-purple-heading/60 font-sans">{logoName}</span>}
                </div>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleLogoFile}/>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setFormOpen(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-purple-heading/70 font-sans text-sm hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" disabled={saving} className="btn-gold flex-1 py-2.5 text-sm">{saving?'Saving…':editOrg?'Update':'Add Organization'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="white-card w-full max-w-3xl overflow-hidden">
        {loading?(<div className="py-16 text-center text-purple-heading/50 font-sans">Loading…</div>)
          :orgs.length===0?(<div className="py-16 flex flex-col items-center gap-3"><Building2 className="w-10 h-10 text-purple-200"/><p className="text-purple-heading/60 font-sans text-sm">No organizations yet. Add one above.</p></div>)
          :(<div className="overflow-x-auto"><table className="w-full font-sans text-sm">
            <thead><tr className="border-b border-gray-100 bg-purple-50/40">
              <th className="text-left py-3 px-4 text-purple-heading/70 font-semibold">Sr</th>
              <th className="text-left py-3 px-4 text-purple-heading/70 font-semibold">Org Name</th>
              <th className="text-left py-3 px-4 text-purple-heading/70 font-semibold hidden md:table-cell">Logo</th>
              <th className="text-right py-3 px-4 text-purple-heading/70 font-semibold">Actions</th>
            </tr></thead>
            <tbody>{orgs.map((o,idx)=>(
              <tr key={o.id} className={`border-b border-gray-50 hover:bg-purple-50/30 transition-colors ${idx%2===0?'':'bg-gray-50/30'}`}>
                <td className="py-3 px-4 text-purple-heading/70">{o.sr}</td>
                <td className="py-3 px-4 font-medium text-purple-heading">{o.orgName}</td>
                <td className="py-3 px-4 hidden md:table-cell">{o.logoData?<img src={o.logoData} alt="logo" className="h-7 object-contain"/>:<span className="text-purple-heading/30 text-xs">—</span>}</td>
                <td className="py-3 px-4 text-right"><div className="flex items-center justify-end gap-1">
                  <button onClick={()=>openEdit(o)} className="text-purple-400 hover:text-purple-700 p-1.5 rounded-lg hover:bg-purple-50 transition" title="Edit"><Edit2 className="w-4 h-4"/></button>
                  <button onClick={()=>handleDelete(o)} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition" title="Delete"><Trash2 className="w-4 h-4"/></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>)}
      </div>
    </>
  );
}

function ImportTab({ flash, setSelectedOrgId }: { flash:(m:string,e?:boolean)=>void; setSelectedOrgId:(id:number|null)=>void; }) {
  const [rows,setRows]=useState<any[]>([]);
  const [importing,setImporting]=useState(false);
  const [results,setResults]=useState<{name:string;success:boolean;error?:string}[]>([]);
  const [fileName,setFileName]=useState('');
  const [orgs,setOrgs]=useState<Org[]>([]);
  const [importOrgId,setImportOrgId]=useState<number|null>(null);
  const [orgSearch,setOrgSearch]=useState('');
  const [showOrgDrop,setShowOrgDrop]=useState(false);
  const fileRef=useRef<HTMLInputElement>(null);
  const orgSearchRef=useRef<HTMLInputElement>(null);

  useEffect(()=>{apiFetch('/api/organizations').then(setOrgs).catch(()=>{});},[]);

  const filteredOrgs=useMemo(()=>!orgSearch.trim()?orgs:orgs.filter(o=>o.orgName.toLowerCase().includes(orgSearch.toLowerCase())||o.csvName.toLowerCase().includes(orgSearch.toLowerCase())),[orgs,orgSearch]);
  useEffect(()=>{if(filteredOrgs.length===1&&orgSearch.trim())setImportOrgId(filteredOrgs[0].id);},[filteredOrgs,orgSearch]);
  const selectedOrg=orgs.find(o=>o.id===importOrgId)??null;
  function selectOrg(o:Org){setImportOrgId(o.id);setOrgSearch(o.orgName);setShowOrgDrop(false);}
  function clearOrg(){setImportOrgId(null);setOrgSearch('');}

  function handleFile(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];if(!file)return;
    setFileName(file.name);setResults([]);
    if(!importOrgId){const base=file.name.replace(/\.[^.]+$/,'').toLowerCase();const matched=orgs.find(o=>o.csvName.toLowerCase()===base||base.includes(o.csvName.toLowerCase())||o.orgName.toLowerCase().includes(base));if(matched){setImportOrgId(matched.id);setOrgSearch(matched.orgName);}}
    Papa.parse(file,{header:true,skipEmptyLines:true,complete:(r)=>{
      const mapped=r.data.map((row:any)=>({name:(row['Name']??row['name']??'').trim(),email:(row['Email']??row['email']??'').trim(),dateOfBirth:(row['DOB']??row['dob']??row['Date of Birth']??row['dateOfBirth']??'').trim(),mobile:(row['Mobile']??row['mobile']??row['Phone']??'').trim()})).filter((r:any)=>r.name&&r.email&&r.dateOfBirth);
      setRows(mapped);
    }});
  }

  async function handleImport(){
    if(!rows.length)return;setImporting(true);
    try {
      const res=await apiFetch('/api/employees/bulk-import',{method:'POST',body:JSON.stringify({employees:rows})});
      setResults(res.results??[]);
      if(importOrgId!==null){setSelectedOrgId(importOrgId);flash(`Imported ${res.imported} of ${res.total} employees. Org "${selectedOrg?.orgName}" set for PDF branding.`);}
      else flash(`Imported ${res.imported} of ${res.total} employees.`);
    } catch(err:any){flash(err.message??'Import failed',true);}
    finally{setImporting(false);}
  }

  return (
    <div className="w-full max-w-3xl flex flex-col gap-4">
      <div className="white-card p-5">
        <label className="text-sm font-semibold font-sans text-purple-heading/80 flex items-center gap-2 mb-3">
          <Building2 className="w-4 h-4 text-purple-400"/> Organization for PDF Branding
        </label>
        <div className="flex gap-3 items-start">
          <div className="flex-1 relative">
            <div className="relative">
              <input ref={orgSearchRef} type="text" placeholder={orgs.length===0?'No organizations added yet…':'Type or select org name…'} value={orgSearch}
                onChange={e=>{setOrgSearch(e.target.value);setImportOrgId(null);setShowOrgDrop(true);}}
                onFocus={()=>setShowOrgDrop(true)} onBlur={()=>setTimeout(()=>setShowOrgDrop(false),150)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-purple-heading font-sans text-sm focus:outline-none focus:border-purple-400 transition pr-8"/>
              {orgSearch&&<button onClick={clearOrg} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5"/></button>}
            </div>
            {showOrgDrop&&filteredOrgs.length>0&&(
              <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded-xl shadow-xl border border-purple-100 overflow-hidden max-h-48 overflow-y-auto">
                {filteredOrgs.map(o=>(
                  <button key={o.id} onMouseDown={()=>selectOrg(o)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-purple-50 transition text-left">
                    {o.logoData?<img src={o.logoData} alt="" className="h-6 w-10 object-contain flex-shrink-0"/>:<div className="h-6 w-10 rounded bg-purple-100 flex-shrink-0"/>}
                    <span className="text-sm font-sans text-purple-heading">{o.orgName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedOrg&&(
            <div className="flex-shrink-0 flex flex-col items-center gap-1">
              {selectedOrg.logoData?<img src={selectedOrg.logoData} alt={selectedOrg.orgName} className="h-10 object-contain border border-purple-100 rounded-lg px-2 bg-white"/>:<div className="h-10 w-20 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center"><Building2 className="w-4 h-4 text-purple-300"/></div>}
              <span className="text-xs font-sans text-green-600 flex items-center gap-1"><Check className="w-3 h-3"/> Matched</span>
            </div>
          )}
        </div>
        {selectedOrg&&<p className="mt-2 text-xs font-sans text-purple-heading/60">PDFs will use <strong>{selectedOrg.orgName}</strong> branding after import.</p>}
      </div>

      <div className="white-card p-5">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5"/>
          <div>
            <h3 className="font-semibold font-sans text-purple-heading text-sm mb-1">CSV Format</h3>
            <p className="text-xs font-sans text-purple-heading/60 leading-relaxed">
              Your CSV must have these column headers (case-insensitive):<br/>
              <code className="bg-purple-50 px-1 rounded text-purple-700">Sr, Name, DOB, Email, Mobile</code><br/>
              DOB format: <code className="bg-purple-50 px-1 rounded text-purple-700">DD/MM/YYYY</code>
            </p>
            <a href={`data:text/csv;charset=utf-8,${encodeURIComponent('Sr,Name,DOB,Email,Mobile\n1,John Smith,15/03/1990,john@example.com,9876543210\n2,Jane Doe,22/07/1985,jane@example.com,')}`} download="sample_employees.csv" className="inline-flex items-center gap-1.5 mt-2 text-xs font-sans text-purple-600 hover:text-purple-800 underline">
              <Download className="w-3 h-3"/> Download sample CSV
            </a>
          </div>
        </div>
      </div>

      <div onClick={()=>fileRef.current?.click()} className="border-2 border-dashed border-purple-200 rounded-2xl p-8 cursor-pointer hover:border-purple-400 transition bg-white/60 flex flex-col items-center gap-3">
        <Upload className="w-8 h-8 text-purple-300"/>
        {fileName?<p className="text-sm font-sans font-medium text-purple-heading">{fileName}</p>:<p className="text-sm font-sans text-purple-heading/50">Click to select a CSV file</p>}
      </div>
      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile}/>

      {rows.length>0&&(
        <div className="white-card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-purple-50/40">
            <span className="text-sm font-sans font-medium text-purple-heading/70">{rows.length} records parsed</span>
            <button onClick={handleImport} disabled={importing} className="btn-gold px-5 py-1.5 text-sm font-semibold flex items-center gap-2">
              <Upload className="w-4 h-4"/>{importing?'Importing…':`Import ${rows.length} Employees`}
            </button>
          </div>
          <div className="overflow-x-auto max-h-64">
            <table className="w-full font-sans text-xs">
              <thead className="sticky top-0 bg-white"><tr className="border-b border-gray-100">
                <th className="text-left py-2 px-4 text-purple-heading/60 font-semibold">Name</th>
                <th className="text-left py-2 px-4 text-purple-heading/60 font-semibold">Email</th>
                <th className="text-left py-2 px-4 text-purple-heading/60 font-semibold">DOB</th>
                <th className="text-left py-2 px-4 text-purple-heading/60 font-semibold">Mobile</th>
              </tr></thead>
              <tbody>{rows.map((r,i)=><tr key={i} className="border-b border-gray-50"><td className="py-2 px-4 text-purple-heading">{r.name}</td><td className="py-2 px-4 text-purple-heading/70">{r.email}</td><td className="py-2 px-4 text-purple-heading/70">{r.dateOfBirth}</td><td className="py-2 px-4 text-purple-heading/70">{r.mobile||'—'}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {results.length>0&&(
        <div className="white-card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-purple-50/40">
            <span className="text-sm font-sans font-semibold text-purple-heading">Import Results: {results.filter(r=>r.success).length} succeeded, {results.filter(r=>!r.success).length} failed</span>
          </div>
          <div className="overflow-x-auto max-h-48">
            <table className="w-full font-sans text-xs"><tbody>{results.map((r,i)=>(
              <tr key={i} className="border-b border-gray-50"><td className="py-2 px-4">{r.success?<Check className="w-3.5 h-3.5 text-green-500 inline mr-1"/>:<X className="w-3.5 h-3.5 text-red-400 inline mr-1"/>}{r.name}</td><td className="py-2 px-4 text-purple-heading/50">{r.error??''}</td></tr>
            ))}</tbody></table>
          </div>
        </div>
      )}
    </div>
  );
}
