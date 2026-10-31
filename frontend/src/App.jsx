import {BrowserRouter,Routes,Route,Navigate} from 'react-router-dom';
import {ThemeProvider} from './context/ThemeContext';
import Landing from './pages/auth/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Success from './pages/auth/Success';

function Dashboard(){
  const user=JSON.parse(localStorage.getItem('user')||'{}');
  const now=new Date();
  const date=`${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()}`;
  const time=now.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true});
  return <div style={{padding:32}}>
    <h1>📋 {user.role||'Member'} Dashboard</h1>
    <p>Welcome, <b>{user.fullName}</b> | ID: <code style={{background:'#dbeafe',padding:'4px 8px',borderRadius:6}}>{user.uniqueId}</code></p>
    <p>📅 {date} | 🕒 {time}</p>
    <p style={{background:'#dcfce7',padding:12,borderRadius:8}}>✅ Login successful! Phase 4 e ekhane Board → List → Card Kanban asbe.</p>
    <button onClick={()=>{localStorage.clear();location.href='/';}} style={{padding:'10px 20px',background:'#dc2626',color:'#fff',border:'none',borderRadius:8,cursor:'pointer'}}>Logout</button>
  </div>
}

function Protected({children}){
  return localStorage.getItem('token')?children:<Navigate to="/login"/>;
}

export default function App(){
  return <ThemeProvider><BrowserRouter><Routes>
    <Route path="/" element={<Landing/>}/>
    <Route path="/login" element={<Login/>}/>
    <Route path="/register" element={<Register/>}/>
    <Route path="/success" element={<Success/>}/>
    <Route path="/dashboard" element={<Protected><Dashboard/></Protected>}/>
  </Routes></BrowserRouter></ThemeProvider>
}
