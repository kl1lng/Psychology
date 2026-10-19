// Compares local browser fixtures to the real pure scoring engine; never starts the API.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { spawnSync } = require('node:child_process');
const ts = require('../frontend/node_modules/typescript');
const filename = path.resolve(__dirname, '../frontend/src/mocks/assessment-demo.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
const mod = new Module(filename, module);
mod.filename = filename;
mod.paths = Module._nodeModulePaths(path.dirname(filename));
mod._compile(compiled, filename);
const { DEMO_ASSESSMENTS, getDefinition } = mod.exports;
const aliases = { eysenck: 'eysenck_epi_a', phillips: 'phillips_school', klimov: 'klimov_ddo', luskanova: 'luskanova_motivation' };
const rows = DEMO_ASSESSMENTS.filter((row) => row.is_completed);
const input = rows.map((row) => ({ test_id: aliases[row.test_id], answers: row.question_responses.map((answer) => {
  const question = getDefinition(row.test_id).questions.find((question) => question.id === answer.questionId);
  const option = question.options?.find((option) => (typeof option.label === 'string' ? option.label : option.label.ru) === answer.selectedOption);
  return { question_id: answer.questionId, answer: option ? option.value : answer.selectedOption === 'Да' ? 1 : 0 };
}) }));
const result = spawnSync(path.resolve(__dirname, '../backend/venv/Scripts/python.exe'), ['-c', `
import json, sys
from app.services.scoring_engine import score_assessment
from app.schemas.assessment import AnswerItem
output=[]
for item in json.load(sys.stdin):
    scored=score_assessment(item['test_id'], [AnswerItem(**answer) for answer in item['answers']])
    output.append({'risk': scored['overall_risk'].value, 'scales': [scale.model_dump() for scale in scored['scales']]})
print(json.dumps(output, ensure_ascii=False))
`], { cwd: path.resolve(__dirname, '../backend'), input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
if (result.status !== 0) throw new Error(result.stderr);
const scores = JSON.parse(result.stdout);
for (let index = 0; index < rows.length; index++) {
  if (rows[index].risk_level !== scores[index].risk) throw new Error(`Risk mismatch: ${rows[index].id}`);
  rows[index].scales.forEach((scale, scaleIndex) => {
    const actual = scores[index].scales[scaleIndex];
    if (scale.raw_score !== actual.raw_score || scale.max_score !== actual.max_score || scale.percentage !== actual.percentage) throw new Error(`Scale mismatch: ${rows[index].id}/${scaleIndex}`);
  });
}
console.log(`Parity passed: ${rows.length} complete examples across all four methods.`);
