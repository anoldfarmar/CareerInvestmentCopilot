import type { StructuredResume } from "@/features/resume/types";

import { ResumeContentPreview } from "../ResumeContentPreview/ResumeContentPreview";

export function StructuredResumePreview({ resume }: { resume: StructuredResume }) {
  return (
    <ResumeContentPreview
      resume={resume}
      title="结构化简历预览"
      description="以下内容由 DeepSeek 从 Markdown 中忠实提取，尚未进行优化。"
    />
  );
}
