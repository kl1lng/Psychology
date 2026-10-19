// Compares browser-local scoring to the canonical Python scorer using only demo answers.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { spawnSync } = require('node:child_process');
const ts = require('../frontend/node_modules/typescript');

const helperPath = path.resolve(__dirname, '../frontend/src/lib/local-assessment.ts');
const definitionsPath = path.resolve(__dirname, '../frontend/src/mocks/assessment-definitions.json');
const source = fs.readFileSync(helperPath, 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
  .replace('require("@/mocks/assessment-definitions.json")', `require(${JSON.stringify(definitionsPath.replaceAll('\\', '/'))})`);
const helper = new Module(helperPath, module);
helper.filename = helperPath;
helper.paths = Module._nodeModulePaths(path.dirname(helperPath));
helper._compile(compiled, helperPath);

const demoPath = path.resolve(__dirname, '../frontend/src/mocks/assessment-demo.ts');
const demoCompiled = ts.transpileModule(fs.readFileSync(demoPath, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
const demoModule = new Module(demoPath, module);
demoModule.filename = demoPath;
demoModule.paths = Module._nodeModulePaths(path.dirname(demoPath));
demoModule._compile(demoCompiled, demoPath);
const { DEMO_ASSESSMENTS, getDefinition } = demoModule.exports;
const aliases = { eysenck: 'eysenck_epi_a', phillips: 'phillips_school', klimov: 'klimov_ddo', luskanova: 'luskanova_motivation' };
const rows = DEMO_ASSESSMENTS.filter((row) => row.is_completed);
const input = rows.map((row) => ({ test_id: aliases[row.test_id], answers: row.question_responses.map((answer) => {
  const question = getDefinition(row.test_id).questions.find((item) => item.id === answer.questionId);
  const option = question.options?.find((item) => (typeof item.label === 'string' ? item.label : item.label.ru) === answer.selectedOption);
  return { question_id: answer.questionId, answer: option ? option.value : answer.selectedOption === 'Да' ? 1 : 0 };
}) }));

for (const item of input) {
  const local = helper.exports.scoreLocalAssessment(item.test_id, Object.fromEntries(item.answers.map((answer) => [answer.question_id, answer.answer])), 'local-demo-guest', 'ru');
  const result = spawnSync(path.resolve(__dirname, '../backend/venv/Scripts/python.exe'), ['-c', `
import json, sys
from app.services.scoring_engine import score_assessment
from app.schemas.assessment import AnswerItem
item=json.load(sys.stdin)
result=score_assessment(item['test_id'], [AnswerItem(**answer) for answer in item['answers']])
print(json.dumps({'risk': result['overall_risk'].value, 'scales': [scale.model_dump() for scale in result['scales']]}))
`], { cwd: path.resolve(__dirname, '../backend'), input: JSON.stringify(item), encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  if (result.status !== 0) throw new Error(result.stderr);
  const canonical = JSON.parse(result.stdout);
  if (local.overall_risk !== canonical.risk) throw new Error(`Risk mismatch for ${item.test_id}`);
  for (let index = 0; index < canonical.scales.length; index++) {
    const actual = local.scales[index];
    const expected = canonical.scales[index];
    if (actual.raw_score !== expected.raw_score || actual.max_score !== expected.max_score || actual.percentage !== expected.percentage) {
      throw new Error(`Scale mismatch for ${item.test_id}/${index}`);
    }
  }
}
console.log(`Local scoring matches the Python scorer for ${rows.length} completed demo examples.`);
