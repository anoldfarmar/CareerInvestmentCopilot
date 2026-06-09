import { Button, Input, Popup, TextArea, Toast } from "antd-mobile";
import { BookOpen, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { routePaths } from "@/app/router/routePaths";
import { AppShell } from "@/components/common/AppShell/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/State/State";
import { useCreateKnowledgeBase, useKnowledgeBases } from "@/features/knowledgeBase/hooks";

export function KnowledgeBaseListPage() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { data, isLoading, isError, refetch } = useKnowledgeBases();
  const createMutation = useCreateKnowledgeBase();

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

  return (
    <AppShell title="真实面试知识库" showBack>
      <div className="page-stack">
        <section className="card page-stack">
          <div className="row">
            <div>
              <strong>按领域或岗位沉淀真实面试</strong>
              <p className="muted" style={{ margin: "5px 0 0", lineHeight: 1.5 }}>
                每个板块都会形成可用于模拟面试出题的专属知识库。
              </p>
            </div>
            <Button color="primary" size="small" onClick={openCreate}>
              <Plus size={15} /> 新建
            </Button>
          </div>
        </section>

        {isLoading ? <LoadingState text="正在加载真实面试知识库" /> : null}
        {isError ? (
          <ErrorState title="知识库加载失败" description="请稍后重试。" onAction={() => void refetch()} />
        ) : null}
        {data?.length === 0 ? (
          <EmptyState
            title="还没有真实面试知识库"
            description="创建 IT、金融、前端、后端或任意自定义板块，开始沉淀面试经验。"
            actionText="新建知识库"
            onAction={openCreate}
          />
        ) : null}
        {data?.map((knowledgeBase) => (
          <button
            type="button"
            className="card"
            key={knowledgeBase.id}
            onClick={() => navigate(routePaths.realInterviewKnowledgeBaseDetail(knowledgeBase.id))}
            style={{ width: "100%", border: 0, textAlign: "left" }}
          >
            <div className="row">
              <span
                style={{
                  width: 42,
                  height: 42,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 14,
                  color: "var(--color-primary)",
                  background: "var(--color-primary-light)",
                }}
              >
                <BookOpen size={20} />
              </span>
              <span style={{ flex: 1 }}>
                <strong>{knowledgeBase.name}</strong>
                <span className="muted" style={{ display: "block", marginTop: 5 }}>
                  {knowledgeBase.recordCount} 场真实面试 · 更新于 {knowledgeBase.updatedAt}
                </span>
              </span>
            </div>
            {knowledgeBase.description ? (
              <p className="muted" style={{ margin: "12px 0 0", lineHeight: 1.6 }}>
                {knowledgeBase.description}
              </p>
            ) : null}
            {knowledgeBase.focusAreas.length > 0 ? (
              <div style={{ marginTop: 10 }}>
                {knowledgeBase.focusAreas.map((area) => (
                  <span className="pill" key={area} style={{ marginRight: 6 }}>
                    {area}
                  </span>
                ))}
              </div>
            ) : null}
          </button>
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
