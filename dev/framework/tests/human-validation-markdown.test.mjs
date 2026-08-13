import assert from 'node:assert/strict';
import {
  HumanValidationMarkdownError,
  buildHumanValidationMarkdown,
  humanValidationDecisionFromMarkdown,
  parseHumanValidationMarkdown
} from '../tools/site/human-validation-markdown.mjs';

const summary = {
  schema: 'nlab.site-generation-human-summary',
  version: 1,
  checklist_name: 'Generic static site generation',
  decision: 'GO',
  decision_icon: '🟢',
  human_attention_items: [
    {
      kind: 'human-stage',
      stage_id: 'generation.preview',
      label: 'Preview',
      message: 'Confirmer le rendu visuel.'
    },
    {
      kind: 'warning',
      stage_id: 'generation.comparison',
      label: 'Comparaison de référence',
      message: 'Deux différences restent à contrôler.'
    }
  ]
};

const markdown = buildHumanValidationMarkdown(summary, {
  sources: {
    'generation.preview': {
      label: 'Ouvrir la preview',
      url: 'https://example.test/preview'
    },
    'generation.comparison': 'https://example.test/comparison'
  }
});

assert.match(markdown, /nlab-human-validation-report:v1/);
assert.match(markdown, /HV-001/);
assert.match(markdown, /HV-002/);
assert.match(markdown, /\[Ouvrir la preview\]\(https:\/\/example\.test\/preview\)/);
assert.match(markdown, /- \[ \] ✅ Validé/);
assert.match(markdown, /- \[ \] 🔁 À retravailler/);

const pending = parseHumanValidationMarkdown(markdown);
assert.equal(pending.state, 'pending');
assert.deepEqual(pending.counts, {
  total: 2,
  validated: 0,
  rework: 0,
  pending: 2,
  invalid: 0
});
assert.equal(humanValidationDecisionFromMarkdown(markdown).status, 'blocked');

const allValidated = markdown.replaceAll('- [ ] ✅ Validé', '- [x] ✅ Validé');
const validatedState = parseHumanValidationMarkdown(allValidated);
assert.equal(validatedState.state, 'validated');
assert.equal(validatedState.counts.validated, 2);
assert.equal(humanValidationDecisionFromMarkdown(allValidated).status, 'pass');

const oneRework = markdown.replace('- [ ] 🔁 À retravailler', '- [x] 🔁 À retravailler');
const reworkState = parseHumanValidationMarkdown(oneRework);
assert.equal(reworkState.state, 'rework');
assert.equal(reworkState.counts.rework, 1);
assert.equal(humanValidationDecisionFromMarkdown(oneRework).status, 'fail');

const conflict = markdown
  .replace('- [ ] ✅ Validé', '- [x] ✅ Validé')
  .replace('- [ ] 🔁 À retravailler', '- [x] 🔁 À retravailler');
assert.equal(parseHumanValidationMarkdown(conflict).state, 'invalid');
assert.throws(
  () => humanValidationDecisionFromMarkdown(conflict),
  (error) => error instanceof HumanValidationMarkdownError && error.code === 'CONFLICTING_HUMAN_RESPONSES'
);

const noChecksMarkdown = buildHumanValidationMarkdown({
  ...summary,
  human_attention_items: []
});
assert.equal(parseHumanValidationMarkdown(noChecksMarkdown).state, 'validated');
assert.equal(humanValidationDecisionFromMarkdown(noChecksMarkdown).status, 'pass');

assert.throws(
  () => parseHumanValidationMarkdown('# ordinary markdown'),
  (error) => error instanceof HumanValidationMarkdownError && error.code === 'UNSUPPORTED_HUMAN_VALIDATION_REPORT'
);

console.log('human-validation-markdown.test.mjs: OK');
