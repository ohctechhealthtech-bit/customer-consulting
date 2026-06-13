export type MockCustomer = {
  reference: string;
  name: string;
  email: string;
  mobile: string;
  consent: "Accepted" | "Rejected";
  submittedAt: string;
  occupation: string;
  income: string;
  city: string;
  country: string;
};

export type MockLogin = {
  email: string;
  loginTime: string;
  logoutTime: string;
  ip: string;
  browser: string;
  os: string;
  device: "Desktop" | "Mobile" | "Tablet";
};

export type MockAudit = {
  id: string;
  event: string;
  user: string;
  timestamp: string;
  description: string;
};

const firstNames = ["Aarav", "Priya", "Liam", "Sophia", "Noah", "Emma", "Arjun", "Isabella", "Ethan", "Mia", "Rohan", "Olivia", "Daniel", "Ava", "Lucas", "Zara", "Kabir", "Maya", "Aditya", "Sara"];
const lastNames = ["Sharma", "Patel", "Johnson", "Smith", "Williams", "Mehta", "Kumar", "Brown", "Garcia", "Khan", "Singh", "Davis", "Wilson", "Nair", "Iyer", "Reddy", "Anderson", "Martin", "Gupta", "Lopez"];
const cities = ["Mumbai", "London", "New York", "Singapore", "Dubai", "Toronto", "Sydney", "Berlin", "Bangalore", "Paris"];
const countries = ["India", "UK", "USA", "Singapore", "UAE", "Canada", "Australia", "Germany", "India", "France"];
const occupations = ["Software Engineer", "Doctor", "Teacher", "Entrepreneur", "Architect", "Analyst", "Consultant", "Designer"];
const incomes = ["$40k - $60k", "$60k - $90k", "$90k - $120k", "$120k - $180k", "$180k+"];
const browsers = ["Chrome 124", "Safari 17", "Firefox 125", "Edge 124"];
const oses = ["Windows 11", "macOS Sonoma", "iOS 17", "Android 14", "Ubuntu 22.04"];
const devices: MockLogin["device"][] = ["Desktop", "Mobile", "Tablet"];

function seeded(i: number) {
  // tiny deterministic pseudo-random
  const x = Math.sin(i * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function pick<T>(arr: T[], i: number): T {
  return arr[Math.floor(seeded(i) * arr.length)];
}

function dateOffset(days: number, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, Math.floor(seeded(days + hour) * 60), 0, 0);
  return d.toISOString();
}

export const mockCustomers: MockCustomer[] = Array.from({ length: 42 }, (_, i) => {
  const fn = pick(firstNames, i + 1);
  const ln = pick(lastNames, i + 2);
  const cityIdx = Math.floor(seeded(i + 3) * cities.length);
  return {
    reference: `CUS-202606${String((i % 30) + 1).padStart(2, "0")}-${String(i + 1).padStart(5, "0")}`,
    name: `${fn} ${ln}`,
    email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
    mobile: `+1 ${String(2000000000 + Math.floor(seeded(i + 4) * 8e8))}`.slice(0, 16),
    consent: seeded(i + 5) > 0.22 ? "Accepted" : "Rejected",
    submittedAt: dateOffset(i % 30, 9 + (i % 8)),
    occupation: pick(occupations, i + 6),
    income: pick(incomes, i + 7),
    city: cities[cityIdx],
    country: countries[cityIdx],
  };
});

export const mockLogins: MockLogin[] = Array.from({ length: 30 }, (_, i) => {
  const c = mockCustomers[i % mockCustomers.length];
  const login = new Date();
  login.setDate(login.getDate() - (i % 14));
  login.setHours(8 + (i % 10), (i * 7) % 60, 0, 0);
  const logout = new Date(login.getTime() + (10 + (i % 50)) * 60_000);
  return {
    email: c.email,
    loginTime: login.toISOString(),
    logoutTime: logout.toISOString(),
    ip: `192.168.${(i * 13) % 255}.${(i * 7) % 255}`,
    browser: pick(browsers, i + 11),
    os: pick(oses, i + 12),
    device: pick(devices, i + 13),
  };
});

export const mockAudit: MockAudit[] = Array.from({ length: 40 }, (_, i) => {
  const events = ["LOGIN", "OTP_SENT", "OTP_VERIFIED", "CONSENT_SUBMITTED", "PROFILE_UPDATED", "EXPORT_REQUESTED", "ADMIN_LOGIN"];
  const ev = events[i % events.length];
  const c = mockCustomers[i % mockCustomers.length];
  return {
    id: `EVT-${String(10000 + i)}`,
    event: ev,
    user: i % 6 === 0 ? "admin@bank.com" : c.email,
    timestamp: dateOffset(i % 21, (i % 12) + 6),
    description: `${ev.replace(/_/g, " ").toLowerCase()} from ${pick(cities, i + 20)}`,
  };
});

export const dailySubmissions = Array.from({ length: 14 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (13 - i));
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    submissions: 8 + Math.floor(seeded(i + 50) * 22),
    accepted: 6 + Math.floor(seeded(i + 60) * 18),
  };
});

export const deviceDistribution = [
  { name: "Desktop", value: 58 },
  { name: "Mobile", value: 32 },
  { name: "Tablet", value: 10 },
];

export const browserUsage = [
  { name: "Chrome", value: 64 },
  { name: "Safari", value: 18 },
  { name: "Edge", value: 11 },
  { name: "Firefox", value: 7 },
];

export const consentDistribution = [
  { name: "Accepted", value: mockCustomers.filter((c) => c.consent === "Accepted").length },
  { name: "Rejected", value: mockCustomers.filter((c) => c.consent === "Rejected").length },
];

export const consentTrend = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - (11 - i));
  return {
    month: d.toLocaleDateString("en-US", { month: "short" }),
    accepted: 120 + Math.floor(seeded(i + 70) * 80),
    rejected: 20 + Math.floor(seeded(i + 80) * 30),
  };
});
