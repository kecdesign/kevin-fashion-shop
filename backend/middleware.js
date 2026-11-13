const jwt=require('jsonwebtoken');
exports.auth=(req,res,next)=>{const h=req.headers.authorization; if(!h?.startsWith('Bearer ')) return res.status(401).json({message:'Injira muri konti yawe / Please log in'}); try{req.user=jwt.verify(h.slice(7),process.env.JWT_SECRET);next()}catch{return res.status(401).json({message:'Session yarangiye / Session expired'})}};
exports.admin=(req,res,next)=>req.user?.role==='admin'?next():res.status(403).json({message:'Admin only'});
