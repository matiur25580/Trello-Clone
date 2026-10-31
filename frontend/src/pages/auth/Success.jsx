import {useLocation,useNavigate} from 'react-router-dom';
export default function Success(){
  const {state}=useLocation();const nav=useNavigate();
  return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f0fdf4',padding:20}}>
    <div style={{background:'#fff',padding:40,borderRadius:16,textAlign:'center',maxWidth:440,width:'100%',boxShadow:'0 10px 40px rgba(0,0,0,.1)'}}>
      <div style={{fontSize:56}}>🎉</div>
      <h2>Welcome, {state?.fullName} ({state?.role})!</h2>
      <p>Registration successful. Save your Unique ID for future login:</p>
      <div style={{background:'#2563eb',color:'#fff',fontSize:28,fontWeight:'bold',letterSpacing:2,padding:20,borderRadius:12,margin:'16px 0'}}>{state?.uniqueId}</div>
      <p style={{color:'#dc2626',fontSize:13}}>⚠️ Please save this ID. You can login with Email or Unique ID.</p>
      <button onClick={()=>nav('/login')} style={{padding:'12px 32px',background:'#16a34a',color:'#fff',border:'none',borderRadius:10,fontWeight:'bold',cursor:'pointer',marginTop:12}}>Go to Login</button>
    </div></div>
}
