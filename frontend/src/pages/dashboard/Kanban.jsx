import {useCallback,useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {apiFetch} from '../../lib/api';

export default function Kanban({user}){
  const readOnly=user?.role==='Viewer';
  const navigate=useNavigate();
  const [boards,setBoards]=useState([]);
  const [title,setTitle]=useState('');
  const [message,setMessage]=useState('');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);

  const load=useCallback(async()=>{
    try{
      const response=await apiFetch('/api/kanban/boards');
      const data=await response.json().catch(()=>({}));
      if(response.status===401){navigate('/login');return;}
      if(!response.ok)throw new Error(data.message||'Unable to load boards.');
      if(data.success)setBoards(data.boards||[]);
      setMessage('');
    }catch(error){setMessage(error.message||'Unable to load boards.');}
    finally{setLoading(false);}
  },[navigate]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Route entry starts an async API fetch; state updates follow network responses.
  useEffect(()=>{void load();},[load]);

  const create=async event=>{
    event.preventDefault();
    if(!title.trim()||saving)return;
    setSaving(true);
    try{
      const response=await apiFetch('/api/kanban/boards',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:title.trim()})});
      const data=await response.json().catch(()=>({}));
      if(response.status===401){navigate('/login');return;}
      if(!response.ok)throw new Error(data.message||'Unable to create board.');
      setTitle('');
      await load();
    }catch(error){setMessage(error.message||'Unable to create board.');}
    finally{setSaving(false);}
  };

  return <main style={{padding:24,maxWidth:1200,margin:'0 auto'}}>
    <h2>📌 My Boards</h2>
    {message&&<p role="alert" style={{background:'#fee2e2',color:'#991b1b',padding:10,borderRadius:8}}>{message}</p>}
    {readOnly&&<p role="status" style={{background:'#eff6ff',color:'#1e40af',padding:10,borderRadius:8}}>Viewer access is read-only. You can browse boards but cannot create or change them.</p>}
    {!readOnly&&<form onSubmit={create} style={{display:'flex',gap:8,marginBottom:20}}>
      <input aria-label="New board title" required maxLength={100} value={title} onChange={event=>setTitle(event.target.value)} placeholder="New board title…" style={{padding:10,borderRadius:8,border:'1px solid #cbd5e1',flex:1,minWidth:0}}/>
      <button disabled={saving||!title.trim()} type="submit" style={{padding:'10px 20px',background:'#2563eb',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontWeight:'bold'}}>{saving?'Creating…':'+ Create Board'}</button>
    </form>}
    {loading&&<p>Loading your boards…</p>}
    {!loading&&boards.length===0&&<p style={{color:'#64748b'}}>No boards yet. Create your first board above.</p>}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:16}}>
      {boards.map(board=><button type="button" key={board._id} onClick={()=>navigate('/dashboard/boards/'+board._id)} style={{textAlign:'left',background:board.color||'#2563eb',color:'#fff',padding:20,borderRadius:12,cursor:'pointer',minHeight:120,border:0}}>
        <h3 style={{margin:0}}>{board.title}</h3><p style={{opacity:.85,fontSize:13}}>{board.description||'Open board to manage lists and cards'}</p><span style={{fontSize:12,fontWeight:600}}>Open board →</span>
      </button>)}
    </div>
  </main>;
}
