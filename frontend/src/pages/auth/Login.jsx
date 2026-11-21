import {useState} from 'react';
import {useNavigate,Link} from 'react-router-dom';
import {apiFetch} from '../../lib/api';

export default function Login(){
  const navigate=useNavigate();
  const [form,setForm]=useState({emailOrId:'',password:''});
  const [message,setMessage]=useState('');
  const [showPassword,setShowPassword]=useState(false);
  const [loading,setLoading]=useState(false);

  const submit=async event=>{
    event.preventDefault();
    if(loading)return;
    setLoading(true);
    setMessage('');
    try{
      const response=await apiFetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.success)throw new Error(data.message||'Unable to sign in.');
      navigate('/dashboard',{replace:true});
    }catch(error){
      setMessage(error.message==='Failed to fetch'?'Unable to reach the API. Please try again.':error.message);
    }finally{
      setLoading(false);
    }
  };

  const input={width:'100%',padding:12,margin:'6px 0',borderRadius:8,border:'1px solid #cbd5e1',fontSize:14,boxSizing:'border-box'};
  return <main style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0f172a',padding:20}}>
    <form onSubmit={submit} style={{background:'#1e293b',padding:32,borderRadius:16,width:'100%',maxWidth:400}}>
      <h2 style={{color:'#fff',textAlign:'center'}}>Welcome Back</h2>
      {message&&<p role="alert" style={{background:'#7f1d1d',color:'#fff',padding:10,borderRadius:8,textAlign:'center'}}>{message}</p>}
      <label htmlFor="login-identity" style={{color:'#e2e8f0',fontSize:13}}>Email or unique ID</label>
      <input id="login-identity" required autoComplete="username" value={form.emailOrId} onChange={event=>setForm(old=>({...old,emailOrId:event.target.value}))} placeholder="Email or Unique ID" style={input}/>
      <label htmlFor="login-password" style={{color:'#e2e8f0',fontSize:13}}>Password</label>
      <div style={{position:'relative'}}>
        <input id="login-password" required autoComplete="current-password" type={showPassword?'text':'password'} value={form.password} onChange={event=>setForm(old=>({...old,password:event.target.value}))} placeholder="Password" style={{...input,paddingRight:76}}/>
        <button type="button" aria-label={showPassword?'Hide password':'Show password'} aria-pressed={showPassword} onClick={()=>setShowPassword(value=>!value)} style={{position:'absolute',right:8,top:10,border:0,background:'transparent',color:'#2563eb',cursor:'pointer',padding:6}}>{showPassword?'Hide':'Show'}</button>
      </div>
      <button type="submit" disabled={loading||!form.emailOrId.trim()||!form.password} style={{...input,background:loading?'#64748b':'#2563eb',color:'#fff',fontWeight:'bold',cursor:loading?'wait':'pointer',border:'none'}}>{loading?'Signing in…':'Login'}</button>
      <p style={{textAlign:'center',color:'#94a3b8'}}>No account? <Link to="/register" style={{color:'#60a5fa'}}>Register</Link></p>
    </form>
  </main>;
}
