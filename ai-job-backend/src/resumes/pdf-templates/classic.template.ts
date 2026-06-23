import type { ResumeTemplateContext } from './resume-template.types';
import {
  escapeHtml,
  getDisplayName,
  joinEscaped,
  renderEducations,
  renderProjects,
  renderSkills,
  renderTextSection,
  renderWorkExperiences,
} from './template-utils';

export function renderClassicTemplate({ title, resume }: ResumeTemplateContext) {
  const basicInfo = resume.basicInfo ?? {};
  const displayName = getDisplayName(title, resume);

  return `
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #1f2937;
      font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", Arial, sans-serif;
      line-height: 1.62;
      background: #ffffff;
    }
    .resume { width: 100%; }
    .header {
      padding-bottom: 14px;
      border-bottom: 2px solid #2563eb;
    }
    h1 {
      margin: 0;
      color: #111827;
      font-size: 28px;
      line-height: 1.2;
      letter-spacing: 0.02em;
    }
    .contact {
      margin-top: 8px;
      color: #4b5563;
      font-size: 12px;
    }
    section {
      padding-top: 16px;
      break-inside: avoid;
    }
    h2 {
      margin: 0 0 8px;
      color: #1d4ed8;
      font-size: 15px;
      border-left: 4px solid #2563eb;
      padding-left: 8px;
    }
    p { margin: 0; font-size: 12px; }
    .tags { display: flex; flex-wrap: wrap; gap: 6px; }
    .tag {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 999px;
      background: #eff6ff;
      color: #1d4ed8;
      font-size: 11px;
      font-weight: 600;
    }
    .item { margin-top: 10px; break-inside: avoid; }
    .item-title {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      color: #111827;
      font-size: 12px;
      font-weight: 700;
    }
    .date { flex-shrink: 0; color: #6b7280; font-weight: 400; }
    .description {
      margin-top: 4px;
      white-space: pre-wrap;
      color: #374151;
    }
  </style>
</head>
<body>
  <main class="resume">
    <header class="header">
      <h1>${escapeHtml(displayName)}</h1>
      <div class="contact">${joinEscaped([basicInfo.phone, basicInfo.email], ' · ')}</div>
    </header>
    ${renderTextSection('个人总结', resume.summary)}
    ${renderSkills(resume.skills)}
    ${renderWorkExperiences(resume.workExperiences)}
    ${renderProjects(resume.projects)}
    ${renderEducations(resume.educations)}
  </main>
</body>
</html>
`.trim();
}
