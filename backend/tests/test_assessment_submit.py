"""Execute the actual handler in isolation, with no config import or real DB client."""
import ast
import asyncio
import unittest
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional
from fastapi import HTTPException
from app.schemas.assessment import AssessmentSubmit, AssessmentResult, RiskLevel, AnswerItem, ScaleResult
from app.services.scoring_engine import score_assessment, load_test_config


class FakeStorage:
    def __init__(self, fail_table=None):
        self.fail_table = fail_table
        self.current = None
        self.saved = []

    def table(self, name):
        self.current = name
        return self

    def insert(self, record):
        return self

    def execute(self):
        if self.current == self.fail_table:
            raise RuntimeError('Simulated storage failure')
        self.saved.append(self.current)


def isolated_handler(storage):
    source = Path(__file__).parents[1] / 'app/api/v1/assessments.py'
    tree = ast.parse(source.read_text(encoding='utf-8'))
    handler = next(node for node in tree.body if isinstance(node, ast.AsyncFunctionDef) and node.name == 'submit_assessment')
    handler.decorator_list = []
    module = ast.Module(body=[handler], type_ignores=[])
    namespace = dict(AssessmentSubmit=AssessmentSubmit, AssessmentResult=AssessmentResult,
                     Optional=Optional, Depends=lambda value: None, get_current_user=lambda: None, HTTPException=HTTPException,
                     uuid=uuid, datetime=datetime, RiskLevel=RiskLevel, ScaleResult=ScaleResult, score_assessment=score_assessment,
                     get_database=lambda: storage,
                     _localize_field=lambda value, lang: value.get(lang, value.get('ru', '')) if isinstance(value, dict) else str(value))
    exec(compile(module, str(source), 'exec'), namespace)
    handler = namespace['submit_assessment']
    return lambda payload, auth=None: handler(payload, _auth=auth or {'sub': 'guest_fixture', 'role': 'guest'})


class AssessmentSubmitTests(unittest.TestCase):
    def payload(self, complete=True):
        answers = [AnswerItem(question_id=question['id'], answer=0) for question in load_test_config('eysenck_epi_a')['questions']] if complete else []
        return AssessmentSubmit(test_id='eysenck_epi_a', answers=answers)

    def test_failed_primary_save_returns_503(self):
        storage = FakeStorage('assessment_results')
        with self.assertRaises(HTTPException) as caught:
            asyncio.run(isolated_handler(storage)(self.payload()))
        self.assertEqual(caught.exception.status_code, 503)

    def test_incomplete_answers_return_422_before_storage(self):
        storage = FakeStorage()
        with self.assertRaises(HTTPException) as caught:
            asyncio.run(isolated_handler(storage)(self.payload(complete=False)))
        self.assertEqual(caught.exception.status_code, 422)
        self.assertEqual(storage.saved, [])

    def test_success_includes_all_answers(self):
        storage = FakeStorage()
        result = asyncio.run(isolated_handler(storage)(self.payload()))
        self.assertEqual(len(result.question_responses), 57)
        self.assertEqual(storage.saved.count('assessment_results'), 1)

    def test_optional_details_failure_preserves_canonical_save(self):
        storage = FakeStorage('question_responses')
        result = asyncio.run(isolated_handler(storage)(self.payload()))
        self.assertEqual(len(result.question_responses), 57)
        self.assertEqual(storage.saved, ['assessment_results'])

    def test_student_cannot_submit_for_another_student(self):
        payload = self.payload()
        payload.student_id = 'another-student'
        storage = FakeStorage()
        with self.assertRaises(HTTPException) as caught:
            asyncio.run(isolated_handler(storage)(payload, {'sub': 'current-student', 'role': 'student'}))
        self.assertEqual(caught.exception.status_code, 403)
        self.assertEqual(storage.saved, [])

    def test_staff_cannot_impersonate_student(self):
        with self.assertRaises(HTTPException) as caught:
            asyncio.run(isolated_handler(FakeStorage())(self.payload(), {'sub': 'staff', 'role': 'psychologist'}))
        self.assertEqual(caught.exception.status_code, 403)


if __name__ == '__main__':
    unittest.main()
