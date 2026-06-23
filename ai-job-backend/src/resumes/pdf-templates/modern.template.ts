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

export function renderModernTemplate({ title, resume }: ResumeTemplateContext) {
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
      color: #172033;
      font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", Arial, sans-serif;
      line-height: 1.58;
      background: #ffffff;
    }
    .hero {
      padding: 22px 24px;
      border-radius: 18px;
      color: #ffffff;
      background: linear-gradient(135deg, #1d4ed8, #0f766e);
    }
    h1 {
      margin: 0;
      font-size: 30px;
      line-height: 1.18;
      letter-spacing: 0.04em;
    }
    .contact {
      margin-top: 10px;
      color: rgba(255, 255, 255, 0.86);
      font-size: 12px;
    }
    section {
      margin-top: 14px;
      padding: 14px 16px;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      background: #ffffff;
      break-inside: avoid;
    }
    h2 {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 9px;
      color: #0f766e;
      font-size: 15px;
    }
    h2::before {
      content: "";
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #2563eb;
    }
    p { margin: 0; font-size: 12px; }
    .tags { display: flex; flex-wrap: wrap; gap: 7px; }
    .tag {
      display: inline-block;
      padding: 4px 9px;
      border-radius: 999px;
      background: #ecfeff;
      color: #0f766e;
      font-size: 11px;
      font-weight: 700;
    }
    .item {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px dashed #d1d5db;
      break-inside: avoid;
    }
    .item:first-of-type {
      border-top: 0;
      padding-top: 0;
    }
    .item-title {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      color: #111827;
      font-size: 12px;
      font-weight: 800;
    }
    .date {
      flex-shrink: 0;
      color: #64748b;
      font-weight: 500;
    }
    .description {
      margin-top: 5px;
      white-space: pre-wrap;
      color: #334155;
    }
  </style>
</head>
<body>
  <main>
    <header class="hero">
      <h1>${escapeHtml(displayName)}</h1>
      <div class="contact">${joinEscaped([basicInfo.phone, basicInfo.email], ' · ')}</div>
    </header>
    ${renderTextSection('职业概要', resume.summary)}
    ${renderSkills(resume.skills)}
    ${renderWorkExperiences(resume.workExperiences)}
    ${renderProjects(resume.projects)}
    ${renderEducations(resume.educations)}
  </main>
</body>
</html>
`.trim();
}
