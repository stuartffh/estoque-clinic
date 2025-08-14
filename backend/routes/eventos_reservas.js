const express = require('express');
const { ApiError } = require('../middleware/errorHandler');
const { getDatabase } = require('../config/database');
const model = require('../models/eventoReservaModel');

const router = express.Router();

function isValidInt(value) {
  return Number.isInteger(Number(value));
}

router.get('/', async (req, res, next) => {
  try {
    const rows = await model.findAll();
    res.json(rows);
  } catch (err) {
    console.error('❌ Erro ao listar marcações:', err.message);
    next(new ApiError(500, 'Erro ao listar marcações', 'LIST_MARCACOES_ERROR', err.message));
  }
});

router.get('/voucher/:voucher', async (req, res, next) => {
  try {
    const row = await model.findByVoucher(req.params.voucher);
    if (!row) {
      return next(new ApiError(404, 'Marcação não encontrada', 'MARCACAO_NOT_FOUND'));
    }
    res.json(row);
  } catch (err) {
    console.error('❌ Erro ao obter marcação por voucher:', err.message);
    next(new ApiError(500, 'Erro ao obter marcação', 'GET_MARCACAO_ERROR', err.message));
  }
});

router.get('/:eventoId/:reservaId', async (req, res, next) => {
  const { eventoId, reservaId } = req.params;
  if (!isValidInt(eventoId) || !isValidInt(reservaId)) {
    return next(new ApiError(400, 'ID inválido', 'INVALID_ID'));
  }
  try {
    const row = await model.findById(eventoId, reservaId);
    if (!row) {
      return next(new ApiError(404, 'Marcação não encontrada', 'MARCACAO_NOT_FOUND'));
    }
    res.json(row);
  } catch (err) {
    console.error('❌ Erro ao obter marcação:', err.message);
    next(new ApiError(500, 'Erro ao obter marcação', 'GET_MARCACAO_ERROR', err.message));
  }
});


router.post('/', async (req, res, next) => {
  const { eventoId, reservaId, informacoes, quantidade, status } = req.body;
  if (!isValidInt(eventoId) || !isValidInt(reservaId) || !isValidInt(quantidade)) {
    return next(new ApiError(400, 'Dados inválidos', 'INVALID_FIELDS'));
  }
  try {
    const db = getDatabase();

    const { rows: [evento] } = await db.query(
      `SELECT e.data_evento, r.capacidade
         FROM eventos e
         JOIN restaurantes r ON e.id_restaurante = r.id
        WHERE e.id = ?`,
      [eventoId]
    );
    if (!evento) {
      return next(new ApiError(404, 'Evento não encontrado', 'EVENT_NOT_FOUND'));
    }

    const { rows: [reserva] } = await db.query(
      'SELECT id, nome_hospede, data_checkin, data_checkout, qtd_hospedes FROM reservas WHERE id = ?',
      [reservaId]
    );
    if (!reserva) {
      return next(new ApiError(404, 'Reserva não encontrada', 'RESERVA_NOT_FOUND'));
    }

    // Rule 1: quantidade não pode ultrapassar número de hóspedes da reserva
    if (quantidade > reserva.qtd_hospedes) {
      return next(new ApiError(400, 'Quantidade excede número de hóspedes da reserva', 'QUANTIDADE_EXCEDE_RESERVA'));
    }

    // Rule 2: total de hóspedes no evento não pode ultrapassar capacidade
    const { rows: [ocup] } = await db.query(
      `SELECT COALESCE(SUM(quantidade),0) AS total
         FROM eventos_reservas
        WHERE evento_id = ?
          AND status <> 'Cancelada'`,
      [eventoId]
    );
    const vagas = evento.capacidade - Number(ocup.total);
    if (quantidade > vagas) {
      return next(new ApiError(400, 'Capacidade do evento excedida', 'CAPACIDADE_EXCEDIDA'));
    }

    // Rule 3: não pode existir mais de uma marcação ativa para o mesmo evento e reserva
    if (!status || status === 'Ativa') {
      const { rows: duplicated } = await db.query(
        `SELECT 1
           FROM eventos_reservas er
          WHERE er.evento_id = ?
            AND er.reserva_id = ?
            AND er.status = 'Ativa'`,
        [eventoId, reservaId]
      );
      if (duplicated.length > 0) {
        return next(new ApiError(400, 'Marcação ativa já existe para este evento', 'MARCACAO_DUPLICADA'));
      }
    }

    // Rule 4: não pode existir reserva do mesmo hóspede para o mesmo evento
    const { rows: guestConflict } = await db.query(
      `SELECT 1
         FROM eventos_reservas er
         JOIN reservas r ON er.reserva_id = r.id
        WHERE er.evento_id = ?
          AND r.nome_hospede = ?
          AND er.status <> 'Cancelada'`,
      [eventoId, reserva.nome_hospede]
    );
    if (guestConflict.length > 0) {
      return next(new ApiError(400, 'Hóspede já possui reserva para este evento', 'HOSPEDE_DUPLICADO'));
    }

    // Rule 5: limite de marcações conforme duração da reserva
    const checkin = new Date(reserva.data_checkin);
    const checkout = new Date(reserva.data_checkout);
    const diff = Math.max(1, Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24)));
    let limite = 1;
    if (diff >= 7) {
      limite = 3;
    } else if (diff >= 3) {
      limite = 2;
    }
    const { rows: [countRes] } = await db.query(
      `SELECT COUNT(*)::int AS count
         FROM eventos_reservas
        WHERE reserva_id = ?
          AND status <> 'Cancelada'`,
      [reservaId]
    );
    if (countRes.count >= limite) {
      return next(new ApiError(400, 'Limite de marcações atingido para a reserva', 'LIMITE_MARCACOES'));
    }

    const created = await model.create({ eventoId, reservaId, informacoes, quantidade, status });
    res.status(201).json(created);
  } catch (err) {
    console.error('❌ Erro ao criar marcação:', err.message);
    next(new ApiError(500, 'Erro ao criar marcação', 'CREATE_MARCACAO_ERROR', err.message));
  }
});

