import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Dialog, Input, Popup, Selector, TextArea, Toast } from "antd-mobile";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { AppShell } from "@/components/common/AppShell/AppShell";
import { EmptyState, ErrorState, SkeletonState } from "@/components/common/State/State";
import { LinkRecordCard } from "@/components/link/LinkRecordCard/LinkRecordCard";
import { linkStatusLabels } from "@/components/link/LinkStatusTag/linkStatusLabels";
import { useCreateLink, useDeleteLink, useLinkAnalysis, useLinks, useUpdateLink } from "@/features/link/hooks";
import type { LinkRecord, LinkRecordInput, LinkStatus } from "@/features/link/types";
import { linkRecordSchema } from "@/utils/validators";

const statusOptions: Array<{ label: string; value: LinkStatus | "all" }> = [
  { label: "全部", value: "all" },
  { label: "草稿", value: "draft" },
  { label: "感兴趣", value: "interested" },
  { label: "已投递", value: "applied" },
  { label: "面试中", value: "interviewing" },
  { label: "Offer", value: "offer" },
  { label: "未通过", value: "rejected" },
  { label: "已归档", value: "archived" },
];

const linkStatusOptions = statusOptions.filter(
  (item): item is { label: string; value: LinkStatus } => item.value !== "all",
);

const emptyValues: LinkRecordInput = {
  title: "",
  company: "",
  description: "",
  sourceUrl: "",
  status: "draft",
};

export function LinkManagePage() {
  const [status, setStatus] = useState<LinkStatus | "all">("all");
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<LinkRecord | null>(null);
  const { data, isLoading, isError, refetch } = useLinks(status);
  const analysisQuery = useLinkAnalysis();
  const createMutation = useCreateLink();
  const updateMutation = useUpdateLink();
  const deleteMutation = useDeleteLink();
  const {
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<LinkRecordInput>({
    resolver: zodResolver(linkRecordSchema),
    defaultValues: emptyValues,
  });
  const formValues = watch();

  function openCreate() {
    setEditing(null);
    reset(emptyValues);
    setVisible(true);
  }

  function openEdit(record: LinkRecord) {
    setEditing(record);
    reset({
      title: record.title,
      company: record.company ?? "",
      description: record.description,
      sourceUrl: record.sourceUrl ?? "",
      status: record.status,
    });
    setVisible(true);
  }

  async function handleDelete(id: number) {
    const confirmed = await Dialog.confirm({ content: "确认删除这个岗位/JD 吗？" });
    if (!confirmed) return;
    await deleteMutation.mutateAsync(id);
    Toast.show("已删除");
  }

  async function onSubmit(values: LinkRecordInput) {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, input: values });
      Toast.show("已更新");
    } else {
      await createMutation.mutateAsync(values);
      Toast.show("已新增");
    }
    setVisible(false);
  }

  return (
    <AppShell title="岗位/JD 管理" showBack>
      <div className="page-stack">
        <section className="card page-stack">
          <div className="row">
            <div>
              <strong>目标岗位池</strong>
              <p className="muted mt-1">保存 JD 后，可用于简历定向优化、模拟面试和投递反馈分析。</p>
            </div>
            <Button size="small" color="primary" onClick={openCreate}>
              <Plus size={15} /> 新增
            </Button>
          </div>
          <Selector
            multiple={false}
            value={[status]}
            options={statusOptions}
            onChange={(value) => setStatus((value[0] as LinkStatus | "all") ?? "all")}
          />
        </section>

        {analysisQuery.data ? (
          <section className="card page-stack">
            <div className="section-title">
              <h2>投递反馈分析</h2>
              <span className="pill">{analysisQuery.data.month}</span>
            </div>
            <div className="link-analysis-grid">
              <div>
                <strong>{analysisQuery.data.totalApplications}</strong>
                <span>有效投递</span>
              </div>
              <div>
                <strong>{analysisQuery.data.interviewRate}%</strong>
                <span>面试率</span>
              </div>
              <div>
                <strong>{analysisQuery.data.rejectionRate}%</strong>
                <span>拒绝率</span>
              </div>
              <div>
                <strong>{analysisQuery.data.offerRate}%</strong>
                <span>Offer 率</span>
              </div>
            </div>
            <div className="pill-list">
              <span className="pill">已投递 {analysisQuery.data.statusCounts.applied}</span>
              <span className="pill">面试中 {analysisQuery.data.statusCounts.interviewing}</span>
              <span className="pill">Offer {analysisQuery.data.statusCounts.offer}</span>
              <span className="pill">未通过 {analysisQuery.data.statusCounts.rejected}</span>
            </div>
            <ul className="resume-note-list">
              {analysisQuery.data.insights.map((insight) => (
                <li key={insight}>{insight}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {isLoading ? <SkeletonState rows={3} /> : null}
        {isError ? <ErrorState title="岗位/JD 加载失败" description="请稍后重试。" onAction={() => void refetch()} /> : null}
        {data && data.length === 0 ? (
          <EmptyState
            title="还没有保存岗位"
            description="添加你的第一个目标岗位，后续优化简历时可以直接选择。"
            actionText="添加岗位"
            onAction={openCreate}
          />
        ) : null}
        {data?.map((record) => (
          <LinkRecordCard key={record.id} record={record} onEdit={openEdit} onDelete={(id) => void handleDelete(id)} />
        ))}
      </div>

      <Popup
        visible={visible}
        onMaskClick={() => setVisible(false)}
        bodyStyle={{ borderRadius: "20px 20px 0 0", padding: 16, maxHeight: "88vh", overflow: "auto" }}
      >
        <form className="page-stack" onSubmit={handleSubmit(onSubmit)}>
          <strong>{editing ? "编辑岗位/JD" : "新增岗位/JD"}</strong>
          <Input
            placeholder="岗位名称"
            value={formValues.title}
            onChange={(value) => setValue("title", value, { shouldValidate: true })}
          />
          {errors.title ? <p className="muted text-danger">{errors.title.message}</p> : null}
          <Input
            placeholder="公司名称，可选"
            value={formValues.company}
            onChange={(value) => setValue("company", value, { shouldValidate: true })}
          />
          {errors.company ? <p className="muted text-danger">{errors.company.message}</p> : null}
          <Input
            placeholder="来源链接 https://...，可选"
            value={formValues.sourceUrl}
            onChange={(value) => setValue("sourceUrl", value, { shouldValidate: true })}
          />
          {errors.sourceUrl ? <p className="muted text-danger">{errors.sourceUrl.message}</p> : null}
          <TextArea
            placeholder="粘贴完整岗位 JD"
            rows={6}
            value={formValues.description}
            onChange={(value) => setValue("description", value, { shouldValidate: true })}
          />
          {errors.description ? <p className="muted text-danger">{errors.description.message}</p> : null}
          <Selector
            multiple={false}
            value={[formValues.status]}
            options={linkStatusOptions}
            onChange={(value) => setValue("status", (value[0] as LinkStatus) ?? "draft", { shouldValidate: true })}
          />
          <Button block color="primary" type="submit" loading={createMutation.isPending || updateMutation.isPending}>
            保存
          </Button>
          <p className="muted text-center">当前状态：{linkStatusLabels[formValues.status]}</p>
        </form>
      </Popup>
    </AppShell>
  );
}
