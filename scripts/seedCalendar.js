// scripts/seedJulyCurrent.js
require('dotenv').config();
const mongoose = require('mongoose');
const Record   = require('../models/Record');
const Employee = require('../models/Employee');

async function main(){
  await mongoose.connect(process.env.MONGODB_URI);
  const emp = await Employee.findOne();
  if(!emp) throw new Error('No hay empleados');

  const today = new Date();               // 2025-07-06T…
  const year  = today.getFullYear();      // 2025
  const month = String(today.getMonth()+1).padStart(2,'0'); // "07"

  const days = [1,2,3,4,5,6];
  const recs = days.flatMap(d => {
    const dd = String(d).padStart(2,'0');
    return [
      { employeeId: emp._id, type: 'in',       timestamp: new Date(`${year}-${month}-${dd}T08:05:00Z`) },
      { employeeId: emp._id, type: 'lunchOut', timestamp: new Date(`${year}-${month}-${dd}T12:00:00Z`) },
      { employeeId: emp._id, type: 'lunchIn',  timestamp: new Date(`${year}-${month}-${dd}T12:30:00Z`) },
      { employeeId: emp._id, type: 'out',      timestamp: new Date(`${year}-${month}-${dd}T17:10:00Z`) }
    ];
  });

  await Record.insertMany(recs);
  console.log(`✅ Insertadas ${recs.length} marcaciones para ${year}-${month}`);
  mongoose.disconnect();
}

main().catch(e=>{console.error(e);mongoose.disconnect();});
