const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const clientId = req.session.clientId;
    const { periode } = req.query;

    // Parse periode (format: YYYY-MM dari input type="month")
    let year, month;
    if (periode && /^\d{4}-\d{2}$/.test(periode)) {
      [year, month] = periode.split('-').map(Number);
    } else {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth() + 1;
    }

    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const dateFrom = firstDay.toISOString().split('T')[0];
    const dateTo = lastDay.toISOString().split('T')[0];
    const periodeLabel = firstDay.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    const periodeValue = `${year}-${String(month).padStart(2, '0')}`;

    // Total faktur keluaran
    const keluaranQuery = `
      SELECT COUNT(*) as total
      FROM c_invoice i
      JOIN c_doctype dt ON i.c_doctype_id = dt.c_doctype_id
      WHERE i.ad_client_id = $1
        AND i.issotrx = 'Y'
        AND dt.docbasetype = 'ARI'
        AND i.dateinvoiced BETWEEN $2 AND $3
        AND i.docstatus IN ('CO', 'CL')
    `;
    const keluaranResult = await pool.query(keluaranQuery, [clientId, dateFrom, dateTo]);
    const totalKeluaran = parseInt(keluaranResult.rows[0].total, 10);

    // Total faktur masukan
    const masukanQuery = `
      SELECT COUNT(*) as total
      FROM c_invoice i
      JOIN c_doctype dt ON i.c_doctype_id = dt.c_doctype_id
      WHERE i.ad_client_id = $1
        AND i.issotrx = 'N'
        AND dt.docbasetype = 'API'
        AND i.dateinvoiced BETWEEN $2 AND $3
        AND i.docstatus IN ('CO', 'CL')
    `;
    const masukanResult = await pool.query(masukanQuery, [clientId, dateFrom, dateTo]);
    const totalMasukan = parseInt(masukanResult.rows[0].total, 10);

    res.render('dashboard', {
      userName: req.session.userName,
      totalKeluaran,
      totalMasukan,
      periode: periodeValue,
      periodeLabel,
      error: null,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.render('dashboard', {
      userName: req.session.userName,
      totalKeluaran: 0,
      totalMasukan: 0,
      periode: '',
      periodeLabel: '-',
      error: 'Gagal memuat data dashboard',
    });
  }
});

module.exports = router;
