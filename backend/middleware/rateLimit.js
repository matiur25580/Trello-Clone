const RateLimit = require('../models/RateLimit');

module.exports = function createRateLimiter({ windowMs, limit, keyGenerator }) {
  if (!Number.isInteger(windowMs) || windowMs < 1000 || !Number.isInteger(limit) || limit < 1 || typeof keyGenerator !== 'function') {
    throw new TypeError('Invalid rate limiter configuration.');
  }

  return async (req, res, next) => {
    try {
      const key = String(keyGenerator(req) || '');
      if (!key || key.length > 256) return res.status(400).json({ message: 'Unable to evaluate request rate limit.' });
      const now = new Date();
      const nextReset = new Date(now.getTime() + windowMs);
      const filter = { key };
      const update = [{
        $set: {
          count: {
            $cond: [
              { $gt: ['$resetAt', now] },
              { $add: [{ $ifNull: ['$count', 0] }, 1] },
              1
            ]
          },
          resetAt: {
            $cond: [
              { $gt: ['$resetAt', now] },
              '$resetAt',
              nextReset
            ]
          }
        }
      }];

      let record;
      try {
        record = await RateLimit.findOneAndUpdate(filter, update, { new: true, upsert: true, setDefaultsOnInsert: false, updatePipeline: true });
      } catch (error) {
        if (error.code !== 11000) throw error;
        record = await RateLimit.findOneAndUpdate(filter, update, { new: true, upsert: false, setDefaultsOnInsert: false, updatePipeline: true });
        if (!record) record = await RateLimit.findOneAndUpdate(filter, update, { new: true, upsert: true, setDefaultsOnInsert: false, updatePipeline: true });
      }

      if (!record) throw new Error('Rate limit record could not be updated.');
      if (record.count > limit) {
        res.set('Retry-After', String(Math.max(1, Math.ceil((record.resetAt.getTime() - now.getTime()) / 1000))));
        return res.status(429).json({ message: 'Too many requests. Try again later.' });
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
};
