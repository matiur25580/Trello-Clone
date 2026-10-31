import {useState,useEffect} from 'react';
export default function Kanban(){
  const [boards,setBoards]=useState([]);const [title,setTitle]=useState('');const [msg,setMsg]=useState('');
  const API=import.meta.env.VITE_API_URL||'http://localhost:5000';
  const token=localStorage.getItem('token');
  const load=async()=>{const r=await fetch(`${API}/api/kanban/boards`,{headers:{Authorization:`Bearer ${token}`}});const d=await r.json();if(d.success)setBoards(d.boards);};
  useEffect(()=>{load()},[]);
  const create=async()=>{if(!title)return;const r=await fetch(`${API}/api/kanban/boards`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({title})});const d=await r.json();setMsg(d.message);setTitle('');load();};
  return <div style={{padding:24}}>
    <h2>📌 My Boards</h2>
    {msg&&<p style={{background:'#dcfce7',padding:10,borderRadius:8}}>{msg}</p>}
    <div style={{display:'flex',gap:8,marginBottom:16}}>
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="New board title..." style={{padding:10,borderRadius:8,border:'1px solid #cbd5e1',flex:1}}/>
      <button onClick={create} style={{padding:'10px 20px',background:'#2563eb',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontWeight:'bold'}}>+ Create Board</button>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:16}}>
      {boards.map(b=><div key={b._id} style={{background:b.color||'#2563eb',color:'#fff',padding:20,borderRadius:12,cursor:'pointer',minHeight:100}}>
        <h3 style={{margin:0}}>{b.title}</h3><p style={{opacity:.8,fontSize:13}}>{b.description||'No description'}</p>
      </div>)}
    </div>
    {boards.length===0&&<p style={{color:'#64748b'}}>No boards yet. Create your first board above.</p>}
  </div>
}
