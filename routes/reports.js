const express  = require('express');
const Record   = require('../models/Record');
const Employee = require('../models/Employee');
const Schedule = require('../models/Schedule');  // <- Asegúrate de esto
const ExcelJS  = require('exceljs');
const moment   = require('moment');
const router   = express.Router();

// Mostrar form de filtros
router.get('/reports', async (req, res) => {
  const employees = await Employee.find().select('code name');
  res.render('reports', { employees, report: null, filters: {} });
});

// Generar reporte
router.post('/reports', async (req, res) => {
  const { startDate, endDate, employeeId } = req.body;
  const filters = { startDate, endDate, employeeId };

  const match = { timestamp: { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') } };
  if (employeeId) match.employeeId = employeeId;

  const records = await Record.find(match)
    .sort({ timestamp: 1 })
    .populate({ path: 'employeeId', select: 'code name scheduleId', populate: { path: 'scheduleId', model: 'Schedule' } });

  const data = {};
  records.forEach(r => {
    const code = r.employeeId.code;
    const day  = moment(r.timestamp).format('YYYY-MM-DD');
    data[code] = data[code] || {};
    data[code][day] = data[code][day] || [];
    data[code][day].push(r);
  });

  const report = [];
  Object.entries(data).forEach(([code, days]) => {
    Object.entries(days).forEach(([day, recs]) => {
      const empPop = recs[0].employeeId;
      if (!empPop || !empPop.scheduleId) return;
      const sch = empPop.scheduleId;
      const startM = moment(`${day} ${sch.startTime}`, 'YYYY-MM-DD HH:mm');
      const endM   = moment(`${day} ${sch.endTime}`,   'YYYY-MM-DD HH:mm');

      const tIn       = recs.find(r => r.type==='in')?.timestamp;
      const tLunchOut = recs.find(r => r.type==='lunchOut')?.timestamp;
      const tLunchIn  = recs.find(r => r.type==='lunchIn')?.timestamp;
      const tOut      = recs.find(r => r.type==='out')?.timestamp;

      const tardanza       = tIn && moment(tIn).isAfter(startM);
      const salidaTemprana = tOut && moment(tOut).isBefore(endM);
      let almuerzoLargo    = false;
      if (tLunchOut && tLunchIn) {
        almuerzoLargo = moment(tLunchIn).diff(moment(tLunchOut),'minutes')>sch.lunchDuration;
      }
      let sobretiempo = 0;
      if (tIn && tOut) {
        const workedMin = moment(tOut).diff(moment(tIn),'minutes')-sch.lunchDuration;
        const overMin = workedMin - (8*60);
        if (overMin>0) sobretiempo = Math.ceil(overMin/30)*0.5;
      }

      report.push({ date: day, code, name: empPop.name, tardanza, salidaTemprana, almuerzoLargo, sobretiempo });
    });
  });

  const employees = await Employee.find().select('code name');
  res.render('reports', { employees, report, filters });
});

router.post('/reports/export', async (req, res) => {
  const { startDate, endDate, employeeId } = req.body;

  // Reconstruir los mismos filtros que usas en POST /reports
  const match = {
    timestamp: {
      $gte: new Date(startDate),
      $lte: new Date(endDate + 'T23:59:59')
    }
  };
  if (employeeId) match.employeeId = employeeId;

  // Consulta y populate idéntico al de tu ruta de reportes
  const records = await Record.find(match)
    .sort({ timestamp: 1 })
    .populate({
      path: 'employeeId',
      select: 'code name scheduleId',
      populate: { path: 'scheduleId', model: 'Schedule' }
    });

  // Agrega aquí el mismo agrupamiento/lógica de cálculo que tienes en POST /reports
  const data = {};
  records.forEach(r => {
    const code = r.employeeId.code;
    const day  = moment(r.timestamp).format('YYYY-MM-DD');
    data[code] = data[code] || {};
    data[code][day] = data[code][day] || [];
    data[code][day].push(r);
  });
  const report = [];
  Object.entries(data).forEach(([code, days]) => {
    Object.entries(days).forEach(([day, recs]) => {
      const empPop = recs[0].employeeId;
      if (!empPop || !empPop.scheduleId) return;
      const sch = empPop.scheduleId;
      const startM = moment(`${day} ${sch.startTime}`, 'YYYY-MM-DD HH:mm');
      const endM   = moment(`${day} ${sch.endTime}`,   'YYYY-MM-DD HH:mm');

      const tIn       = recs.find(r => r.type==='in')?.timestamp;
      const tLunchOut = recs.find(r => r.type==='lunchOut')?.timestamp;
      const tLunchIn  = recs.find(r => r.type==='lunchIn')?.timestamp;
      const tOut      = recs.find(r => r.type==='out')?.timestamp;

      const tardanza       = tIn       && moment(tIn).isAfter(startM);
      const salidaTemprana = tOut      && moment(tOut).isBefore(endM);
      let almuerzoLargo    = false;
      if (tLunchOut && tLunchIn) {
        almuerzoLargo = moment(tLunchIn).diff(moment(tLunchOut), 'minutes') > sch.lunchDuration;
      }
      let sobretiempo = 0;
      if (tIn && tOut) {
        const workedMin = moment(tOut).diff(moment(tIn), 'minutes') - sch.lunchDuration;
        const overMin   = workedMin - (8*60);
        if (overMin > 0) sobretiempo = Math.ceil(overMin/30) * 0.5;
      }

      report.push({ date: day, code, name: empPop.name, tardanza, salidaTemprana, almuerzoLargo, sobretiempo });
    });
  });

  // Generar el archivo Excel
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Reporte');
  ws.columns = [
    { header: 'Fecha',            key: 'date',           width: 12 },
    { header: 'Código',           key: 'code',           width: 10 },
    { header: 'Nombre',           key: 'name',           width: 20 },
    { header: 'Tardanza',         key: 'tardanza',       width: 10 },
    { header: 'Salida Temprana',  key: 'salidaTemprana', width: 15 },
    { header: 'Almuerzo Largo',   key: 'almuerzoLargo',  width: 15 },
    { header: 'Sobretiempo (hrs)',key: 'sobretiempo',    width: 15 },
  ];
  report.forEach(r => {
    ws.addRow({
      date: r.date,
      code: r.code,
      name: r.name,
      tardanza: r.tardanza ? 'Sí' : 'No',
      salidaTemprana: r.salidaTemprana ? 'Sí' : 'No',
      almuerzoLargo: r.almuerzoLargo ? 'Sí' : 'No',
      sobretiempo: r.sobretiempo
    });
  });

  // Enviar como descarga
  res.setHeader('Content-Disposition',
    `attachment; filename=reporte_${startDate}_a_${endDate}.xlsx`);
  res.setHeader('Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

  await wb.xlsx.write(res);
  res.end();
});
// ───────────────────────────────────────────────────────────────────

// Este debe ser el último statement en el archivo
module.exports = router;