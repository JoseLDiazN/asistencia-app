const express  = require('express');
const passport = require('passport');
const router   = express.Router();

// Mostrar login
router.get('/login', (req, res) => {
  const error = req.flash('error')[0] || null;
  res.render('login', { error });
});

// Procesar login
router.post('/login',
  passport.authenticate('local', {
    successRedirect: '/admin',
    failureRedirect: '/login',
    failureFlash: true
  })
);

// Logout
router.get('/logout', (req, res) => {
  req.logout(() => res.redirect('/login'));
});

module.exports = router;