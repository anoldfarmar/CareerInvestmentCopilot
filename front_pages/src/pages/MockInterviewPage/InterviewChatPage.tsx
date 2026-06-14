import { Button, Dialog, TextArea, Toast } from "antd-mobile";
import { SendHorizontal } from "lucide-react";
import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { routePaths } from "@/app/router/routePaths";
import { AppShell } from "@/components/common/AppShell/AppShell";
import { ErrorState, LoadingState } from "@/components/common/State/State";
import { ChatBubble, TypingBubble } from "@/components/interview/ChatBubble/ChatBubble";
import { VoiceInputBar } from "@/components/interview/VoiceInputBar/VoiceInputBar";
import {
  useEndInterviewSession,
  useInterviewSession,
  useMoveToNextInterviewQuestion,
  useSubmitInterviewAnswer,
} from "@/features/interview/hooks";
import { useInterviewStore } from "@/stores/interviewStore";

export function InterviewChatPage() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const draftAnswer = useInterviewStore((state) => state.draftAnswer);
  const setDraftAnswer = useInterviewStore((state) => state.setDraftAnswer);
  const resetInterviewDraft = useInterviewStore((state) => state.resetInterviewDraft);
  const { data, isLoading, isError, refetch } = useInterviewSession(sessionId);
  const submitMutation = useSubmitInterviewAnswer();
  const nextQuestionMutation = useMoveToNextInterviewQuestion();
  const endMutation = useEndInterviewSession();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages.length, submitMutation.isPending, nextQuestionMutation.isPending]);

  async function handleSend() {
    const answer = draftAnswer.trim();
    if (!answer) {
      Toast.show("请先输入回答");
      return;
    }

    resetInterviewDraft();
    await submitMutation.mutateAsync({ sessionId, answer });
  }

  async function handleNextQuestion() {
    await nextQuestionMutation.mutateAsync(sessionId);
  }

  async function handleEnd() {
    const confirmed = await Dialog.confirm({ content: "确认结束本轮面试并进入复盘生成吗？" });
    if (!confirmed) return;
    await endMutation.mutateAsync(sessionId);
    navigate(routePaths.interviewProgress(sessionId));
  }

  return (
    <AppShell
      title={data ? `AI 面试官 · 第 ${data.currentQuestion}/${data.totalQuestions} 题` : "AI 面试官"}
      showBack
      showTabBar={false}
    >
      {isLoading ? <LoadingState text="正在进入面试房间" /> : null}
      {isError ? <ErrorState title="面试会话加载失败" description="请重试进入。" onAction={() => void refetch()} /> : null}
      {data ? (
        <div className="page-stack chat-page">
          <section>
            {data.messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
            {submitMutation.isPending || nextQuestionMutation.isPending ? <TypingBubble /> : null}
            <div ref={bottomRef} />
          </section>

          <section className="card page-stack chat-input-bar">
            <TextArea
              rows={2}
              maxLength={600}
              value={draftAnswer}
              placeholder="输入你的回答，建议先结论后展开"
              onChange={setDraftAnswer}
            />
            <div className="chat-input-actions">
              <VoiceInputBar value={draftAnswer} onTranscribed={(text) => setDraftAnswer(text)} />
              <Button
                className="chat-send-btn"
                color="primary"
                loading={submitMutation.isPending}
                disabled={nextQuestionMutation.isPending || data.ended}
                onClick={() => void handleSend()}
              >
                <SendHorizontal size={16} /> 发送
              </Button>
              <Button
                className="chat-end-btn"
                fill="outline"
                loading={nextQuestionMutation.isPending}
                disabled={submitMutation.isPending || data.ended}
                onClick={() => void handleNextQuestion()}
              >
                进入下一题
              </Button>
              <Button
                className="chat-end-btn"
                fill="outline"
                loading={endMutation.isPending}
                disabled={submitMutation.isPending || nextQuestionMutation.isPending}
                onClick={() => void handleEnd()}
              >
                结束
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