router.put('/:eventoId/:reservaId', async (req, res, next) => {
  const { eventoId, reservaId } = req.params;
  if (!isValidInt(eventoId) || !isValidInt(reservaId)) {
    return next(new ApiError(400, 'ID inválido', 'INVALID_ID'));
  }
  const { informacoes, quantidade, status } = req.body;
  if (
    informacoes === undefined &&
    quantidade === undefined &&
    status === undefined
  ) {
    return next(new ApiError(400, 'Nenhum dado para atualizar', 'NO_FIELDS_TO_UPDATE'));
  }
  if (quantidade !== undefined && !isValidInt(quantidade)) {
    return next(new ApiError(400, 'quantidade inválida', 'INVALID_QUANTIDADE'));
  }
  try {
    const db = getDatabase();

    if (quantidade !== undefined) {
      const { rows: [evento] } = await db.query(
        `SELECT r.capacidade
           FROM eventos e
           JOIN restaurantes r ON e.id_restaurante = r.id
          WHERE e.id = ?`,
        [eventoId]
      );
      if (!evento) {
        return next(new ApiError(404, 'Evento não encontrado', 'EVENT_NOT_FOUND'));
      }

      const { rows: [reserva] } = await db.query(
        'SELECT qtd_hospedes FROM reservas WHERE id = ?',
        [reservaId]
      );
      if (!reserva) {
        return next(new ApiError(404, 'Reserva não encontrada', 'RESERVA_NOT_FOUND'));
      }

      if (quantidade > reserva.qtd_hospedes) {
        return next(new ApiError(400, 'Quantidade excede número de hóspedes da reserva', 'QUANTIDADE_EXCEDE_RESERVA'));
      }

      const { rows: [ocup] } = await db.query(
        `SELECT COALESCE(SUM(quantidade),0) AS total
           FROM eventos_reservas
          WHERE evento_id = ? AND reserva_id <> ?`,
        [eventoId, reservaId]
      );
      const vagas = evento.capacidade - Number(ocup.total);
      if (quantidade > vagas) {
        return next(new ApiError(400, 'Capacidade do evento excedida', 'CAPACIDADE_EXCEDIDA'));
      }
    }

    const updated = await model.update(eventoId, reservaId, { informacoes, quantidade, status });
    if (updated === 0) {
      return next(new ApiError(404, 'Marcação não encontrada', 'MARCACAO_NOT_FOUND'));
    }
    res.json({ message: 'Marcação atualizada com sucesso' });
  } catch (err) {
    console.error('❌ Erro ao atualizar marcação:', err.message);
    next(new ApiError(500, 'Erro ao atualizar marcação', 'UPDATE_MARCACAO_ERROR', err.message));
  }
});

router.delete('/:eventoId/:reservaId', async (req, res, next) => {
  const { eventoId, reservaId } = req.params;
  if (!isValidInt(eventoId) || !isValidInt(reservaId)) {
    return next(new ApiError(400, 'ID inválido', 'INVALID_ID'));
  }
  try {
    const removed = await model.remove(eventoId, reservaId);
    if (removed === 0) {
      return next(new ApiError(404, 'Marcação não encontrada', 'MARCACAO_NOT_FOUND'));
    }
    res.json({ message: 'Marcação removida com sucesso' });
  } catch (err) {
    console.error('❌ Erro ao remover marcação:', err.message);
    next(new ApiError(500, 'Erro ao remover marcação', 'DELETE_MARCACAO_ERROR', err.message));
  }
});

module.exports = router;
