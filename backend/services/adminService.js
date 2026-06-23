const customerModel = require('../models/customerModel');
const consentModel = require('../models/consentModel');
const auditLogModel = require('../models/auditLogModel');
const { exportToCsv } = require('../utils/csvExport');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

async function getDashboard() {
  const [stats, dailyRows, deviceDistribution, browserUsage, customers, logins, todayLogins] =
    await Promise.all([
      consentModel.getStats(),
      consentModel.getDailySubmissions(14),
      auditLogModel.getDeviceDistribution(),
      auditLogModel.getBrowserUsage(),
      customerModel.getAllWithConsent({ limit: 6 }),
      auditLogModel.getLoginHistory({ limit: 6 }),
      auditLogModel.countTodayLogins(),
    ]);

  const total = Number(stats.total) || 0;
  const accepted = Number(stats.accepted) || 0;
  const rejected = Number(stats.rejected) || 0;

  const dailySubmissions = fillDailySubmissions(dailyRows, 14);
  const consentDistribution = [
    { name: 'Accepted', value: accepted },
    { name: 'Rejected', value: rejected },
  ];

  const consentTrend = await consentModel.getMonthlyTrend(12);

  return {
    summary: {
      totalCustomers: total,
      todaysLogins: todayLogins,
      totalSubmissions: total,
      consentAcceptedPercent: total ? Math.round((accepted / total) * 100) : 0,
      consentRejectedPercent: total ? Math.round((rejected / total) * 100) : 0,
      accepted,
      rejected,
    },
    charts: {
      dailySubmissions,
      consentDistribution,
      deviceDistribution: deviceDistribution.length ? deviceDistribution : defaultDeviceDistribution(),
      browserUsage: browserUsage.length ? browserUsage : defaultBrowserUsage(),
      consentTrend: consentTrend.map((row) => ({
        month: row.month,
        accepted: Number(row.accepted),
        rejected: Number(row.rejected),
      })),
    },
    recentCustomers: customers,
    recentLogins: logins,
  };
}

function fillDailySubmissions(rows, days) {
  const map = new Map(
    rows.map((row) => [
      new Date(row.day).toDateString(),
      {
        submissions: Number(row.submissions),
        accepted: Number(row.accepted),
      },
    ]),
  );

  const result = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    const data = map.get(key) || { submissions: 0, accepted: 0 };
    result.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      submissions: data.submissions,
      accepted: data.accepted,
    });
  }
  return result;
}

function defaultDeviceDistribution() {
  return [
    { name: 'Desktop', value: 0 },
    { name: 'Mobile', value: 0 },
    { name: 'Tablet', value: 0 },
  ];
}

function defaultBrowserUsage() {
  return [{ name: 'Unknown', value: 0 }];
}

async function getCustomers(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, parseInt(query.limit, 10) || 8);
  const offset = (page - 1) * limit;

  const filters = {
    search: query.search || query.q,
    consentStatus: query.status && query.status !== 'all' ? query.status : null,
    sort: query.sort || 'date-desc',
    limit,
    offset,
  };

  const customers = await customerModel.getAllWithConsent(filters);
  const total = await customerModel.countWithConsent();

  return {
    customers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

async function getConsents(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, parseInt(query.limit, 10) || 20);
  const offset = (page - 1) * limit;

  const consents = await consentModel.getAll({
    consentStatus: query.status === 'Accepted' ? 'allow' : query.status === 'Rejected' ? 'deny' : null,
    limit,
    offset,
  });

  const stats = await consentModel.getStats();
  const trend = await consentModel.getMonthlyTrend(12);

  return {
    stats: {
      total: Number(stats.total),
      accepted: Number(stats.accepted),
      rejected: Number(stats.rejected),
    },
    consentTrend: trend.map((row) => ({
      month: row.month,
      accepted: Number(row.accepted),
      rejected: Number(row.rejected),
    })),
    consents,
    pagination: { page, limit },
  };
}

async function getLoginHistory(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, parseInt(query.limit, 10) || 50);
  const offset = (page - 1) * limit;

  const logins = await auditLogModel.getLoginHistory({
    search: query.search || query.q,
    device: query.device || 'all',
    limit,
    offset,
  });

  return { logins, pagination: { page, limit } };
}

async function getAuditLogs(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, parseInt(query.limit, 10) || 50);
  const offset = (page - 1) * limit;

  const logs = await auditLogModel.getAll({
    search: query.search || query.q,
    event: query.event || query.type || 'all',
    days: query.range || query.days || 30,
    limit,
    offset,
  });

  const eventTypes = [...new Set(logs.map((l) => l.event))];

  return { logs, eventTypes, pagination: { page, limit } };
}

async function getCustomersWithResponses(query = {}) {
  const limit = Math.min(100, parseInt(query.limit, 10) || 50);
  const customers = await customerModel.getAllWithResponses({
    search: query.search || query.q,
    limit,
  });
  return { customers, pagination: { limit } };
}

