"""Pure scoring checks: no application startup or external/database access."""
import unittest
from app.services.scoring_engine import load_test_config, score_assessment
from app.schemas.assessment import AnswerItem, RiskLevel


def answers_for(test_id, overrides=None):
    config = load_test_config(test_id)
    values = {question['id']: question.get('options', [{'value': 0}])[0]['value'] for question in config['questions']}
    values.update(overrides or {})
    return [AnswerItem(question_id=question_id, answer=value) for question_id, value in values.items()]


class AssessmentScoringTests(unittest.TestCase):
    def test_missing_answers_rejected(self):
        with self.assertRaises(ValueError):
            score_assessment('eysenck_epi_a', [])

    def test_duplicates_rejected(self):
        answers = answers_for('eysenck_epi_a')
        with self.assertRaises(ValueError):
            score_assessment('eysenck_epi_a', answers + answers[:1])

    def test_invalid_option_rejected(self):
        with self.assertRaises(ValueError):
            score_assessment('eysenck_epi_a', answers_for('eysenck_epi_a', {1: 999}))

    def test_unknown_question_rejected(self):
        answers = answers_for('eysenck_epi_a')
        answers[-1] = AnswerItem(question_id=999, answer=0)
        with self.assertRaises(ValueError):
            score_assessment('eysenck_epi_a', answers)

    def test_extraversion_alone_does_not_raise_risk(self):
        config = load_test_config('eysenck_epi_a')
        extraversion = {key['q']: key['a'] for key in config['scales'][0]['keys']}
        result = score_assessment('eysenck_epi_a', answers_for('eysenck_epi_a', extraversion))
        self.assertEqual(result['scales'][0].raw_score, 24)
        self.assertEqual(result['overall_risk'], RiskLevel.LOW)
        self.assertNotIn('интроверсия', result['scales'][0].interpretation['ru'].lower())

    def test_klimov_preferences_do_not_raise_risk(self):
        result = score_assessment('klimov_ddo', answers_for('klimov_ddo'))
        self.assertEqual(result['overall_risk'], RiskLevel.LOW)
        self.assertEqual(len(result['question_responses']), 20)

    def test_lie_scale_does_not_count_as_distress(self):
        config = load_test_config('eysenck_epi_a')
        lie_keys = {key['q']: key['a'] for key in config['scales'][2]['keys']}
        result = score_assessment('eysenck_epi_a', answers_for('eysenck_epi_a', lie_keys))
        self.assertEqual(result['scales'][2].raw_score, 9)
        self.assertEqual(result['overall_risk'], RiskLevel.LOW)

    def test_motivation_scores_and_direction(self):
        config = load_test_config('luskanova_motivation')
        for choose, expected_risk, expected_score in [(min, RiskLevel.HIGH, 0), (max, RiskLevel.LOW, 30)]:
            overrides = {question['id']: choose(option['value'] for option in question['options']) for question in config['questions']}
            result = score_assessment('luskanova_motivation', answers_for('luskanova_motivation', overrides))
            self.assertEqual(result['scales'][0].raw_score, expected_score)
            self.assertEqual(result['overall_risk'], expected_risk)

    def test_all_methods_return_complete_results(self):
        for test_id in ['eysenck_epi_a', 'phillips_school', 'klimov_ddo', 'luskanova_motivation']:
            with self.subTest(test_id=test_id):
                result = score_assessment(test_id, answers_for(test_id))
                self.assertEqual(len(result['question_responses']), len(load_test_config(test_id)['questions']))
                self.assertTrue(all(0 <= scale.raw_score <= scale.max_score for scale in result['scales']))

    def test_path_traversal_rejected(self):
        with self.assertRaises(FileNotFoundError):
            load_test_config('../eysenck_epi_a')


if __name__ == '__main__':
    unittest.main()
