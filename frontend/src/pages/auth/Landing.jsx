import {useNavigate} from 'react-router-dom';
export default function Landing(){
  const nav=useNavigate();
  return <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#667eea,#764ba2,#f093fb)',padding:20,textAlign:'center'}}>
    <h1 style={{fontSize:48,color:'#fff',margin:0}}>📋 Trello Clone</h1>
    <p style={{color:'#fff',fontSize:18,maxWidth:500}}>Enterprise-grade project management with AI power, real-time collaboration, boards, lists & cards.</p>
    <div style={{display:'flex',gap:12,marginTop:20}}>
      <button onClick={()=>nav('/login')} style={{padding:'14px 32px',fontSize:16,borderRadius:10,border:'none',background:'#fff',color:'#667eea',fontWeight:'bold',cursor:'pointer'}}>Login</button>
      <button onClick={()=>nav('/register')} style={{padding:'14px 32px',fontSize:16,borderRadius:10,border:'2px solid #fff',background:'transparent',color:'#fff',fontWeight:'bold',cursor:'pointer'}}>Register</button>
    </div>
  </div>
}
