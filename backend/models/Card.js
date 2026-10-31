const mongoose=require('mongoose');
const s=new mongoose.Schema({title:{type:String,required:true},description:String,list:{type:mongoose.Schema.Types.ObjectId,ref:'List',required:true},board:{type:mongoose.Schema.Types.ObjectId,ref:'Board'},labels:[String],priority:{type:String,enum:['Low','Medium','High','Urgent'],default:'Medium'},dueDate:Date,checklist:[{text:String,done:Boolean}],position:{type:Number,default:0},isArchived:{type:Boolean,default:false}},{timestamps:true});
module.exports=mongoose.model('Card',s);
