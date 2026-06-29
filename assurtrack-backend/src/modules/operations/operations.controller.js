import * as service from './operations.service.js';

export async function list(req, res) {
  const result = await service.list({ user: req.user });
  res.json(result);
}

export async function create(req, res) {
  const op = await service.createDette(req.body, { user: req.user });
  res.status(201).json(op);
}

export async function rembourser(req, res) {
  const { secretaire_id, montant } = req.body || {};
  const result = await service.rembourser({ secretaireId: secretaire_id, montant }, req.user);
  res.status(201).json(result);
}

export async function historiqueRemboursements(req, res) {
  const data = await service.listRemboursements({ user: req.user });
  res.json({ data });
}
