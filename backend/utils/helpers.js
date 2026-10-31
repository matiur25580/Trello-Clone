function generateUniqueId(role,fullName,dob){
  const X=(role||'M')[0].toUpperCase();
  const parts=fullName.trim().split(' ');
  const Y=(parts[0]||'X')[0].toUpperCase();
  const Z=(parts[1]||parts[0]||'X')[0].toUpperCase();
  const d=dob.replace(/\D/g,'').padStart(8,'0');
  return `${X}${Y}${Z}${d}`;
}
module.exports={generateUniqueId};
