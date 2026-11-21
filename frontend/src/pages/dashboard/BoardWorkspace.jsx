import {useCallback,useEffect,useState} from 'react';
import {useNavigate,useParams} from 'react-router-dom';
import {apiFetch} from '../../lib/api';

const panel={background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:16,color:'#0f172a'};
const field={padding:9,border:'1px solid #cbd5e1',borderRadius:8,minWidth:0};
const primary={padding:'8px 12px',background:'#2563eb',color:'#fff',border:0,borderRadius:7,cursor:'pointer'};
export default function BoardWorkspace(){
  const {boardId}=useParams();const navigate=useNavigate();
  const [board,setBoard]=useState(null);const [boardTitle,setBoardTitle]=useState('');const [lists,setLists]=useState([]);const [cards,setCards]=useState({});const [listTitle,setListTitle]=useState('');const [listEdits,setListEdits]=useState({});const [cardTitles,setCardTitles]=useState({});const [message,setMessage]=useState('');const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);
  const request=async(path,options)=>{const response=await apiFetch(path,options);const data=await response.json().catch(()=>({}));if(response.status===401){navigate('/login');throw new Error('Your session expired.');}if(!response.ok)throw new Error(data.message||'Request failed.');return data;};
  const load=useCallback(async()=>{setLoading(true);try{const data=await request('/api/kanban/boards/'+encodeURIComponent(boardId)+'/lists');setBoard(data.board||null);setBoardTitle(data.board?.title||'');setLists(data.lists||[]);setListEdits(Object.fromEntries((data.lists||[]).map(list=>[list._id,list.title])));const entries=await Promise.all((data.lists||[]).map(async list=>{const result=await request('/api/kanban/lists/'+encodeURIComponent(list._id)+'/cards');return [list._id,result.cards||[]];}));setCards(Object.fromEntries(entries));setMessage('');}catch(error){setMessage(error.message);if(error.message==='Board not found.')navigate('/dashboard');}finally{setLoading(false);}},[boardId]);
  useEffect(()=>{load();},[load]);
  const saveBoard=async event=>{event.preventDefault();if(!boardTitle.trim()||saving)return;setSaving(true);try{const data=await request('/api/kanban/boards/'+encodeURIComponent(boardId),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:boardTitle})});setBoard(data.board);setBoardTitle(data.board.title);setMessage('Board title updated.');}catch(error){setMessage(error.message);}finally{setSaving(false);}};
  const addList=async event=>{event.preventDefault();if(!listTitle.trim()||saving)return;setSaving(true);try{await request('/api/kanban/lists',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({boardId,title:listTitle})});setListTitle('');await load();}catch(error){setMessage(error.message);}finally{setSaving(false);}};
  const renameList=async listId=>{const title=(listEdits[listId]||'').trim();if(!title)return;try{await request('/api/kanban/lists/'+encodeURIComponent(listId),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({title})});await load();}catch(error){setMessage(error.message);}};
  const addCard=async(listId,event)=>{event.preventDefault();const title=(cardTitles[listId]||'').trim();if(!title)return;try{await request('/api/kanban/cards',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({listId,title})});setCardTitles(old=>({...old,[listId]:''}));await load();}catch(error){setMessage(error.message);}};
  const moveCard=async(card,listId)=>{if(card.list===listId)return;try{await request('/api/kanban/cards/'+encodeURIComponent(card._id),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({listId})});await load();}catch(error){setMessage(error.message);}};
  const archiveCard=async card=>{try{await request('/api/kanban/cards/'+encodeURIComponent(card._id),{method:'DELETE'});await load();}catch(error){setMessage(error.message);}};
  return <main style={{padding:20,maxWidth:1400,margin:'0 auto'}}>
    <button type="button" onClick={()=>navigate('/dashboard')} style={{border:0,background:'transparent',color:'#2563eb',cursor:'pointer',padding:'8px 0'}}>← All boards</button>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:16}}>
      <form onSubmit={saveBoard} style={{display:'flex',gap:8,flex:1,minWidth:240}}><input aria-label="Board title" maxLength={100} value={boardTitle} onChange={e=>setBoardTitle(e.target.value)} style={{...field,flex:1,fontSize:20,fontWeight:700}}/><button disabled={saving||!boardTitle.trim()||boardTitle===board?.title} type="submit" style={primary}>Save board</button></form>
      <form onSubmit={addList} style={{display:'flex',gap:8}}><input aria-label="New list title" maxLength={100} value={listTitle} onChange={e=>setListTitle(e.target.value)} placeholder="New list name" style={field}/><button disabled={saving||!listTitle.trim()} type="submit" style={primary}>+ Add list</button></form>
    </div>
    {board?.description&&<p style={{color:'#64748b'}}>{board.description}</p>}
    {message&&<p role="status" aria-live="polite" style={{background:'#eff6ff',color:'#1e40af',padding:10,borderRadius:8}}>{message}</p>}
    {loading?<p>Loading board…</p>:<section aria-label="Board lists" style={{display:'flex',alignItems:'flex-start',gap:14,overflowX:'auto',padding:'8px 0 24px'}}>
      {lists.map(list=><article key={list._id} style={{...panel,flex:'0 0 280px',background:'#f8fafc'}}>
        <div style={{display:'flex',gap:6,marginBottom:12}}><input aria-label={'List title '+list.title} maxLength={100} value={listEdits[list._id]??list.title} onChange={e=>setListEdits(old=>({...old,[list._id]:e.target.value}))} style={{...field,width:'100%',fontWeight:700}}/><button type="button" disabled={!listEdits[list._id]?.trim()||listEdits[list._id]===list.title} onClick={()=>renameList(list._id)} style={primary}>Save</button></div>
        {(cards[list._id]||[]).map(card=><div key={card._id} style={{...panel,marginBottom:10,boxShadow:'0 1px 2px #00000010'}}>
          <strong>{card.title}</strong>{card.description&&<p style={{fontSize:13,color:'#475569'}}>{card.description}</p>}
          <div style={{display:'flex',gap:6,marginTop:10,alignItems:'center',flexWrap:'wrap'}}>
            <label style={{fontSize:12}}>Move to <select aria-label={'Move '+card.title} value={card.list} onChange={e=>moveCard(card,e.target.value)} style={{maxWidth:130}}>{lists.map(option=><option key={option._id} value={option._id}>{option.title}</option>)}</select></label>
            <button type="button" onClick={()=>archiveCard(card)} style={{marginLeft:'auto',border:0,background:'#fee2e2',color:'#991b1b',borderRadius:6,padding:'5px 8px',cursor:'pointer'}}>Archive</button>
          </div>
        </div>)}
        <form onSubmit={event=>addCard(list._id,event)} style={{display:'flex',gap:6,marginTop:10}}><input aria-label={'New card in '+list.title} maxLength={200} value={cardTitles[list._id]||''} onChange={e=>setCardTitles(old=>({...old,[list._id]:e.target.value}))} placeholder="Add a card…" style={{...field,width:'100%'}}/><button type="submit" style={primary}>+</button></form>
      </article>)}
      {!lists.length&&<p style={{color:'#64748b'}}>No lists yet. Add your first list above.</p>}
    </section>}
  </main>
}
