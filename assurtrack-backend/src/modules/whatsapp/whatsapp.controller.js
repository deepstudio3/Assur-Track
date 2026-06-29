import * as connection from './connection.service.js';

export async function connect(req, res) {
  const data = await connection.connect(req.user.entreprise_id);
  res.status(201).json(data);
}

export async function qr(req, res) {
  const data = await connection.qr(req.user.entreprise_id);
  res.json(data);
}

export async function status(req, res) {
  const data = await connection.status(req.user.entreprise_id);
  res.json(data);
}

export async function restart(req, res) {
  const data = await connection.restart(req.user.entreprise_id);
  res.json(data);
}

export async function disconnect(req, res) {
  const data = await connection.disconnect(req.user.entreprise_id);
  res.json(data);
}
