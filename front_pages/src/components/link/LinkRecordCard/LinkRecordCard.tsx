import { Button } from "antd-mobile";

import type { LinkRecord } from "@/features/link/types";

import { LinkStatusTag } from "../LinkStatusTag/LinkStatusTag";

type LinkRecordCardProps = {
  record: LinkRecord;
  onEdit: (record: LinkRecord) => void;
  onDelete: (id: number) => void;
};

export function LinkRecordCard({ record, onEdit, onDelete }: LinkRecordCardProps) {
  return (
    <article className="card page-stack">
      <div className="row">
        <div>
          <strong>{record.title}</strong>
          <p className="muted mt-1">{record.company || "未填写公司"}</p>
        </div>
        <LinkStatusTag status={record.status} />
      </div>
      {record.sourceUrl ? (
        <a className="muted" href={record.sourceUrl} target="_blank" rel="noreferrer">
          {record.sourceUrl}
        </a>
      ) : null}
      <p className="muted resume-markdown-viewer link-description-preview">{record.description}</p>
      <div className="row">
        <span className="muted">更新于 {record.updatedAt.slice(0, 10)}</span>
        <span>
          <Button size="mini" fill="none" onClick={() => onEdit(record)}>
            编辑
          </Button>
          <Button size="mini" fill="none" color="danger" onClick={() => onDelete(record.id)}>
            删除
          </Button>
        </span>
      </div>
    </article>
  );
}
