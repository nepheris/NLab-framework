import { buildSiteGenerationHumanSummary } from './present-site-generation-run.mjs';

const REPORT_MARKER = '<!-- nlab-human-validation-report:v1 -->';
const ITEM_PREFIX = '<!-- nlab-human-validation-item:';
const ITEM_SUFFIX = ' -->';
const ITEM_END = '<!-- /nlab-human-validation-item -->';

export class HumanValidationMarkdownError extends Error {
  constructor(message, code = 'HUMAN_VALIDATION_MARKDOWN_ERROR', details = {}) {
    super(message);
    this.name = 'HumanValidationMarkdownError';
    this.code = code;
    this.details = details;
  }
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function normalizeSource(source) {
  if (!source) return null;
  if (typeof source === 'string') return { label: 'Consulter la source', url: source };
  if (typeof source !== 'object' || typeof source.url !== 'string' || !source.url) return null;
  return {
    label: typeof source.label === 'string' && source.label ? source.label : 'Consulter la source',
    url: source.url
  };
}

function humanSummary(summaryOrReport) {
  if (summaryOrReport?.schema === 'nlab.site-generation-human-summary' && summaryOrReport.version === 1) {
    return clone(summaryOrReport);
  }
  return buildSiteGenerationHumanSummary(summaryOrReport);
}

function itemId(index) {
  return `HV-${String(index + 1).padStart(3, '0')}`;
}

export function buildHumanValidationMarkdown(summaryOrReport, {
  title,
  sources = {}
} = {}) {
  const summary = humanSummary(summaryOrReport);
  const items = Array.isArray(summary.human_attention_items) ? summary.human_attention_items : [];
  const reportTitle = title || `Validation HUMAN — ${summary.checklist_name}`;

  const lines = [
    REPORT_MARKER,
    `# 🟣👤 ${reportTitle}`,
    '',
    '> Ce document est une interface HUMAN. Les cases ci-dessous sont relues par machine.',
    '> Pour chaque point, cocher **une seule** réponse : `Validé` ou `À retravailler`.',
    '',
    `**Décision technique courante :** ${summary.decision_icon} ${summary.decision}`,
    `**Contrôles HUMAN :** ${items.length}`,
    ''
  ];

  if (items.length === 0) {
    lines.push('Aucun contrôle HUMAN supplémentaire n’est requis pour ce run.', '');
    return lines.join('\n');
  }

  items.forEach((item, index) => {
    const id = itemId(index);
    const metadata = {
      id,
      stage_id: item.stage_id ?? null,
      kind: item.kind ?? 'human-check'
    };
    const source = normalizeSource(sources[id] ?? (item.stage_id ? sources[item.stage_id] : null));

    lines.push(
      `${ITEM_PREFIX}${JSON.stringify(metadata)}${ITEM_SUFFIX}`,
      `## ${id} — ${item.label || item.stage_id || 'Contrôle HUMAN'}`,
      '',
      item.message ? `**À vérifier :** ${item.message}` : '**À vérifier :** contrôle humain requis.',
      ''
    );

    if (source) {
      lines.push(`**Source :** [${source.label}](${source.url})`, '');
    }

    lines.push(
      '- [ ] ✅ Validé',
      '- [ ] 🔁 À retravailler',
      '',
      '> Commentaire HUMAN (optionnel) :',
      '',
      ITEM_END,
      ''
    );
  });

  return lines.join('\n');
}

function checkboxState(body, labelPattern) {
  const regex = new RegExp(`^- \\[([ xX])\\]\\s+${labelPattern}\\s*$`, 'm');
  const match = body.match(regex);
  if (!match) return { present: false, checked: false };
  return { present: true, checked: match[1].toLowerCase() === 'x' };
}

export function parseHumanValidationMarkdown(markdown) {
  if (typeof markdown !== 'string' || !markdown.includes(REPORT_MARKER)) {
    throw new HumanValidationMarkdownError(
      'Unsupported or missing HUMAN validation report marker',
      'UNSUPPORTED_HUMAN_VALIDATION_REPORT'
    );
  }

  const items = [];
  const itemRegex = /<!-- nlab-human-validation-item:(\{[^\n]*\}) -->\s*([\s\S]*?)<!-- \/nlab-human-validation-item -->/g;
  let match;

  while ((match = itemRegex.exec(markdown)) !== null) {
    let metadata;
    try {
      metadata = JSON.parse(match[1]);
    } catch (error) {
      throw new HumanValidationMarkdownError('Invalid HUMAN item metadata', 'INVALID_ITEM_METADATA', {
        metadata: match[1],
        cause: error.message
      });
    }

    if (!metadata || typeof metadata.id !== 'string' || !metadata.id) {
      throw new HumanValidationMarkdownError('HUMAN item id is required', 'INVALID_ITEM_METADATA');
    }

    const body = match[2];
    const validated = checkboxState(body, '✅\\s+Validé');
    const rework = checkboxState(body, '🔁\\s+À retravailler');

    if (!validated.present || !rework.present) {
      throw new HumanValidationMarkdownError('Both HUMAN response checkboxes are required', 'MISSING_RESPONSE_CHECKBOX', {
        item_id: metadata.id
      });
    }

    let state = 'pending';
    if (validated.checked && rework.checked) state = 'invalid';
    else if (validated.checked) state = 'validated';
    else if (rework.checked) state = 'rework';

    items.push({
      id: metadata.id,
      stage_id: metadata.stage_id ?? null,
      kind: metadata.kind ?? null,
      state,
      validated: validated.checked,
      rework: rework.checked
    });
  }

  const counts = {
    total: items.length,
    validated: items.filter((item) => item.state === 'validated').length,
    rework: items.filter((item) => item.state === 'rework').length,
    pending: items.filter((item) => item.state === 'pending').length,
    invalid: items.filter((item) => item.state === 'invalid').length
  };

  let state = 'validated';
  if (counts.invalid > 0) state = 'invalid';
  else if (counts.rework > 0) state = 'rework';
  else if (counts.pending > 0) state = 'pending';

  return {
    schema: 'nlab.human-validation-markdown-state',
    version: 1,
    state,
    counts,
    items
  };
}

export function humanValidationDecisionFromMarkdown(markdown) {
  const parsed = parseHumanValidationMarkdown(markdown);

  if (parsed.state === 'invalid') {
    throw new HumanValidationMarkdownError(
      'A HUMAN validation item has both responses checked',
      'CONFLICTING_HUMAN_RESPONSES',
      { items: parsed.items.filter((item) => item.state === 'invalid').map((item) => item.id) }
    );
  }

  const status = parsed.state === 'validated'
    ? 'pass'
    : parsed.state === 'rework'
      ? 'fail'
      : 'blocked';

  return {
    status,
    outputs: {
      human_validation: parsed
    },
    warnings: [],
    details: {
      reason: status === 'pass'
        ? 'human_validation_complete'
        : status === 'fail'
          ? 'human_rework_requested'
          : 'human_validation_pending'
    }
  };
}
