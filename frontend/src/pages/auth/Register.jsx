import {useState} from 'react';import {useNavigate,Link} from 'react-router-dom';
export default function Register(){
  const nav=useNavigate();
  const [f,setF]=useState({fullName:'',email:'',contact:'',dob:'',role:'',password:'',confirm:''});
  const [otp,setOtp]=useState(['','','','','','']);const [step,setStep]=useState(1);const [msg,setMsg]=useState('');const [loading,setLoading]=useState(false);
  const API=(import.meta.env.VITE_API_URL||'http://localhost:5000').replace(/\/$/,'');
  const sendOtp=async()=>{
    if(!f.fullName||!f.email||!f.role||!f.password) return setMsg('Please fill all required fields');
    if(f.password!==f.confirm) return setMsg('Password mismatch');
    setLoading(true);setMsg('Sending OTP... please wait (Render may take 50s first time)');
    try{
      const r=await fetch(`${API}/api/auth/send-otp`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:f.email,role:f.role,purpose:'register'})});
      const d=await r.json(); setMsg(d.message);
      if(d.success) setStep(2); else setMsg(d.message+' | API:'+API);
    }catch(e){setMsg('Network error. API:'+API+' | '+e.message)}
    setLoading(false);
  };
  const doReg=async()=>{
    const otpVal=otp.join('');if(otpVal.length!==6) return setMsg('Enter 6-digit OTP');
    setLoading(true);
    try{
      const r=await fetch(`${API}/api/auth/register`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...f,otp:otpVal})});
      const d=await r.json(); setMsg(d.message);
      if(d.success) nav('/success',{state:d});
    }catch(e){setMsg('Network error: '+e.message)}
    setLoading(false);
  };
  const inp={width:'100%',padding:13,margin:'7px 0',borderRadius:10,border:'1px solid #475569',fontSize:14,boxSizing:'border-box',background:'#2d2d2d',color:'#fff',outline:'none'};
  return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0f172a',padding:20}}>
    <div style={{background:'#1e293b',padding:32,borderRadius:16,width:'100%',maxWidth:440,boxShadow:'0 10px 40px rgba(0,0,0,.4)'}}>
      <h2 style={{color:'#fff',textAlign:'center',marginTop:0}}>Create Account</h2>
      <p style={{color:'#64748b',textAlign:'center',fontSize:12,marginTop:-8}}>API: {API}</p>
      {msg&&<p style={{background:msg.includes('success')||msg.includes('sent')?'#14532d':'#7f1d1d',color:'#fff',padding:10,borderRadius:8,textAlign:'center',fontSize:13}}>{msg}</p>}
      {step===1?<>
        <input placeholder="Full Name" style={inp} value={f.fullName} onChange={e=>setF({...f,fullName:e.target.value})}/>
        <input placeholder="Email" style={inp} value={f.email} onChange={e=>setF({...f,email:e.target.value})}/>
        <input placeholder="Contact Number" style={inp} value={f.contact} onChange={e=>setF({...f,contact:e.target.value})}/>
        <input placeholder="DOB DDMMYYYY (e.g. 29081998)" style={inp} value={f.dob} onChange={e=>setF({...f,dob:e.target.value})}/>
        <select style={{...inp,background:'#5b5b5b'}} value={f.role} onChange={e=>setF({...f,role:e.target.value})}><option value="">Select your role</option><option>Admin</option><option>Manager</option><option>Member</option><option>Viewer</option></select>
        <input type="password" placeholder="Password" style={inp} value={f.password} onChange={e=>setF({...f,password:e.target.value})}/>
        <input type="password" placeholder="Confirm Password" style={inp} value={f.confirm} onChange={e=>setF({...f,confirm:e.target.value})}/>
        <button onClick={sendOtp} disabled={loading} style={{...inp,background:loading?'#64748b':'#2563eb',color:'#fff',fontWeight:'bold',cursor:'pointer',border:'none',fontSize:16}}>{loading?'SENDING...':'SUBMIT'}</button>
      </>:<>
        <p style={{textAlign:'center',color:'#fff'}}>Enter 6-digit OTP sent to {f.email}</p>
        <div style={{display:'flex',gap:8,justifyContent:'center',margin:'12px 0'}}>
          {otp.map((v,i)=><input key={i} maxLength={1} value={v} onChange={e=>{const n=[...otp];n[i]=e.target.value.replace(/\D/g,'');setOtp(n);if(e.target.value&&i<5)document.getElementById('o'+(i+1)).focus();}} id={'o'+i} style={{width:44,height:52,textAlign:'center',fontSize:22,borderRadius:8,border:'1px solid #475569',background:'#2d2d2d',color:'#fff'}}/>)}
        </div>
        <button onClick={doReg} disabled={loading} style={{...inp,background:loading?'#64748b':'#16a34a',color:'#fff',fontWeight:'bold',cursor:'pointer',border:'none'}}>{loading?'VERIFYING...':'Verify & Register'}</button>
        <button onClick={()=>setStep(1)} style={{background:'transparent',color:'#94a3b8',border:'none',cursor:'pointer',width:'100%',marginTop:8}}>← Back to edit details</button>
      </>}
      <p style={{textAlign:'center',color:'#94a3b8'}}>Have account? <Link to="/login" style={{color:'#60a5fa'}}>Login</Link></p>
    </div></div>
}
