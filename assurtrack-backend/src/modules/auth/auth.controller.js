import * as authService from './auth.service.js';
import { BadRequestError } from '../../utils/errors.js';

export async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) throw new BadRequestError('E-mail et mot de passe requis');
  const result = await authService.login(email, password);
  res.json(result);
}

export async function logout(_req, res) {
  // JWT stateless : la révocation se fait côté client (suppression du token).
  res.json({ ok: true });
}

export async function me(req, res) {
  const user = await authService.getProfile(req.user.id);
  res.json(user);
}
