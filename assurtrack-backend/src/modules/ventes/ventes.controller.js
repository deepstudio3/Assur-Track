import * as service from './ventes.service.js';

export async function list(req, res) {
  const { mode, statut } = req.query;
  const data = await service.list({ entrepriseId: req.user.entreprise_id, mode, statut });
  res.json({ data });
}

export async function dettes(req, res) {
  const data = await service.dettes({ entrepriseId: req.user.entreprise_id });
  res.json({ data });
}

export async function getOne(req, res) {
  const vente = await service.getById(req.params.id, req.user.entreprise_id);
  res.json(vente);
}

export async function create(req, res) {
  const vente = await service.create(req.body, { user: req.user });
  res.status(201).json(vente);
}

export async function payer(req, res) {
  const vente = await service.payer(req.params.id, req.body || {}, req.user);
  res.json(vente);
}

export async function stats(req, res) {
  const data = await service.stats(req.user.entreprise_id);
  res.json(data);
}
