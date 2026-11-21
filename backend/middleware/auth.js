const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const User = require('../models/User');

function cookieValue(req, name) {
  const prefix = name + '=';
  for (const part of String(req.headers.cookie || '').split(';')) {
    const value = part.trim();
    if (value.startsWith(prefix)) {
      try { return decodeURIComponent(value.slice(prefix.length)); } catch (_error) { return ''; }
    }
  }
  return '';
}

function equalToken(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || !left || !right) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = (roles = []) => async (req, res, next) => {
  const secret = process.env.JWT_SECRET;
  const header = req.headers.authorization || '';
  const bearerToken = header.startsWith('Bearer ') ? header.slice(7) : '';
  const cookieToken = cookieValue(req, 'access_token');
  const token = bearerToken || cookieToken;
  if (!secret || !token) return res.status(401).json({ message: 'Authentication required.' });

  if (!bearerToken && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const csrfCookie = cookieValue(req, 'csrf_token');
    const csrfHeader = req.headers['x-csrf-token'];
    if (!equalToken(csrfCookie, csrfHeader)) return res.status(403).json({ message: 'CSRF validation failed.' });
  }

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
