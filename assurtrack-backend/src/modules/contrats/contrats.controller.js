import * as service from './contrats.service.js';

export async function list(req, res) {
  const { statut, q, page, limit } = req.query;
  const result = await service.list({
    entrepriseId: req.user.entreprise_id,
    statut,
    q,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20,
  });
  res.json(result);
}

export async function getOne(req, res) {
  const contrat = await service.getById(req.params.id, req.user.entreprise_id);
  res.json(contrat);
}

export async function create(req, res) {
  const contrat = await service.create(req.body, {
    userId: req.user.id,
    entrepriseId: req.user.entreprise_id,
  });
  res.status(201).json(contrat);
}

export async function update(req, res) {
  const contrat = await service.update(req.params.id, req.body, req.user.entreprise_id);
  res.json(contrat);
}

export async function remove(req, res) {
  const result = await service.deactivate(req.params.id, req.user.entreprise_id);
  res.json(result);
}
