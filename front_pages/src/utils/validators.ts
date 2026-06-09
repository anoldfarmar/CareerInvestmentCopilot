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
  companyName: z.string().min(1, "请输入公司名称"),
  jobTitle: z.string().min(1, "请输入岗位名称"),
  url: z.string().url("请输入有效链接"),
  status: z.enum(["pending", "applied", "interview", "offer", "rejected"], {
    required_error: "请选择投递状态",
  }),
  remark: z.string().optional(),
});

export const interviewSetupSchema = z.object({
  interviewType: z.enum(["general", "professional", "behavioral", "stress", "english"]),
  resumeId: z.string().optional(),
  jobDescription: z.string().optional(),
  knowledgeBaseIds: z.array(z.string()),
  questionCount: z.union([z.literal(5), z.literal(8), z.literal(10)]),
  enableFollowUp: z.boolean(),
  enableVoiceInput: z.boolean(),
  language: z.enum(["zh-CN", "en-US"]),
});
