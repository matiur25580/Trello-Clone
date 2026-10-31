const mongoose=require('mongoose');
const s=new mongoose.Schema({title:{type:String,required:true},description:String,owner:{type:mongoose.Schema.Types.ObjectId,ref:'User'},members:[{type:mongoose.Schema.Types.ObjectId,ref:'User'}],color:{type:String,default:'#2563eb'},isArchived:{type:Boolean,default:false}},{timestamps:true});
module.exports=mongoose.model('Board',s);
