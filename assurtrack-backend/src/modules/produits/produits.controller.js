import * as service from './produits.service.js';

export async function list(req, res) {
  const actifsOnly = req.query.actifs === 'true';
  const data = await service.list(req.user.entreprise_id, { actifsOnly });
  res.json({ data });
}

export async function create(req, res) {
  const produit = await service.create(req.body, req.user.entreprise_id);
  res.status(201).json(produit);
}

export async function update(req, res) {
  const produit = await service.update(req.params.id, req.body, req.user.entreprise_id);
  res.json(produit);
}
