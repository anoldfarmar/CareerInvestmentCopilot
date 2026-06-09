import { Button } from "antd-mobile";

import type { LinkRecord } from "@/features/link/types";

import { LinkStatusTag } from "../LinkStatusTag/LinkStatusTag";

type LinkRecordCardProps = {
  record: LinkRecord;
  onEdit: (record: LinkRecord) => void;
  onDelete: (id: string) => void;
};

export function LinkRecordCard({ record, onEdit, onDelete }: LinkRecordCardProps) {
  return (
    <article className="card page-stack">
      <div className="row">
        <div>
          <strong>{record.companyName}</strong>
          <p className="muted" style={{ margin: "5px 0 0" }}>
            {record.jobTitle}
          </p>
        </div>
        <LinkStatusTag status={record.status} />
      </div>
      <a className="muted" href={record.url} target="_blank" rel="noreferrer">
        {record.url}
      </a>
      {record.remark ? <p className="muted">{record.remark}</p> : null}
      <div className="row">
        <span className="muted">更新于 {record.updatedAt}</span>
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
