import {useState} from 'react';import {useNavigate,Link} from 'react-router-dom';
export default function Login(){
  const nav=useNavigate();const [f,setF]=useState({emailOrId:'',password:'',role:''});const [msg,setMsg]=useState('');const [show,setShow]=useState(false);
  const API=import.meta.env.VITE_API_URL||'http://localhost:5000';
  const doLogin=async()=>{
    const r=await fetch(`${API}/api/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(f)});
    const d=await r.json(); setMsg(d.message);
    if(d.success){localStorage.setItem('token',d.token);localStorage.setItem('user',JSON.stringify(d.user));nav('/dashboard');}
  };
  const inp={width:'100%',padding:12,margin:'6px 0',borderRadius:8,border:'1px solid #cbd5e1',fontSize:14,boxSizing:'border-box'};
  return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0f172a',padding:20}}>
    <div style={{background:'#1e293b',padding:32,borderRadius:16,width:'100%',maxWidth:400}}>
      <h2 style={{color:'#fff',textAlign:'center'}}>Welcome Back</h2>
      {msg&&<p style={{background:'#1e40af',color:'#fff',padding:10,borderRadius:8,textAlign:'center'}}>{msg}</p>}
      <select style={inp} value={f.role} onChange={e=>setF({...f,role:e.target.value})}><option value="">Select your role</option><option>Admin</option><option>Manager</option><option>Member</option><option>Viewer</option></select>
      <input placeholder="Email or Unique ID" style={inp} onChange={e=>setF({...f,emailOrId:e.target.value})}/>
      <div style={{position:'relative'}}><input type={show?'text':'password'} placeholder="Password" style={inp} onChange={e=>setF({...f,password:e.target.value})}/><span onClick={()=>setShow(!show)} style={{position:'absolute',right:12,top:16,cursor:'pointer'}}>👁️</span></div>
      <button onClick={doLogin} style={{...inp,background:'#2563eb',color:'#fff',fontWeight:'bold',cursor:'pointer',border:'none'}}>Login</button>
      <p style={{textAlign:'center',color:'#94a3b8'}}>No account? <Link to="/register" style={{color:'#60a5fa'}}>Register</Link></p>
    </div></div>
}
