import type {
  Education,
  ProjectExperience,
  ResumePdfContent,
  WorkExperience,
} from './resume-template.types';

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function joinEscaped(values: Array<string | undefined>, separator: string) {
  return values
    .filter((value): value is string => Boolean(value))
    .map((value) => escapeHtml(value))
    .join(separator);
}

export function getDisplayName(title: string, resume: ResumePdfContent) {
  return resume.basicInfo?.name || title || '我的简历';
}

export function renderTextSection(title: string, text?: string, className = '') {
  if (!text) return '';
  return `
<section class="${className}">
  <h2>${escapeHtml(title)}</h2>
  <p>${escapeHtml(text)}</p>
</section>
`.trim();
}

export function renderSkills(skills?: string[], className = '') {
  if (!skills?.length) return '';

  return `
<section class="${className}">
  <h2>技能</h2>
  <div class="tags">
    ${skills.map((skill) => `<span class="tag">${escapeHtml(skill)}</span>`).join('')}
  </div>
</section>
`.trim();
}

export function renderWorkExperiences(items?: WorkExperience[], className = '') {
  if (!items?.length) return '';

  return `
<section class="${className}">
  <h2>工作经历</h2>
  ${items
    .map(
      (item) => `
  <article class="item">
    <div class="item-title">
      <span>${joinEscaped([item.company, item.position], ' · ')}</span>
      <span class="date">${joinEscaped([item.startDate, item.endDate], ' - ')}</span>
    </div>
    ${item.description ? `<p class="description">${escapeHtml(item.description)}</p>` : ''}
  </article>
`,
    )
    .join('')}
</section>
`.trim();
}

export function renderProjects(items?: ProjectExperience[], className = '') {
  if (!items?.length) return '';

  return `
<section class="${className}">
  <h2>项目经历</h2>
  ${items
    .map(
      (item) => `
  <article class="item">
    <div class="item-title"><span>${escapeHtml(item.name ?? '')}</span></div>
    ${item.description ? `<p class="description">${escapeHtml(item.description)}</p>` : ''}
  </article>
`,
    )
    .join('')}
</section>
`.trim();
}

export function renderEducations(items?: Education[], className = '') {
  if (!items?.length) return '';

  return `
<section class="${className}">
  <h2>教育经历</h2>
  ${items
    .map(
      (item) => `
  <article class="item">
    <div class="item-title">
      <span>${escapeHtml(item.school ?? '')}</span>
      <span class="date">${joinEscaped([item.major, item.degree], ' · ')}</span>
    </div>
  </article>
`,
    )
    .join('')}
</section>
`.trim();
}
