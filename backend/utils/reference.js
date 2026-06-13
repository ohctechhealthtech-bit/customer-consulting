function generateReferenceNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const seq = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
  return `CUS-${ymd}-${seq}`;
}

module.exports = { generateReferenceNumber };
