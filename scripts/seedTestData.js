// scripts/seedWithRecords.js
require('dotenv').config();
const mongoose = require('mongoose');
const Schedule = require('../models/Schedule');
const Employee = require('../models/Employee');
const Record   = require('../models/Record');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  // 1) Limpia datos anteriores
  await Schedule.deleteMany({});
  await Employee.deleteMany({});
  await Record.deleteMany({});

  // 2) Crea 3 horarios
  const schedules = await Schedule.create([
    { name: 'Mañana', startTime: '08:00', endTime: '16:00', lunchDuration: 30 },
    { name: 'Tarde',  startTime: '14:00', endTime: '22:00', lunchDuration: 30 },
    { name: 'Mixto',  startTime: '09:00', endTime: '17:00', lunchDuration: 30 }
  ]);

  console.log('Horarios:', schedules.map(s => s.name));

  // 3) Crea 25 empleados cíclicos
  const employeesData = [];
  for (let i = 1; i <= 25; i++) {
    employeesData.push({
      code:         `EMP${String(i).padStart(4, '0')}`,
      name:         `Empleado ${i}`,
      department:   ['Ventas','RRHH','IT','Logística'][i % 4],
      scheduleId:   schedules[i % schedules.length]._id
    });
  }
  const employees = await Employee.insertMany(employeesData);
  console.log(`Creado ${employees.length} empleados`);

  // 4) Crea marcaciones de ejemplo para los primeros 5 empleados
  const today = new Date();
  today.setHours(0,0,0,0);

  const sampleTimes = [
    { type: 'in',       hour: 8,  minute: 5  }, // entrada con tardanza
    { type: 'lunchOut', hour: 12, minute: 0  },
    { type: 'lunchIn',  hour: 12, minute: 35 }, // almuerzo largo (+5 min)
    { type: 'out',      hour: 16, minute: 10 }  // 10 min sobretiempo
  ];

  const records = [];
  employees.slice(0, 5).forEach(emp => {
    sampleTimes.forEach(t => {
      const ts = new Date(today);
      ts.setHours(t.hour, t.minute);
      records.push({
        employeeId: emp._id,
        type:       t.type,
        timestamp:  ts
      });
    });
  });

  await Record.insertMany(records);
  console.log(`Creado ${records.length} marcaciones de ejemplo`);

  await mongoose.disconnect();
  console.log('✅ Seed completo');
}

main().catch(err => {
  console.error(err);
  mongoose.disconnect();
});
