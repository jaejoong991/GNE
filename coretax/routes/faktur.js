const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../auth');
const createCsvWriter = require('csv-writer').createObjectCsvStringifier;

function getNpwpColumn() {
  return process.env.CORETAX_NPWP_COLUMN || 'taxid';
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const clientId = req.session.clientId;
    const { start, end } = req.query;

    const npwpCol = getNpwpColumn();

    let dateFilter = '';
    const params = [clientId];

    if (start && end) {
      dateFilter = 'AND i.dateinvoiced BETWEEN $2 AND $3';
      params.push(start, end);
    }

    const query = `
      SELECT 
        i.c_invoice_id,
        i.documentno as nomor_faktur,
        i.dateinvoiced as tanggal,
        i.grandtotal as total,
        bp.name as customer_name,
        COALESCE(bp.${npwpCol}, '') as npwp,
        COALESCE(bpl.address1 || ', ' || bpl.city, '') as alamat,
        i.docstatus,
        CASE 
          WHEN i.docstatus = 'CO' THEN 'Completed'
          WHEN i.docstatus = 'CL' THEN 'Closed'
          ELSE i.docstatus
        END as status_label
      FROM c_invoice i
      JOIN c_doctype dt ON i.c_doctype_id = dt.c_doctype_id
      JOIN c_bpartner bp ON i.c_bpartner_id = bp.c_bpartner_id
      LEFT JOIN c_bpartner_location bpl ON bp.c_bpartner_id = bpl.c_bpartner_id AND bpl.isbillto = 'Y'
      WHERE i.ad_client_id = $1
        AND i.issotrx = 'Y'
        AND dt.docbasetype = 'ARI'
        ${dateFilter}
      ORDER BY i.dateinvoiced DESC, i.documentno DESC
      LIMIT 500
    `;

    const result = await pool.query(query, params);

    res.render('faktur', {
      userName: req.session.userName,
      fakturList: result.rows,
      start: start || '',
      end: end || '',
      error: null,
    });
  } catch (err) {
    console.error('Faktur list error:', err);
    res.render('faktur', {
      userName: req.session.userName,
      fakturList: [],
      start: start || '',
      end: end || '',
      error: 'Gagal memuat data faktur: ' + err.message,
    });
  }
});

