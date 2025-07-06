// middlewares/auth.js

// Comprueba que el usuario esté autenticado
module.exports.isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
};

// Comprueba que el usuario tenga rol admin
module.exports.isAdmin = (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  res.status(403).send('Acceso denegado');
};