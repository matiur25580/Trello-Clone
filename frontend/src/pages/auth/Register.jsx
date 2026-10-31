import {useState} from 'react';import {useNavigate,Link} from 'react-router-dom';
export default function Register(){
  const nav=useNavigate();
  const [f,setF]=useState({fullName:'',email:'',contact:'',dob:'',role:'',password:'',confirm:''});
  const [otp,setOtp]=useState(['','','','','','']);const [step,setStep]=useState(1);const [msg,setMsg]=useState('');
  const API=import.meta.env.VITE_API_URL||'http://localhost:5000';
  const sendOtp=async()=>{
    if(f.password!==f.confirm) return setMsg('Password mismatch');
    const r=await fetch(`${API}/api/auth/send-otp`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:f.email,role:f.role,purpose:'register'})});
    const d=await r.json(); setMsg(d.message); if(d.success) setStep(2);
  };
  const doReg=async()=>{
    const otpVal=otp.join('');
    const r=await fetch(`${API}/api/auth/register`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...f,otp:otpVal})});
    const d=await r.json(); setMsg(d.message);
    if(d.success) nav('/success',{state:d});
  };
  const inp={width:'100%',padding:12,margin:'6px 0',borderRadius:8,border:'1px solid #cbd5e1',fontSize:14,boxSizing:'border-box'};
  return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f1f5f9',padding:20}}>
    <div style={{background:'#fff',padding:32,borderRadius:16,width:'100%',maxWidth:440,boxShadow:'0 10px 40px rgba(0,0,0,.1)'}}>
      <h2 style={{color:'#2563eb',textAlign:'center'}}>Create Account</h2>
      {msg&&<p style={{background:'#dbeafe',color:'#1e40af',padding:10,borderRadius:8,textAlign:'center'}}>{msg}</p>}
      {step===1?<>
        <input placeholder="Full Name" style={inp} onChange={e=>setF({...f,fullName:e.target.value})}/>
        <input placeholder="Email" style={inp} onChange={e=>setF({...f,email:e.target.value})}/>
        <input placeholder="Contact Number" style={inp} onChange={e=>setF({...f,contact:e.target.value})}/>
        <input placeholder="DOB DDMMYYYY" style={inp} onChange={e=>setF({...f,dob:e.target.value})}/>
        <select style={inp} value={f.role} onChange={e=>setF({...f,role:e.target.value})}><option value="">Select your role</option><option>Admin</option><option>Manager</option><option>Member</option><option>Viewer</option></select>
        <input type="password" placeholder="Password" style={inp} onChange={e=>setF({...f,password:e.target.value})}/>
        <input type="password" placeholder="Confirm Password" style={inp} onChange={e=>setF({...f,confirm:e.target.value})}/>
        <button onClick={sendOtp} style={{...inp,background:'#2563eb',color:'#fff',fontWeight:'bold',cursor:'pointer',border:'none'}}>SUBMIT</button>
      </>:<>
        <p style={{textAlign:'center'}}>Enter 6-digit OTP</p>
        <div style={{display:'flex',gap:8,justifyContent:'center',margin:'12px 0'}}>
          {otp.map((v,i)=><input key={i} maxLength={1} value={v} onChange={e=>{const n=[...otp];n[i]=e.target.value;setOtp(n);if(e.target.value&&i<5)document.getElementById('o'+(i+1)).focus();}} id={'o'+i} style={{width:44,height:52,textAlign:'center',fontSize:22,borderRadius:8,border:'1px solid #cbd5e1'}}/>)}
        </div>
        <button onClick={doReg} style={{...inp,background:'#16a34a',color:'#fff',fontWeight:'bold',cursor:'pointer',border:'none'}}>Verify & Register</button>
      </>}
      <p style={{textAlign:'center'}}>Have account? <Link to="/login">Login</Link></p>
    </div></div>
}
