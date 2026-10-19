// Definitions only: no database, credentials, or student records are accessed.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = { eysenck: 'eysenck_epi_a', phillips: 'phillips_school', klimov: 'klimov_ddo', luskanova: 'luskanova_motivation' };
const definitions = Object.fromEntries(Object.entries(files).map(([id, file]) => [id,
  JSON.parse(fs.readFileSync(path.join(root, 'backend/app/data/tests', `${file}.json`), 'utf8')),
]));
fs.writeFileSync(path.join(root, 'frontend/src/mocks/assessment-definitions.json'), JSON.stringify(definitions, null, 2) + '\n');
