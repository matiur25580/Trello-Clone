const jwt=require('jsonwebtoken');
module.exports=(roles=[])=> (req,res,next)=>{
  const h=req.headers.authorization;
  if(!h) return res.status(401).json({message:'No token'});
  try{
    const d=jwt.verify(h.split(' ')[1],process.env.JWT_SECRET);
    if(roles.length && !roles.includes(d.role)) return res.status(403).json({message:'Access denied'});
    req.user=d; next();
  }catch(e){res.status(401).json({message:'Invalid token'})}
};
