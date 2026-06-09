const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../auth');

const BULAN_LIST = [
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

function getYearList() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear - 5; y <= currentYear + 2; y++) {
    years.push(String(y));
  }
  return years;
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const clientId = req.session.clientId;
    const { tahun, bulan } = req.query;

    const now = new Date();
    const year = tahun && /^\d{4}$/.test(tahun) ? parseInt(tahun, 10) : now.getFullYear();
    const month = bulan && /^\d{1,2}$/.test(bulan) ? parseInt(bulan, 10) : now.getMonth() + 1;

    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const dateFrom = firstDay.toISOString().split('T')[0];
    const dateTo = lastDay.toISOString().split('T')[0];
    const periodeLabel = firstDay.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

    // Cek apakah periode yang dipilih masih di masa depan
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const isFuture = year > currentYear || (year === currentYear && month > currentMonth);

    let totalKeluaran = 0;
    let totalMasukan = 0;
    let infoMessage = null;

    if (isFuture) {
      infoMessage = `Data untuk periode ${periodeLabel} belum tersedia.`;
    } else {
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
      totalKeluaran = parseInt(keluaranResult.rows[0].total, 10);

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
      totalMasukan = parseInt(masukanResult.rows[0].total, 10);
    }

    res.render('dashboard', {
      userName: req.session.userName,
      totalKeluaran,
      totalMasukan,
      periodeLabel,
      infoMessage,
      tahun: String(year),
      bulan: String(month).padStart(2, '0'),
      tahunList: getYearList(),
      bulanList: BULAN_LIST,
      error: null,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.render('dashboard', {
      userName: req.session.userName,
      totalKeluaran: 0,
      totalMasukan: 0,
      periodeLabel: '-',
      infoMessage: null,
      tahun: '',
      bulan: '',
      tahunList: getYearList(),
      bulanList: BULAN_LIST,
      error: 'Gagal memuat data dashboard',
    });
  }
});

module.exports = router;
