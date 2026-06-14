import { Button, Input, Popup, TextArea, Toast } from "antd-mobile";
import { BookOpen, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { routePaths } from "@/app/router/routePaths";
import { AppShell } from "@/components/common/AppShell/AppShell";
import { EmptyState, ErrorState, SkeletonState } from "@/components/common/State/State";
import { useCreateKnowledgeBase, useDeleteKnowledgeBase, useKnowledgeBases } from "@/features/knowledgeBase/hooks";

export function KnowledgeBaseListPage() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { data, isLoading, isError, refetch } = useKnowledgeBases();
  const createMutation = useCreateKnowledgeBase();
  const deleteMutation = useDeleteKnowledgeBase();

  function openCreate() {
    setName("");
    setDescription("");
    setVisible(true);
  }

  async function handleCreate() {
    if (!name.trim()) {
      Toast.show("请输入知识库名称");
      return;
    }
    const knowledgeBase = await createMutation.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
    });
    setVisible(false);
    Toast.show("知识库已创建");
    navigate(routePaths.realInterviewKnowledgeBaseDetail(knowledgeBase.id));
  }

  async function handleDelete(knowledgeBaseId: string, knowledgeBaseName: string) {
    const confirmed = window.confirm(`确定删除知识库「${knowledgeBaseName}」吗？里面的面试记录也会一起删除。`);
    if (!confirmed) return;

    await deleteMutation.mutateAsync(knowledgeBaseId);
    Toast.show("知识库已删除");
  }

  return (
    <AppShell title="真实面试知识库" showBack>
      <div className="page-stack">
        <section className="card page-stack">
          <div className="row">
            <div>
              <strong>沉淀真实面试，反哺模拟训练</strong>
              <p className="muted mt-1">每个知识库都会形成可用于模拟面试出题的专属素材。</p>
            </div>
            <Button color="primary" size="small" onClick={openCreate}>
              <Plus size={15} /> 新建
            </Button>
          </div>
        </section>

        {isLoading ? <SkeletonState rows={3} /> : null}
        {isError ? (
          <ErrorState title="知识库加载失败" description="请稍后重试。" onAction={() => void refetch()} />
        ) : null}
        {data?.length === 0 ? (
          <EmptyState
            title="还没有真实面试知识库"
            description="创建前端、后端、金融、算法或任意自定义板块，开始沉淀面试经验。"
            actionText="新建知识库"
            onAction={openCreate}
          />
        ) : null}
        {data?.map((knowledgeBase) => (
          <article
            role="button"
            tabIndex={0}
            className="card card-button page-stack"
            key={knowledgeBase.id}
            onClick={() => navigate(routePaths.realInterviewKnowledgeBaseDetail(knowledgeBase.id))}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                navigate(routePaths.realInterviewKnowledgeBaseDetail(knowledgeBase.id));
              }
            }}
          >
            <div className="row">
              <span className="icon-badge">
                <BookOpen size={20} />
              </span>
              <span className="flex-1">
                <strong>{knowledgeBase.name}</strong>
                <span className="muted block-muted mt-1">
                  {knowledgeBase.recordCount} 场真实面试 · 更新于 {knowledgeBase.updatedAt}
                </span>
              </span>
            </div>
            {knowledgeBase.description ? <p className="muted text-block">{knowledgeBase.description}</p> : null}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                size="small"
                fill="none"
                color="danger"
                loading={deleteMutation.isPending}
                onClick={(event) => {
                  event.stopPropagation();
                  void handleDelete(knowledgeBase.id, knowledgeBase.name);
                }}
              >
                删除
              </Button>
            </div>
            <section className="knowledge-impact-card">
              <div className="row">
                <strong>影响统计</strong>
                <span className="pill">
                  本月 {knowledgeBase.impactStats?.monthlyQuestionCount ?? 0} 道题
                </span>
              </div>
              <p>{knowledgeBase.impactStats?.recommendation ?? "下次模拟面试可勾选这个知识库。"}</p>
              <span className="muted">
                关联模拟面试 {knowledgeBase.impactStats?.relatedSessionCount ?? 0} 场
              </span>
            </section>
            {knowledgeBase.focusAreas.length > 0 ? (
              <div className="pill-list">
                {knowledgeBase.focusAreas.map((area) => (
                  <span className="pill" key={area}>
                    {area}
                  </span>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <Popup
        visible={visible}
        onMaskClick={() => setVisible(false)}
        bodyStyle={{ borderRadius: "20px 20px 0 0", padding: 16 }}
      >
        <div className="page-stack">
          <strong>新建真实面试知识库</strong>
          <Input value={name} maxLength={30} placeholder="名称，例如：前端 / 金融 / 大模型算法" onChange={setName} />
          <TextArea
            value={description}
            rows={3}
            maxLength={160}
            placeholder="可选：说明这个板块关注的岗位、公司或能力方向"
            onChange={setDescription}
          />
          <Button block color="primary" loading={createMutation.isPending} onClick={() => void handleCreate()}>
            创建知识库
          </Button>
        </div>
      </Popup>
    </AppShell>
  );
}
