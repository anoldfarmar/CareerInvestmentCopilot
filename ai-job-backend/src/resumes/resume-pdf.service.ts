import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { existsSync } from 'node:fs';
import {
  renderResumePdfTemplate,
  type ResumePdfContent,
  type ResumePdfTemplate,
} from './pdf-templates';

type Browser = import('puppeteer').Browser;
type PuppeteerModule = typeof import('puppeteer');
type LaunchOptions = Parameters<PuppeteerModule['default']['launch']>[0];

@Injectable()
export class ResumePdfService {
  renderHtml(title: string, resume: ResumePdfContent, template: ResumePdfTemplate = 'classic') {
    return renderResumePdfTemplate({ title, resume }, template);
  }

  // 把结构化简历变成 PDF。可以理解为后端版本的“页面渲染 + 浏览器打印”。
  async generatePdf(
    title: string,
    resume: ResumePdfContent,
    template: ResumePdfTemplate = 'classic',
  ) {
    const html = this.renderHtml(title, resume, template);
    let browser: Browser | undefined;

    try {
      const { default: puppeteer } = (await import('puppeteer')) as PuppeteerModule;
      browser = await puppeteer.launch(this.getLaunchOptions());
      const page = await browser.newPage();
      await page.setContent(html, {
        waitUntil: 'domcontentloaded',
      });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '14mm',
          right: '14mm',
          bottom: '14mm',
          left: '14mm',
        },
      });

      return Buffer.from(pdf);
    } catch (error) {
      throw new InternalServerErrorException(
        `生成 PDF 失败：${error instanceof Error ? error.message : '未知错误'}`,
      );
    } finally {
      await browser?.close();
    }
  }

  // Windows 本地开发时优先使用本机 Chrome / Edge；服务器部署时可用环境变量指定浏览器路径。
  private getLaunchOptions(): LaunchOptions {
    const executablePath = this.findBrowserExecutablePath();

    return {
      headless: true,
      ...(executablePath ? { executablePath } : {}),
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    };
  }

  private findBrowserExecutablePath() {
    const candidates = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    ].filter(Boolean) as string[];

    return candidates.find((path) => existsSync(path));
  }

  assertExportable(resume?: ResumePdfContent | null): asserts resume is ResumePdfContent {
    if (!resume) {
      throw new BadRequestException('请先完成结构化或优化后再导出 PDF');
    }
  }
}

export type { ResumePdfContent, ResumePdfTemplate };
