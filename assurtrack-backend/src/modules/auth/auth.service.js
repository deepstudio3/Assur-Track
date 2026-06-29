import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../config/database.js';
import { env } from '../../config/env.js';
import { UnauthorizedError, NotFoundError } from '../../utils/errors.js';

function publicUser(u) {
  return {
    id: u.id,
    nom: u.nom,
    prenom: u.prenom,
    email: u.email,
    role: u.role,
    telephone_wa: u.telephone_wa,
    entreprise_id: u.entreprise_id,
  };
}

export async function login(email, password) {
  const { rows } = await query(
    `SELECT * FROM users WHERE email = $1 AND actif = TRUE`,
    [String(email || '').trim().toLowerCase()],
  );
  const user = rows[0];
  if (!user) throw new UnauthorizedError('Identifiants incorrects');

  const ok = await bcrypt.compare(password || '', user.password_hash);
  if (!ok) throw new UnauthorizedError('Identifiants incorrects');

  const token = jwt.sign(
    { sub: user.id, role: user.role, entreprise_id: user.entreprise_id },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );

  return { token, user: publicUser(user) };
}

export async function getProfile(userId) {
  const { rows } = await query(`SELECT * FROM users WHERE id = $1`, [userId]);
  if (!rows[0]) throw new NotFoundError('Utilisateur introuvable');
  return publicUser(rows[0]);
}
