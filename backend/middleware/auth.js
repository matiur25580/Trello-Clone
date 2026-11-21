const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = (roles = []) => async (req, res, next) => {
  const secret = process.env.JWT_SECRET;
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!secret || !token) return res.status(401).json({ message: 'Authentication required.' });

  try {
    const claims = jwt.verify(token, secret, { algorithms: ['HS256'], issuer: 'trello-clone-api', audience: 'trello-clone-web' });
    if (!claims.sub || !Number.isInteger(claims.ver)) return res.status(401).json({ message: 'Invalid session.' });
    const user = await User.findById(claims.sub).select('_id fullName email role uniqueId isActive tokenVersion');
    if (!user || !user.isActive || user.tokenVersion !== claims.ver) return res.status(401).json({ message: 'Session is no longer valid.' });
    if (roles.length && !roles.includes(user.role)) return res.status(403).json({ message: 'Insufficient permissions.' });
    req.user = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ message: 'Invalid or expired session.' });
  }
};
