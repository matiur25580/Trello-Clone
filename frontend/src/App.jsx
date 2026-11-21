import {BrowserRouter,Routes,Route,Navigate,useLocation} from 'react-router-dom';
import {useEffect,useState} from 'react';
import {ThemeProvider} from './context/ThemeContext';
import {apiFetch} from './lib/api';
import Landing from './pages/auth/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Success from './pages/auth/Success';
import Kanban from './pages/dashboard/Kanban';
import BoardWorkspace from './pages/dashboard/BoardWorkspace';
import ArchiveBin from './pages/dashboard/ArchiveBin';

function Dashboard({user}){
  const location=useLocation();
  const [logoutError,setLogoutError]=useState('');
  const [loggingOut,setLoggingOut]=useState(false);
  const logout=async()=>{
    if(loggingOut)return;
    setLoggingOut(true);setLogoutError('');
    try{
      const response=await apiFetch('/api/auth/logout',{method:'POST'});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.message||'Unable to sign out. Please retry.');
      window.location.assign('/login');
    }catch(error){
      setLogoutError(error.message==='Failed to fetch'?'Unable to reach the API. Your session may still be active.':error.message);
      setLoggingOut(false);
    }
  };
  const now=new Date();
  const date=`${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()}`;
  const time=now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true});
  const inBoard=location.pathname.startsWith('/dashboard/boards/');
  const inArchive=location.pathname==='/dashboard/archive';
  return <div>
    <header style={{background:'#1e293b',color:'#fff',padding:'12px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
      <b>📋 {user.role} Dashboard | {user.fullName}</b>
      <span>📅 {date} | 🕒 {time} <button type="button" onClick={()=>window.location.assign('/dashboard/archive')} style={{marginLeft:12,padding:'6px 12px',background:'#475569',color:'#fff',border:'none',borderRadius:6,cursor:'pointer'}}>Archive</button><button type="button" disabled={loggingOut} onClick={logout} style={{marginLeft:8,padding:'6px 12px',background:'#dc2626',color:'#fff',border:'none',borderRadius:6,cursor:'pointer'}}>{loggingOut?'Signing out…':'Logout'}</button></span>
    </header>
    {logoutError&&<p role="alert" style={{background:'#fee2e2',color:'#991b1b',padding:10,textAlign:'center'}}>{logoutError}</p>}
    {inArchive?<ArchiveBin/>:inBoard?<BoardWorkspace/>:<Kanban/>}
  </div>
}

function Protected(){
  const [user,setUser]=useState(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    let active=true;
    apiFetch('/api/auth/me')
      .then(async response=>{if(!response.ok)throw new Error('Session expired');return response.json();})
      .then(data=>{if(active&&data.success)setUser(data.user);})
      .catch(()=>{if(active)setUser(null);})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[]);
  if(loading)return <div style={{padding:32,textAlign:'center'}}>Checking your session…</div>;
  return user?<Dashboard user={user}/>:<Navigate to="/login" replace/>;
}

export default function App(){
  return <ThemeProvider><BrowserRouter><Routes>
    <Route path="/" element={<Landing/>}/>
    <Route path="/login" element={<Login/>}/>
    <Route path="/register" element={<Register/>}/>
    <Route path="/success" element={<Success/>}/>
    <Route path="/dashboard/boards/:boardId" element={<Protected/>}/>
    <Route path="/dashboard/*" element={<Protected/>}/>
  </Routes></BrowserRouter></ThemeProvider>
}
