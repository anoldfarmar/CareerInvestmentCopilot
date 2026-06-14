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

export function renderKendallTemplate({ title, resume }: ResumeTemplateContext) {
  const basicInfo = resume.basicInfo ?? {};
  const displayName = getDisplayName(title, resume);
  const initials = displayName.slice(0, 1).toUpperCase();

  return `
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #363636;
      font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
      line-height: 1.56;
      background: #ffffff;
    }
    .page {
      padding: 38px 38px 30px;
      background: #ffffff;
      min-height: 100%;
      border-top: 12px solid #334960;
      border-bottom: 12px solid #334960;
    }
    .profile {
      text-align: center;
      border-bottom: 1px solid #d9dee5;
      padding-bottom: 18px;
      margin-bottom: 18px;
    }
    .avatar {
      width: 98px;
      height: 98px;
      margin: 0 auto 12px;
      border: 5px solid #334960;
      border-radius: 50%;
      display: grid;
      place-items: center;
      color: #ffffff;
      background: #227c74;
      font-size: 38px;
      font-weight: 800;
    }
    h1 {
      margin: 0;
      color: #1f2937;
      font-size: 30px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .contact {
      margin-top: 8px;
      color: #607086;
      font-size: 12px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 0.78fr;
      gap: 22px;
    }
    section {
      margin-bottom: 17px;
      break-inside: avoid;
    }
    h2 {
      margin: 0 0 9px;
      color: #227c74;
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    p {
      margin: 0;
      font-size: 12px;
      color: #3f4650;
      white-space: pre-wrap;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
    }
    .tag {
      display: inline-block;
      padding: 4px 9px;
      border-radius: 3px;
      color: #ffffff;
      background: #334960;
      font-size: 10px;
      font-weight: 700;
    }
    .item {
      margin-top: 11px;
      padding: 10px 12px;
      border-left: 4px solid #334960;
      background: #f3f5f7;
      break-inside: avoid;
    }
    .item-title {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      color: #1f2937;
      font-size: 12px;
      font-weight: 800;
    }
    .date {
      color: #6b7280;
      font-weight: 500;
      white-space: nowrap;
    }
    .description {
      margin-top: 5px;
      color: #4b5563;
    }
  </style>
</head>
<body>
  <main class="page">
    <header class="profile">
      <div class="avatar">${escapeHtml(initials)}</div>
      <h1>${escapeHtml(displayName)}</h1>
      <div class="contact">${joinEscaped([basicInfo.phone, basicInfo.email], ' · ')}</div>
    </header>
    <div class="grid">
      <div>
        ${resume.summary ? `<section><h2>About</h2><p>${escapeHtml(resume.summary)}</p></section>` : ''}
        ${renderWorkExperiences(resume.workExperiences)}
        ${renderProjects(resume.projects)}
      </div>
      <aside>
        ${renderSkills(resume.skills)}
        ${renderEducations(resume.educations)}
      </aside>
    </div>
  </main>
</body>
</html>
`.trim();
}
