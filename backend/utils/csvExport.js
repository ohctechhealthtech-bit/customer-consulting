const { Parser } = require('json2csv');

function exportToCsv(data, fields) {
  try {
    const json2csvParser = new Parser({ fields });
    return json2csvParser.parse(data);
  } catch (err) {
    console.error('CSV Generation Error:', err);
    throw new Error('Failed to generate CSV');
  }
}

module.exports = { exportToCsv };
