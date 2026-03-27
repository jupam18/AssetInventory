const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const ExcelJS = require('exceljs');
const assetModel = require('../models/assetModel');
const auditModel = require('../models/auditModel');
const { ASSET_TYPES, ASSET_STATUSES } = require('../config/constants');

const CSV_HEADERS = ['serial_number', 'asset_type', 'make', 'model', 'location', 'assigned_to', 'status', 'warranty_date', 'commentary'];

const importExportController = {
  async importCSV(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const content = req.file.buffer.toString('utf-8');
      let records;
      try {
        records = parse(content, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
      } catch (parseErr) {
        return res.status(400).json({ error: 'Invalid CSV format: ' + parseErr.message });
      }

      const results = { created: 0, errors: [] };

      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const rowNum = i + 2; // +2 for 1-based + header row

        if (!row.serial_number) {
          results.errors.push({ row: rowNum, error: 'Missing serial_number' });
          continue;
        }
        if (!row.asset_type || !ASSET_TYPES.includes(row.asset_type)) {
          results.errors.push({ row: rowNum, error: `Invalid asset_type: "${row.asset_type}". Must be: ${ASSET_TYPES.join(', ')}` });
          continue;
        }
        if (row.status && !ASSET_STATUSES.includes(row.status)) {
          results.errors.push({ row: rowNum, error: `Invalid status: "${row.status}"` });
          continue;
        }

        try {
          const asset = await assetModel.create({
            serial_number: row.serial_number,
            asset_type: row.asset_type,
            make: row.make || null,
            model: row.model || null,
            location: row.location || null,
            assigned_to: row.assigned_to || null,
            status: row.status || 'Available',
            warranty_date: row.warranty_date || null,
            commentary: row.commentary || null,
          });

          await auditModel.create({
            asset_id: asset.id,
            serial_number: asset.serial_number,
            action: 'CREATED',
            new_value: 'CSV Import',
            performed_by: req.user.full_name,
            comment: 'Bulk import from CSV',
          });

          results.created++;
        } catch (err) {
          if (err.code === '23505') {
            results.errors.push({ row: rowNum, error: `Duplicate serial_number: ${row.serial_number}` });
          } else {
            results.errors.push({ row: rowNum, error: err.message });
          }
        }
      }

      res.json({
        message: `Import completed: ${results.created} assets created, ${results.errors.length} errors`,
        ...results,
      });
    } catch (err) {
      console.error('Import CSV error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async exportCSV(req, res) {
    try {
      const { status, asset_type } = req.query;
      const assets = await assetModel.findAllForExport({ status, asset_type });

      const csvData = assets.map(a => ({
        serial_number: a.serial_number,
        asset_type: a.asset_type,
        make: a.make || '',
        model: a.model || '',
        location: a.location || '',
        assigned_to: a.assigned_to || '',
        status: a.status,
        warranty_date: a.warranty_date ? new Date(a.warranty_date).toISOString().split('T')[0] : '',
        commentary: a.commentary || '',
        created_at: a.created_at,
        updated_at: a.updated_at,
      }));

      const csv = stringify(csvData, { header: true });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=assets_export_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } catch (err) {
      console.error('Export CSV error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async exportExcel(req, res) {
    try {
      const { status, asset_type } = req.query;
      const assets = await assetModel.findAllForExport({ status, asset_type });

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'AssetInventory';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Assets');
      sheet.columns = [
        { header: 'Serial Number', key: 'serial_number', width: 20 },
        { header: 'Type', key: 'asset_type', width: 12 },
        { header: 'Make', key: 'make', width: 15 },
        { header: 'Model', key: 'model', width: 15 },
        { header: 'Location', key: 'location', width: 20 },
        { header: 'Assigned To', key: 'assigned_to', width: 20 },
        { header: 'Status', key: 'status', width: 18 },
        { header: 'Warranty Date', key: 'warranty_date', width: 15 },
        { header: 'Commentary', key: 'commentary', width: 30 },
        { header: 'Created At', key: 'created_at', width: 20 },
        { header: 'Updated At', key: 'updated_at', width: 20 },
      ];

      // Style header row
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      assets.forEach(a => {
        sheet.addRow({
          serial_number: a.serial_number,
          asset_type: a.asset_type,
          make: a.make || '',
          model: a.model || '',
          location: a.location || '',
          assigned_to: a.assigned_to || '',
          status: a.status,
          warranty_date: a.warranty_date ? new Date(a.warranty_date).toISOString().split('T')[0] : '',
          commentary: a.commentary || '',
          created_at: a.created_at,
          updated_at: a.updated_at,
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=assets_export_${new Date().toISOString().split('T')[0]}.xlsx`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error('Export Excel error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async exportAuditCSV(req, res) {
    try {
      const result = await auditModel.findAll({ page: 1, limit: 10000 });
      const csvData = result.logs.map(l => ({
        id: l.id,
        serial_number: l.serial_number,
        action: l.action,
        field_changed: l.field_changed || '',
        old_value: l.old_value || '',
        new_value: l.new_value || '',
        performed_by: l.performed_by,
        comment: l.comment || '',
        timestamp: l.created_at,
      }));

      const csv = stringify(csvData, { header: true });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit_log_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } catch (err) {
      console.error('Export audit CSV error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};

module.exports = importExportController;
