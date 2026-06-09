import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Dialog, Input, Popup, Selector, TextArea, Toast } from "antd-mobile";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { AppShell } from "@/components/common/AppShell/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/State/State";
import { LinkRecordCard } from "@/components/link/LinkRecordCard/LinkRecordCard";
import { linkStatusLabels } from "@/components/link/LinkStatusTag/LinkStatusTag";
import type { LinkRecord, LinkRecordInput, LinkStatus } from "@/features/link/types";
import { useCreateLink, useDeleteLink, useLinks, useUpdateLink } from "@/features/link/hooks";
import { linkRecordSchema } from "@/utils/validators";

const statusOptions = [
  { label: "全部", value: "all" },
  { label: "待投递", value: "pending" },
  { label: "已投递", value: "applied" },
  { label: "面试中", value: "interview" },
  { label: "Offer", value: "offer" },
  { label: "未通过", value: "rejected" },
];

const linkStatusOptions = statusOptions.filter((item) => item.value !== "all");

export function LinkManagePage() {
  const [status, setStatus] = useState<LinkStatus | "all">("all");
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<LinkRecord | null>(null);
  const { data, isLoading, isError, refetch } = useLinks(status);
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
    defaultValues: { companyName: "", jobTitle: "", url: "", status: "pending", remark: "" },
  });
  const formValues = watch();

  function openCreate() {
    setEditing(null);
    reset({ companyName: "", jobTitle: "", url: "", status: "pending", remark: "" });
    setVisible(true);
  }

  function openEdit(record: LinkRecord) {
    setEditing(record);
    reset({
      companyName: record.companyName,
      jobTitle: record.jobTitle,
      url: record.url,
      status: record.status,
      remark: record.remark ?? "",
    });
    setVisible(true);
  }

  async function handleDelete(id: string) {
    const confirmed = await Dialog.confirm({ content: "确认删除这条投递记录吗？" });
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
    <AppShell title="投递链接管理" showBack>
      <div className="page-stack">
        <section className="card page-stack">
          <div className="row">
            <strong>状态筛选</strong>
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

        {isLoading ? <LoadingState text="正在加载投递链接" /> : null}
        {isError ? <ErrorState title="投递链接加载失败" description="请稍后重试。" onAction={() => void refetch()} /> : null}
        {data && data.length === 0 ? (
          <EmptyState title="还没有投递链接" description="添加你的第一个岗位链接，集中管理求职进度" actionText="添加链接" onAction={openCreate} />
        ) : null}
        {data?.map((record) => (
          <LinkRecordCard key={record.id} record={record} onEdit={openEdit} onDelete={(id) => void handleDelete(id)} />
        ))}
      </div>

      <Popup visible={visible} onMaskClick={() => setVisible(false)} bodyStyle={{ borderRadius: "20px 20px 0 0", padding: 16 }}>
        <form className="page-stack" onSubmit={handleSubmit(onSubmit)}>
          <strong>{editing ? "编辑投递链接" : "新增投递链接"}</strong>
          <Input placeholder="公司名称" value={formValues.companyName} onChange={(value) => setValue("companyName", value, { shouldValidate: true })} />
          {errors.companyName ? <p className="muted" style={{ color: "var(--color-danger)" }}>{errors.companyName.message}</p> : null}
          <Input placeholder="岗位名称" value={formValues.jobTitle} onChange={(value) => setValue("jobTitle", value, { shouldValidate: true })} />
          {errors.jobTitle ? <p className="muted" style={{ color: "var(--color-danger)" }}>{errors.jobTitle.message}</p> : null}
          <Input placeholder="投递链接 https://..." value={formValues.url} onChange={(value) => setValue("url", value, { shouldValidate: true })} />
          {errors.url ? <p className="muted" style={{ color: "var(--color-danger)" }}>{errors.url.message}</p> : null}
          <Selector
            multiple={false}
            value={[formValues.status]}
            options={linkStatusOptions}
            onChange={(value) => setValue("status", (value[0] as LinkStatus) ?? "pending", { shouldValidate: true })}
          />
          <TextArea placeholder="备注" rows={3} value={formValues.remark} onChange={(value) => setValue("remark", value)} />
          <Button block color="primary" type="submit" loading={createMutation.isPending || updateMutation.isPending}>
            保存
          </Button>
          <p className="muted" style={{ textAlign: "center" }}>
            当前状态：{linkStatusLabels[formValues.status]}
          </p>
        </form>
      </Popup>
    </AppShell>
  );
}
