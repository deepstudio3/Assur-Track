import * as service from './notifications.service.js';

export async function list(req, res) {
  const data = await service.list(req.user.entreprise_id, req.user.id);
  res.json({ data });
}

export async function markRead(req, res) {
  const result = await service.markAllRead(req.user.entreprise_id, req.user.id);
  res.json(result);
}
