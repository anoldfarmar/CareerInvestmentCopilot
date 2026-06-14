import { z } from "zod";

const resumeFileSchema = z.custom<File>((value) => value instanceof File, {
  message: "请上传简历文件",
});

export const resumeOptimizeSchema = z
  .object({
    jobDirection: z.string().optional(),
    jobDescription: z.string().optional(),
    resumeFile: resumeFileSchema,
  })
  .refine((data) => Boolean(data.jobDirection) || Boolean(data.jobDescription), {
    message: "请选择目标岗位方向或粘贴岗位 JD",
    path: ["jobDescription"],
  })
  .refine((data) => !data.jobDescription || data.jobDescription.length >= 30, {
    message: "岗位 JD 至少需要 30 个字符",
    path: ["jobDescription"],
  });

export const linkRecordSchema = z.object({
  title: z.string().min(1, "请输入岗位名称").max(120, "岗位名称最多 120 个字符"),
  company: z.string().max(120, "公司名称最多 120 个字符").optional(),
  description: z.string().min(30, "岗位 JD 至少需要 30 个字符").max(30000, "岗位 JD 最多 30000 个字符"),
  sourceUrl: z
    .string()
    .optional()
    .refine((value) => !value || /^https?:\/\/.+/i.test(value), "请输入有效链接"),
  status: z.enum(["draft", "interested", "applied", "interviewing", "offer", "rejected", "archived"], {
    required_error: "请选择岗位状态",
  }),
});

export const interviewSetupSchema = z.object({
  interviewType: z.enum(["general", "professional", "behavioral", "stress", "english"]),
  resumeId: z.string().min(1, "请选择一份已结构化或已优化的简历"),
  jobDescription: z.string().optional(),
  knowledgeBaseIds: z.array(z.string()),
  questionCount: z.union([z.literal(5), z.literal(8), z.literal(10)]),
  enableFollowUp: z.boolean(),
  enableVoiceInput: z.boolean(),
  language: z.enum(["zh-CN", "en-US"]),
});
