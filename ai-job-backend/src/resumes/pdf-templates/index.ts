import { renderClassicTemplate } from './classic.template';
import { renderEvenTemplate } from './even.template';
import { renderKendallTemplate } from './kendall.template';
import { renderModernTemplate } from './modern.template';
import type { ResumePdfTemplate, ResumeTemplateContext } from './resume-template.types';
import { renderSidebarTemplate } from './sidebar.template';

const templateRenderers: Record<ResumePdfTemplate, (context: ResumeTemplateContext) => string> = {
  classic: renderClassicTemplate,
  modern: renderModernTemplate,
  sidebar: renderSidebarTemplate,
  kendall: renderKendallTemplate,
  even: renderEvenTemplate,
};

export function normalizeResumePdfTemplate(template?: string): ResumePdfTemplate {
  if (
    template === 'modern' ||
    template === 'sidebar' ||
    template === 'classic' ||
    template === 'kendall' ||
    template === 'even'
  ) {
    return template;
  }

  return 'classic';
}

export function renderResumePdfTemplate(context: ResumeTemplateContext, template?: string) {
  const normalizedTemplate = normalizeResumePdfTemplate(template);
  return templateRenderers[normalizedTemplate](context);
}

export type { ResumePdfContent, ResumePdfTemplate } from './resume-template.types';
