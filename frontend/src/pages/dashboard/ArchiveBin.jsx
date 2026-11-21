import {useCallback,useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {apiFetch} from '../../lib/api';

export default function ArchiveBin(){
  const navigate=useNavigate();
  const [archive,setArchive]=useState({boards:[],lists:[],cards:[]});
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState('');
  const fetchArchive=useCallback(async()=>{
    const response=await apiFetch('/api/kanban/archive');
    const data=await response.json().catch(()=>({}));
    if(response.status===401){navigate('/login');throw new Error('Your session expired.');}
    if(!response.ok)throw new Error(data.message||'Unable to load archive.');
    return {boards:data.boards||[],lists:data.lists||[],cards:data.cards||[]};
  },[navigate]);
  const load=useCallback(async()=>{
    try{setArchive(await fetchArchive());setMessage('');}
    catch(error){setMessage(error.message||'Unable to load archive.');}
    finally{setLoading(false);}
  },[fetchArchive]);
  useEffect(()=>{
    let active=true;
    fetchArchive()
      .then(data=>{if(active)setArchive(data);})
      .catch(error=>{if(active)setMessage(error.message||'Unable to load archive.');})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[fetchArchive]);
  const restore=async(kind,id)=>{
    const key=kind+':'+id;
    if(busy)return;
    setBusy(key);setMessage('');
    try{
      const response=await apiFetch('/api/kanban/'+kind+'/'+encodeURIComponent(id)+'/restore',{method:'POST'});
      const data=await response.json().catch(()=>({}));
      if(response.status===401){navigate('/login');return;}
      if(!response.ok)throw new Error(data.message||'Unable to restore item.');
      await load();
    }catch(error){setMessage(error.message||'Unable to restore item.');}
    finally{setBusy('');}
  };
  const boardIds=new Set(archive.boards.map(item=>String(item._id)));
  const listIds=new Set(archive.lists.map(item=>String(item._id)));
  const total=archive.boards.length+archive.lists.length+archive.cards.length;
  const section={background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:16,marginBottom:14};
  const row={display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'10px 0',borderBottom:'1px solid #f1f5f9'};
  const button={padding:'7px 11px',border:0,borderRadius:7,background:'#2563eb',color:'#fff',cursor:'pointer'};
  return <main style={{padding:24,maxWidth:1000,margin:'0 auto'}}>
    <button type="button" onClick={()=>navigate('/dashboard')} style={{border:0,background:'transparent',color:'#2563eb',cursor:'pointer',padding:'8px 0'}}>← All boards</button>
    <h2>Archive bin</h2>
    <p style={{color:'#64748b'}}>Archived items are retained. Restore parent boards and lists before restoring their cards.</p>
    {message&&<p role="alert" style={{background:'#fee2e2',color:'#991b1b',padding:10,borderRadius:8}}>{message}</p>}
    {loading?<p>Loading archive…</p>:total===0?<p style={{color:'#64748b'}}>Your archive is empty.</p>:<>
      <section style={section}><h3>Boards ({archive.boards.length})</h3>
        {archive.boards.map(item=><div key={item._id} style={row}><strong>{item.title}</strong><button type="button" disabled={!!busy} onClick={()=>restore('boards',item._id)} style={button}>{busy==='boards:'+item._id?'Restoring…':'Restore board'}</button></div>)}
        {!archive.boards.length&&<small style={{color:'#64748b'}}>No archived boards</small>}
      </section>
      <section style={section}><h3>Lists ({archive.lists.length})</h3>
        {archive.lists.map(item=><div key={item._id} style={row}><strong>{item.title}</strong><button type="button" disabled={!!busy||boardIds.has(String(item.board))} title={boardIds.has(String(item.board))?'Restore the parent board first':''} onClick={()=>restore('lists',item._id)} style={button}>{busy==='lists:'+item._id?'Restoring…':'Restore list'}</button></div>)}
        {!archive.lists.length&&<small style={{color:'#64748b'}}>No archived lists</small>}
      </section>
      <section style={section}><h3>Cards ({archive.cards.length})</h3>
        {archive.cards.map(item=><div key={item._id} style={row}><div><strong>{item.title}</strong><small style={{display:'block',color:'#64748b'}}>{item.priority||'Medium'} priority</small></div><button type="button" disabled={!!busy||boardIds.has(String(item.board))||listIds.has(String(item.list))} title={boardIds.has(String(item.board))||listIds.has(String(item.list))?'Restore the parent board and list first':''} onClick={()=>restore('cards',item._id)} style={button}>{busy==='cards:'+item._id?'Restoring…':'Restore card'}</button></div>)}
        {!archive.cards.length&&<small style={{color:'#64748b'}}>No archived cards</small>}
      </section>
    </>}
  </main>;
}
