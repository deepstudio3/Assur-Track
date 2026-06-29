import * as service from './templates.service.js';

export async function list(req, res) {
  const data = await service.getTemplates(req.user.entreprise_id);
  res.json({ data, defaults: service.DEFAULT_TEMPLATES, variables: service.TEMPLATE_VARS });
}

export async function save(req, res) {
  const map = req.body?.templates || req.body;
  const data = await service.saveTemplates(req.user.entreprise_id, map);
  res.json({ data });
}
