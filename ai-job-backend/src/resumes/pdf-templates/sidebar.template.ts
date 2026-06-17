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

export function renderSidebarTemplate({ title, resume }: ResumeTemplateContext) {
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
      line-height: 1.56;
      background: #ffffff;
    }
    .layout {
      display: grid;
      grid-template-columns: 31% 1fr;
      gap: 18px;
      min-height: 100%;
    }
    .side {
      padding: 22px 16px;
      border-radius: 18px;
      background: #111827;
      color: #ffffff;
    }
    .main {
      min-width: 0;
    }
    h1 {
      margin: 0;
      font-size: 28px;
      line-height: 1.18;
      letter-spacing: 0.04em;
    }
    .contact {
      margin-top: 12px;
      color: #d1d5db;
      font-size: 11px;
      line-height: 1.8;
      word-break: break-all;
    }
    section {
      padding-top: 14px;
      break-inside: avoid;
    }
    .side section {
      border-top: 1px solid rgba(255, 255, 255, 0.18);
      margin-top: 14px;
    }
    .main section {
      padding-bottom: 13px;
      border-bottom: 1px solid #e5e7eb;
    }
    h2 {
      margin: 0 0 8px;
      color: #2563eb;
      font-size: 15px;
    }
    .side h2 {
      color: #93c5fd;
      font-size: 13px;
      letter-spacing: 0.08em;
    }
    p { margin: 0; font-size: 12px; }
    .side p { color: #e5e7eb; }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .tag {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 999px;
      background: rgba(147, 197, 253, 0.16);
      color: #bfdbfe;
      font-size: 10px;
      font-weight: 700;
    }
    .item {
      margin-top: 10px;
      break-inside: avoid;
    }
    .item-title {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      color: #111827;
      font-size: 12px;
      font-weight: 800;
    }
    .side .item-title {
      display: block;
      color: #ffffff;
    }
    .date {
      flex-shrink: 0;
      color: #64748b;
      font-weight: 500;
    }
    .side .date {
      color: #d1d5db;
    }
    .description {
      margin-top: 5px;
      white-space: pre-wrap;
      color: #374151;
    }
  </style>
</head>
<body>
  <main class="layout">
    <aside class="side">
      <h1>${escapeHtml(displayName)}</h1>
      <div class="contact">${joinEscaped([basicInfo.phone, basicInfo.email], '<br />')}</div>
      ${renderSkills(resume.skills)}
      ${renderEducations(resume.educations)}
    </aside>
    <div class="main">
      ${renderTextSection('个人总结', resume.summary)}
      ${renderWorkExperiences(resume.workExperiences)}
      ${renderProjects(resume.projects)}
    </div>
  </main>
</body>
</html>
`.trim();
}
