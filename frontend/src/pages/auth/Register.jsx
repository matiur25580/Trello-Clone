import {useState} from 'react';
import {useNavigate,Link} from 'react-router-dom';
import {apiFetch} from '../../lib/api';

export default function Register(){
  const navigate=useNavigate();
  const [form,setForm]=useState({fullName:'',email:'',password:'',confirm:''});
  const [otp,setOtp]=useState(['','','','','','']);
  const [step,setStep]=useState(1);
  const [message,setMessage]=useState('');
  const [loading,setLoading]=useState(false);

  const sendOtp=async event=>{
    event.preventDefault();
    if(loading)return;
    if(form.fullName.trim().length<2)return setMessage('Enter your full name (at least 2 characters).');
    if(form.password.length<12)return setMessage('Password must contain at least 12 characters.');
    if(form.password!==form.confirm)return setMessage('Passwords do not match.');
    setLoading(true);setMessage('Sending verification code…');
    try{
      const response=await apiFetch('/api/auth/send-otp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:form.email.trim()})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.success)throw new Error(data.message||'Unable to send verification code.');
      setMessage(data.message||'If the address is eligible, a verification code will be sent.');
      setStep(2);
    }catch(error){setMessage(error.message==='Failed to fetch'?'Unable to reach the API. Please try again.':error.message);}
    finally{setLoading(false);}
  };

  const submitRegistration=async event=>{
    event.preventDefault();
    if(loading)return;
    const code=otp.join('');
    if(!/^\d{6}$/.test(code))return setMessage('Enter the six-digit verification code.');
    setLoading(true);setMessage('');
    try{
      const response=await apiFetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fullName:form.fullName.trim(),email:form.email.trim(),password:form.password,otp:code})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.success)throw new Error(data.message||'Unable to create account.');
      navigate('/success',{state:data,replace:true});
    }catch(error){setMessage(error.message==='Failed to fetch'?'Unable to reach the API. Please try again.':error.message);}
    finally{setLoading(false);}
  };

  const updateOtp=(index,value)=>{
    const digit=value.replace(/\D/g,'').slice(-1);
    setOtp(old=>old.map((item,i)=>i===index?digit:item));
    if(digit&&index<5)document.getElementById('register-otp-'+(index+1))?.focus();
  };
  const input={width:'100%',padding:13,margin:'7px 0',borderRadius:10,border:'1px solid #475569',fontSize:14,boxSizing:'border-box',background:'#2d2d2d',color:'#fff',outline:'none'};
  return <main style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0f172a',padding:20}}>
    <section style={{background:'#1e293b',padding:32,borderRadius:16,width:'100%',maxWidth:440,boxShadow:'0 10px 40px rgba(0,0,0,.4)'}}>
      <h2 style={{color:'#fff',textAlign:'center',marginTop:0}}>Create Account</h2>
      {message&&<p role="status" aria-live="polite" style={{background:'#334155',color:'#fff',padding:10,borderRadius:8,textAlign:'center',fontSize:13}}>{message}</p>}
      {step===1?<form onSubmit={sendOtp}>
        <label htmlFor="register-name" style={{color:'#e2e8f0',fontSize:13}}>Full name</label>
        <input id="register-name" required minLength={2} maxLength={100} autoComplete="name" value={form.fullName} onChange={event=>setForm(old=>({...old,fullName:event.target.value}))} placeholder="Full Name" style={input}/>
        <label htmlFor="register-email" style={{color:'#e2e8f0',fontSize:13}}>Email</label>
        <input id="register-email" required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={event=>setForm(old=>({...old,email:event.target.value}))} placeholder="Email" style={input}/>
        <p style={{color:'#94a3b8',fontSize:13}}>New accounts are created with the Member role. Workspace administrators can grant additional access.</p>
        <p style={{color:'#94a3b8',fontSize:12}}>Use at least 12 characters for your password.</p>
        <label htmlFor="register-password" style={{color:'#e2e8f0',fontSize:13}}>Password</label>
        <input id="register-password" required minLength={12} maxLength={128} type="password" autoComplete="new-password" value={form.password} onChange={event=>setForm(old=>({...old,password:event.target.value}))} placeholder="Password" style={input}/>
        <label htmlFor="register-confirm" style={{color:'#e2e8f0',fontSize:13}}>Confirm password</label>
        <input id="register-confirm" required type="password" maxLength={128} autoComplete="new-password" value={form.confirm} onChange={event=>setForm(old=>({...old,confirm:event.target.value}))} placeholder="Confirm Password" style={input}/>
        <button type="submit" disabled={loading} style={{...input,background:loading?'#64748b':'#2563eb',color:'#fff',fontWeight:'bold',cursor:loading?'wait':'pointer',border:'none',fontSize:16}}>{loading?'SENDING…':'Send verification code'}</button>
      </form>:<form onSubmit={submitRegistration}>
        <p style={{textAlign:'center',color:'#fff'}}>Enter the six-digit code sent to {form.email}</p>
        <div style={{display:'flex',gap:8,justifyContent:'center',margin:'12px 0'}}>
          {otp.map((value,index)=><input key={index} id={'register-otp-'+index} aria-label={'Verification digit '+(index+1)} inputMode="numeric" autoComplete={index===0?'one-time-code':'off'} pattern="[0-9]" maxLength={1} value={value} onChange={event=>updateOtp(index,event.target.value)} onKeyDown={event=>{if(event.key==='Backspace'&&!otp[index]&&index>0)document.getElementById('register-otp-'+(index-1))?.focus();}} style={{width:44,height:52,textAlign:'center',fontSize:22,borderRadius:8,border:'1px solid #475569',background:'#2d2d2d',color:'#fff'}}/>)}
        </div>
        <button type="submit" disabled={loading||otp.join('').length!==6} style={{...input,background:loading?'#64748b':'#16a34a',color:'#fff',fontWeight:'bold',cursor:loading?'wait':'pointer',border:'none'}}>{loading?'VERIFYING…':'Verify & Register'}</button>
        <button type="button" onClick={()=>{setStep(1);setOtp(['','','','','','']);setMessage('');}} style={{background:'transparent',color:'#94a3b8',border:'none',cursor:'pointer',width:'100%',marginTop:8}}>← Back to edit details</button>
      </form>}
      <p style={{textAlign:'center',color:'#94a3b8',marginTop:16}}>Have an account? <Link to="/login" style={{color:'#60a5fa'}}>Login</Link></p>
    </section>
  </main>;
}
