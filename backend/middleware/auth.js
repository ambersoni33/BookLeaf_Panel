import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'bookleaf-secret-key-super-secure-2026';

export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export const requireAuthorOrAdmin = (req, res, next) => {
  const { authorId } = req.params;
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.user.role === 'admin') {
    return next();
  }

  if (req.user.role === 'author' && req.user.author_id === authorId) {
    return next();
  }

  return res.status(403).json({ error: 'Permission denied: Cannot access another author data' });
};
