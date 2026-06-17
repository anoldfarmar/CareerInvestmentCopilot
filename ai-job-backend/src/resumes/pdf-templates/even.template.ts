import type { ResumeTemplateContext } from './resume-template.types';
import {
  escapeHtml,
  getDisplayName,
  joinEscaped,
  renderEducations,
  renderProjects,
  renderSkills,
  renderWorkExperiences,
} from './template-utils';

export function renderEvenTemplate({ title, resume }: ResumeTemplateContext) {
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
      color: #191e23;
      font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
      line-height: 1.58;
      background: #ffffff;
    }
    .resume {
      display: grid;
      grid-template-columns: 205px minmax(0, 1fr);
      column-gap: 28px;
      min-height: 100%;
      padding: 32px 38px;
    }
    .side {
      padding-top: 7px;
      border-right: 1px solid #e4e7eb;
    }
    .content {
      min-width: 0;
    }
    h1 {
      margin: 0 0 8px;
      color: #191e23;
      font-size: 31px;
      line-height: 1.1;
      font-weight: 400;
    }
    .contact {
      color: #6c7781;
      font-size: 11px;
      line-height: 1.8;
      word-break: break-all;
    }
    section {
      margin-bottom: 18px;
      break-inside: avoid;
    }
    h2 {
      margin: 0 0 9px;
      color: #0073aa;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.03em;
    }
    p {
      margin: 0;
      color: #30363d;
      font-size: 12px;
      white-space: pre-wrap;
    }
    .side h2 {
      color: #191e23;
      font-size: 13px;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding-right: 12px;
    }
    .tag {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 999px;
      color: #0073aa;
      background: #eef7fb;
      font-size: 10px;
      font-weight: 700;
    }
    .item {
      position: relative;
      margin-top: 12px;
      padding-left: 15px;
      break-inside: avoid;
    }
    .item::before {
      content: "";
      position: absolute;
      left: 0;
      top: 5px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #0073aa;
    }
    .item-title {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      color: #191e23;
      font-size: 12px;
      font-weight: 700;
    }
    .date {
      color: #6c7781;
      font-weight: 400;
      white-space: nowrap;
    }
    .description {
      margin-top: 5px;
      color: #3f444a;
    }
  </style>
</head>
<body>
  <main class="resume">
    <aside class="side">
      <h1>${escapeHtml(displayName)}</h1>
      <div class="contact">${joinEscaped([basicInfo.phone, basicInfo.email], '<br />')}</div>
      ${renderSkills(resume.skills)}
      ${renderEducations(resume.educations)}
    </aside>
    <div class="content">
      ${resume.summary ? `<section><h2>个人总结</h2><p>${escapeHtml(resume.summary)}</p></section>` : ''}
      ${renderWorkExperiences(resume.workExperiences)}
      ${renderProjects(resume.projects)}
    </div>
  </main>
</body>
</html>
`.trim();
}
