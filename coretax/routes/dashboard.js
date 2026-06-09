const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const clientId = req.session.clientId;

    // Hitung jumlah faktur bulan ini
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM c_invoice i
      JOIN c_doctype dt ON i.c_doctype_id = dt.c_doctype_id
      WHERE i.ad_client_id = $1
        AND i.issotrx = 'Y'
        AND dt.docbasetype = 'ARI'
        AND i.dateinvoiced BETWEEN $2 AND $3
        AND i.docstatus IN ('CO', 'CL')
    `;
    const countResult = await pool.query(countQuery, [
      clientId,
      firstDay.toISOString().split('T')[0],
      lastDay.toISOString().split('T')[0],
    ]);

    const totalFaktur = parseInt(countResult.rows[0].total, 10);

    // Hitung total DPP & PPN bulan ini
    const taxQuery = `
      SELECT 
        COALESCE(SUM(it.taxbaseamt), 0) as total_dpp,
        COALESCE(SUM(it.taxamt), 0) as total_ppn
      FROM c_invoice i
      JOIN c_doctype dt ON i.c_doctype_id = dt.c_doctype_id
      JOIN c_invoicetax it ON i.c_invoice_id = it.c_invoice_id
      JOIN c_tax t ON it.c_tax_id = t.c_tax_id
      WHERE i.ad_client_id = $1
        AND i.issotrx = 'Y'
        AND dt.docbasetype = 'ARI'
        AND i.dateinvoiced BETWEEN $2 AND $3
        AND i.docstatus IN ('CO', 'CL')
        AND UPPER(t.name) LIKE '%PPN%'
    `;
    const taxResult = await pool.query(taxQuery, [
      clientId,
      firstDay.toISOString().split('T')[0],
      lastDay.toISOString().split('T')[0],
    ]);

    const totalDpp = parseFloat(taxResult.rows[0].total_dpp);
    const totalPpn = parseFloat(taxResult.rows[0].total_ppn);

    res.render('dashboard', {
      userName: req.session.userName,
      totalFaktur,
      totalDpp,
      totalPpn,
      currentMonth: now.toLocaleString('id-ID', { month: 'long', year: 'numeric' }),
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.render('dashboard', {
      userName: req.session.userName,
      totalFaktur: 0,
      totalDpp: 0,
      totalPpn: 0,
      currentMonth: '-',
      error: 'Gagal memuat data dashboard',
    });
  }
});

module.exports = router;
