// routes/attendance.js
const express  = require('express');
const router   = express.Router();
const Employee = require('../models/Employee');
const Record   = require('../models/Record');
const moment   = require('moment');

// Muestra el formulario
router.get('/attendance', (req, res) => {
  res.render('attendance', { error: null, success: null });
});

// routes/attendance.js (solo el POST /attendance)
router.post('/attendance', async (req, res) => {
  const { code, action } = req.body;
  try {
    // 1) Buscar empleado
    const emp = await Employee.findOne({ code });
    if (!emp) {
      return res.render('attendance', { error: 'Código no encontrado', success: null });
    }

    // 2) Obtener registros de hoy
    const startDay = moment().startOf('day').toDate();
    const endDay   = moment().endOf('day').toDate();
    const todayRecs = await Record.find({
      employeeId: emp._id,
      timestamp:   { $gte: startDay, $lte: endDay }
    }).sort({ timestamp: 1 });

    // 3) Determinar tipo esperado en la secuencia
    const lastType = todayRecs.length ? todayRecs[todayRecs.length - 1].type : null;
    const seq = { null: 'in', in: 'lunchOut', lunchOut: 'lunchIn', lunchIn: 'out', out: null };
    const expected = seq[lastType];

    if (expected !== action) {
      const names = { in:'Entrada', lunchOut:'Salida Almuerzo', lunchIn:'Entrada Almuerzo', out:'Salida' };
      const msg = expected
        ? `Primero debes registrar "${names[expected]}".`
        : 'Ya completaste todas las marcaciones del día.';
      return res.render('attendance', { error: msg, success: null });
    }

    // 4) Crear el nuevo registro
    await Record.create({ employeeId: emp._id, type: action, timestamp: new Date() });

    // 5) Feedback con cálculos avanzados
    let feedback = `Marcación "${action}" registrada correctamente.`;

    // Obtenemos el horario del empleado
    const sch = await emp.populate('scheduleId').then(e => e.scheduleId);

    // 5.a) Tardanza en Entrada
    if (action === 'in') {
      const [sh, sm] = sch.startTime.split(':').map(Number);
      const startM = moment().startOf('day').hour(sh).minute(sm);
      if (moment().isAfter(startM)) {
        const lateMin = moment().diff(startM, 'minutes');
        feedback += ` Llegaste ${lateMin} min tarde.`;
      }
    }

    // 5.b) Almuerzo largo en Entrada de Almuerzo
    if (action === 'lunchIn') {
      const outRec = todayRecs.find(r => r.type === 'lunchOut');
      if (outRec) {
        const diffMin = moment().diff(moment(outRec.timestamp), 'minutes');
        if (diffMin > sch.lunchDuration) {
          const extra = diffMin - sch.lunchDuration;
          feedback += ` Almuerzo excedido ${extra} min.`;
        }
      }
    }

    // 5.c) Salida Temprana / Sobretiempo en Salida Final
    if (action === 'out') {
      const [eh, em] = sch.endTime.split(':').map(Number);
      const endM = moment().startOf('day').hour(eh).minute(em);
      const now  = moment();

      if (now.isBefore(endM)) {
        const earlyMin = endM.diff(now, 'minutes');
        feedback += ` Saliste ${earlyMin} min antes de tiempo.`;
      } else if (now.isAfter(endM)) {
        // calculamos total trabajado descontando almuerzo
        const inRec      = todayRecs.find(r => r.type === 'in');
        const lunchOut   = todayRecs.find(r => r.type === 'lunchOut');
        const lunchInRec = todayRecs.find(r => r.type === 'lunchIn');
        if (inRec) {
          let workMin = now.diff(moment(inRec.timestamp), 'minutes');
          if (lunchOut && lunchInRec) {
            workMin -= moment(lunchInRec.timestamp).diff(moment(lunchOut.timestamp), 'minutes');
          } else {
            workMin -= sch.lunchDuration;
          }
          const overMin = workMin - (8 * 60);
          if (overMin > 0) {
            const hours = Math.floor(overMin / 60);
            const mins  = overMin % 60;
            feedback += ` Has hecho ${hours}h ${mins}min de sobretiempo.`;
          }
        }
      }
    }

    return res.render('attendance', { error: null, success: feedback });

  } catch (err) {
    console.error(err);
    return res.render('attendance', { error: 'Error interno, inténtalo de nuevo', success: null });
  }
});

module.exports = router;
