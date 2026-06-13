const customerModel = require('../models/customerModel');
const consentModel = require('../models/consentModel');
const auditLogModel = require('../models/auditLogModel');

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
  getCustomerDetail,
};