router.get('/export', requireAuth, async (req, res) => {
  try {
    const clientId = req.session.clientId;
    const { ids } = req.query;

    if (!ids) {
      return res.status(400).send('Tidak ada faktur yang dipilih');
    }

    const idArray = Array.isArray(ids) ? ids : [ids];
    const placeholders = idArray.map((_, i) => `$${i + 2}`).join(',');
    const npwpCol = getNpwpColumn();

    // Ambil header faktur (FK)
    const headerQuery = `
      SELECT 
        i.c_invoice_id,
        i.documentno as nomor_faktur,
        i.dateinvoiced as tanggal,
        bp.name as nama_pembeli,
        COALESCE(bp.${npwpCol}, '000000000000000') as npwp,
        COALESCE(bpl.address1 || ', ' || bpl.city, '') as alamat,
        COALESCE(SUM(it.taxbaseamt), 0) as dpp,
        COALESCE(SUM(it.taxamt), 0) as ppn
      FROM c_invoice i
      JOIN c_bpartner bp ON i.c_bpartner_id = bp.c_bpartner_id
      LEFT JOIN c_bpartner_location bpl ON bp.c_bpartner_id = bpl.c_bpartner_id AND bpl.isbillto = 'Y'
      LEFT JOIN c_invoicetax it ON i.c_invoice_id = it.c_invoice_id
      LEFT JOIN c_tax t ON it.c_tax_id = t.c_tax_id AND UPPER(t.name) LIKE '%PPN%'
      WHERE i.ad_client_id = $1
        AND i.c_invoice_id IN (${placeholders})
      GROUP BY i.c_invoice_id, i.documentno, i.dateinvoiced, bp.name, bp.${npwpCol}, bpl.address1, bpl.city
      ORDER BY i.dateinvoiced, i.documentno
    `;
    const headerResult = await pool.query(headerQuery, [clientId, ...idArray]);

    // Ambil detail barang per faktur
    const lineQuery = `
      SELECT 
        il.c_invoice_id,
        p.name as nama_barang,
        il.qtyinvoiced as qty,
        il.priceactual as harga_satuan,
        il.linenetamt as dpp_line,
        COALESCE(it.taxamt, 0) as ppn_line
      FROM c_invoiceline il
      LEFT JOIN m_product p ON il.m_product_id = p.m_product_id
      LEFT JOIN c_invoicetax it ON il.c_invoice_id = it.c_invoice_id
      LEFT JOIN c_tax t ON it.c_tax_id = t.c_tax_id AND UPPER(t.name) LIKE '%PPN%'
      WHERE il.c_invoice_id IN (${placeholders})
      ORDER BY il.c_invoice_id, il.line
    `;
    const lineResult = await pool.query(lineQuery, [...idArray]);

    // Group lines by invoice
    const linesByInvoice = {};
    for (const line of lineResult.rows) {
      if (!linesByInvoice[line.c_invoice_id]) {
        linesByInvoice[line.c_invoice_id] = [];
      }
      linesByInvoice[line.c_invoice_id].push(line);
    }

    // Build CSV rows
    const csvRows = [];

    for (const inv of headerResult.rows) {
      const tgl = new Date(inv.tanggal);
      const masaPajak = String(tgl.getMonth() + 1).padStart(2, '0');
      const tahunPajak = String(tgl.getFullYear());
      const tanggalFaktur = tgl.toISOString().split('T')[0];

      // FK row (header faktur)
      csvRows.push({
        jenis: 'FK',
        kd_jenis_transaksi: '01',
        fg_pengganti: '0',
        nomor_faktur: inv.nomor_faktur,
        masa_pajak: masaPajak,
        tahun_pajak: tahunPajak,
        tanggal_faktur: tanggalFaktur,
        npwp: inv.npwp.replace(/\D/g, ''), // hapus non-digit
        nama: inv.nama_pembeli,
        alamat_lengkap: inv.alamat,
        jumlah_dpp: Math.round(parseFloat(inv.dpp)),
        jumlah_ppn: Math.round(parseFloat(inv.ppn)),
        jumlah_ppnbm: '0',
        keterangan_tambahan: '',
        fg_uang_muka: '0',
        uang_muka_dpp: '0',
        uang_muka_ppn: '0',
        uang_muka_ppnbm: '0',
        referensi: inv.nomor_faktur,
      });

      // OF rows (detail barang)
      const lines = linesByInvoice[inv.c_invoice_id] || [];
      for (const line of lines) {
        csvRows.push({
          jenis: 'OF',
          kd_jenis_transaksi: '',
          fg_pengganti: '',
          nomor_faktur: '',
          masa_pajak: '',
          tahun_pajak: '',
          tanggal_faktur: '',
          npwp: '',
          nama: line.nama_barang || 'Barang/Jasa',
          alamat_lengkap: '',
          jumlah_dpp: Math.round(parseFloat(line.dpp_line || 0)),
          jumlah_ppn: Math.round(parseFloat(line.ppn_line || 0)),
          jumlah_ppnbm: '0',
          keterangan_tambahan: '',
          fg_uang_muka: '',
          uang_muka_dpp: '',
          uang_muka_ppn: '',
          uang_muka_ppnbm: '',
          referensi: '',
        });
      }
    }

    // Define CSV header
    const csvStringifier = createCsvWriter({
      header: [
        { id: 'jenis', title: 'JENIS' },
        { id: 'kd_jenis_transaksi', title: 'KD_JENIS_TRANSAKSI' },
        { id: 'fg_pengganti', title: 'FG_PENGGANTI' },
        { id: 'nomor_faktur', title: 'NOMOR_FAKTUR' },
        { id: 'masa_pajak', title: 'MASA_PAJAK' },
        { id: 'tahun_pajak', title: 'TAHUN_PAJAK' },
        { id: 'tanggal_faktur', title: 'TANGGAL_FAKTUR' },
        { id: 'npwp', title: 'NPWP' },
        { id: 'nama', title: 'NAMA' },
        { id: 'alamat_lengkap', title: 'ALAMAT_LENGKAP' },
        { id: 'jumlah_dpp', title: 'JUMLAH_DPP' },
        { id: 'jumlah_ppn', title: 'JUMLAH_PPN' },
        { id: 'jumlah_ppnbm', title: 'JUMLAH_PPNBM' },
        { id: 'keterangan_tambahan', title: 'ID_KETERANGAN_TAMBAHAN' },
        { id: 'fg_uang_muka', title: 'FG_UANG_MUKA' },
        { id: 'uang_muka_dpp', title: 'UANG_MUKA_DPP' },
        { id: 'uang_muka_ppn', title: 'UANG_MUKA_PPN' },
        { id: 'uang_muka_ppnbm', title: 'UANG_MUKA_PPNBM' },
        { id: 'referensi', title: 'REFERENSI' },
      ],
    });

    const headerString = csvStringifier.getHeaderString();
    const recordsString = csvStringifier.stringifyRecords(csvRows);
    const csvContent = headerString + recordsString;

    const filename = `efaktur_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).send('Gagal export CSV: ' + err.message);
  }
});

module.exports = router;
