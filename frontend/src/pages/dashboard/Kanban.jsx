import {useState,useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {apiFetch} from '../../lib/api';
export default function Kanban(){
  const navigate=useNavigate();
  const [boards,setBoards]=useState([]);const [title,setTitle]=useState('');const [msg,setMsg]=useState('');const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);
  const load=async()=>{try{const r=await apiFetch('/api/kanban/boards');const d=await r.json();if(r.status===401){navigate('/login');return;}if(!r.ok)throw new Error(d.message||'Unable to load boards.');if(d.success)setBoards(d.boards);setMsg('');}catch(e){setMsg(e.message||'Unable to load boards.');}finally{setLoading(false);}};
  useEffect(()=>{load()},[]);
  const create=async()=>{if(!title.trim()||saving)return;setSaving(true);try{const r=await apiFetch('/api/kanban/boards',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title})});const d=await r.json();if(r.status===401){navigate('/login');return;}if(!r.ok)throw new Error(d.message||'Unable to create board.');setTitle('');await load();}catch(e){setMsg(e.message||'Unable to create board.');}finally{setSaving(false);}};
  return <main style={{padding:24,maxWidth:1200,margin:'0 auto'}}>
    <h2>📌 My Boards</h2>
    {msg&&<p role="alert" style={{background:'#fee2e2',color:'#991b1b',padding:10,borderRadius:8}}>{msg}</p>}
    <form onSubmit={e=>{e.preventDefault();create();}} style={{display:'flex',gap:8,marginBottom:20}}>
      <input aria-label="New board title" maxLength={100} value={title} onChange={e=>setTitle(e.target.value)} placeholder="New board title..." style={{padding:10,borderRadius:8,border:'1px solid #cbd5e1',flex:1,minWidth:0}}/>
      <button disabled={saving||!title.trim()} type="submit" style={{padding:'10px 20px',background:'#2563eb',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontWeight:'bold'}}>{saving?'Creating…':'+ Create Board'}</button>
    </form>
    {loading&&<p>Loading your boards…</p>}
    {!loading&&boards.length===0&&<p style={{color:'#64748b'}}>No boards yet. Create your first board above.</p>}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:16}}>
      {boards.map(b=><button type="button" key={b._id} onClick={()=>navigate('/dashboard/boards/'+b._id)} style={{textAlign:'left',background:b.color||'#2563eb',color:'#fff',padding:20,borderRadius:12,cursor:'pointer',minHeight:120,border:0}}>
        <h3 style={{margin:0}}>{b.title}</h3><p style={{opacity:.85,fontSize:13}}>{b.description||'Open board to manage lists and cards'}</p><span style={{fontSize:12,fontWeight:600}}>Open board →</span>
      </button>)}
    </div>
  </main>
}