async function exportCustomersWithResponsesExcel(query = {}) {
  const customers = await customerModel.getAllWithResponses({
    search: query.search || query.q,
    limit: 10000,
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Responses');

  const excludeLabels = new Set(['First name', 'Last name', 'Mobile number', 'Email address']);
  const questionHeaders = new Set();
  customers.forEach(c => {
    c.responses.forEach(r => {
      if (!excludeLabels.has(r.label)) {
        questionHeaders.add(r.label);
      }
    });
  });

  const dynamicHeaders = Array.from(questionHeaders);
  const headers = ['Reference', 'Name', 'Email', 'Mobile', 'Consent', 'Submitted At', ...dynamicHeaders];

  // Add header row
  const headerRow = worksheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
  });

  customers.forEach(c => {
    const rowData = [
      c.reference || '',
      c.name || '',
      c.email || '',
      c.mobile || '',
      c.consent || '',
      c.submittedAt ? new Date(c.submittedAt).toLocaleString() : '',
    ];
    
    dynamicHeaders.forEach(header => {
       const response = c.responses.find(r => r.label === header);
       rowData.push(response ? response.value : '');
    });
    
    worksheet.addRow(rowData);
  });

  // Auto-adjust column widths
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = maxLength < 10 ? 10 : Math.min(maxLength + 2, 50);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

async function exportCustomersWithResponsesPdf(query = {}) {
  const customers = await customerModel.getAllWithResponses({
    search: query.search || query.q,
    limit: 10000,
  });

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape', bufferPages: true });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const excludeLabels = new Set(['First name', 'Last name', 'Mobile number', 'Email address']);
      const questionHeaders = new Set();
      customers.forEach(c => {
        c.responses.forEach(r => {
          if (!excludeLabels.has(r.label)) questionHeaders.add(r.label);
        });
      });

      const dynamicHeaders = Array.from(questionHeaders);
      const headers = ['Reference', 'Name', 'Email', 'Mobile', 'Consent', 'Submitted', ...dynamicHeaders];

      // Page/margin settings
      const pageWidth = doc.page.width - 60; // 30px margin each side
      const colCount = headers.length;
      const colWidth = Math.floor(pageWidth / colCount);
      const rowHeight = 20;
      const headerHeight = 24;
      const fontSize = 7;

      // Title
      doc.fontSize(14).font('Helvetica-Bold').text('Responses Report', { align: 'center' });
      doc.moveDown(0.5);

      let startX = 30;
      let startY = doc.y;

      // Draw header background
      doc.rect(startX, startY, pageWidth, headerHeight).fill('#2563EB');

      // Header text
      doc.fillColor('white').font('Helvetica-Bold').fontSize(fontSize);
      headers.forEach((h, i) => {
        doc.text(h, startX + i * colWidth + 3, startY + 7, {
          width: colWidth - 6,
          ellipsis: true,
          lineBreak: false,
        });
      });
      startY += headerHeight;

      // Draw data rows
      doc.fillColor('black').font('Helvetica').fontSize(fontSize);
      customers.forEach((c, rowIndex) => {
        const rowData = [
          c.reference || '',
          c.name || '',
          c.email || '',
          c.mobile || '',
          c.consent || '',
          c.submittedAt ? new Date(c.submittedAt).toLocaleDateString('en-IN') : '',
          ...dynamicHeaders.map(h => {
            const r = c.responses.find(r => r.label === h);
            return r ? String(r.value) : '';
          }),
        ];

        // Alternate row background
        if (rowIndex % 2 === 0) {
          doc.rect(startX, startY, pageWidth, rowHeight).fill('#F1F5F9');
        }

        doc.fillColor('black');
        rowData.forEach((val, i) => {
          doc.text(String(val), startX + i * colWidth + 3, startY + 6, {
            width: colWidth - 6,
            ellipsis: true,
            lineBreak: false,
          });
        });

        // Row border line
        doc.moveTo(startX, startY + rowHeight).lineTo(startX + pageWidth, startY + rowHeight).stroke('#CBD5E1');

        startY += rowHeight;

        // New page if near bottom
        if (startY > doc.page.height - 50) {
          doc.addPage();
          startY = 30;

          // Redraw header on new page
          doc.rect(startX, startY, pageWidth, headerHeight).fill('#2563EB');
          doc.fillColor('white').font('Helvetica-Bold').fontSize(fontSize);
          headers.forEach((h, i) => {
            doc.text(h, startX + i * colWidth + 3, startY + 7, {
              width: colWidth - 6,
              ellipsis: true,
              lineBreak: false,
            });
          });
          startY += headerHeight;
          doc.fillColor('black').font('Helvetica').fontSize(fontSize);
        }
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

async function getCustomerDetail(id) {
  const customer = await customerModel.getCustomerDetail(id);
  if (!customer) {
    const err = new Error('Customer not found');
    err.statusCode = 404;
    throw err;
  }
  return customer;
}

module.exports = {
  getDashboard,
  getCustomers,
  getConsents,
  getLoginHistory,
  getAuditLogs,
  getCustomersWithResponses,
  exportCustomersWithResponsesExcel,
  exportCustomersWithResponsesPdf,
  getCustomerDetail,
};
