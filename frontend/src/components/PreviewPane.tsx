import { useState } from "react";
import { Download, ExternalLink, FileCode2, RefreshCw } from "lucide-react";
import { documentApi } from "../api";

interface Props {
  tailoredId: string;
  /** bumps when the user saves edits, forcing the PDF to re-render */
  refreshKey: number;
  rendering: boolean;
}

export default function PreviewPane({
  tailoredId,
  refreshKey,
  rendering,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const src = `${documentApi.pdfUrl(tailoredId)}?v=${refreshKey}`;

  return (
    <div className="flex h-full flex-col bg-canvas">
      <div className="flex shrink-0 items-center justify-between border-b border-line bg-surface px-4 py-2.5">
        <span className="label flex items-center gap-1.5">
          <RefreshCw
            className={`h-3.5 w-3.5 ${rendering ? "animate-spin text-brand" : "text-muted"}`}
          />
          {rendering ? "Rendering PDF…" : "PDF preview"}
        </span>
        <div className="flex gap-2">
          <a
            className="btn-ghost px-3 py-1.5 text-xs"
            href={src}
            target="_blank"
            rel="noreferrer"
            title="Open in a new tab — link hover previews only work outside this embedded preview"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
          </a>
          <a
            className="btn-ghost px-3 py-1.5 text-xs"
            href={documentApi.latexUrl(tailoredId)}
            target="_blank"
            rel="noreferrer"
          >
            <FileCode2 className="h-3.5 w-3.5" /> .tex
          </a>
          <a
            className="btn-primary px-3 py-1.5 text-xs"
            href={documentApi.downloadUrl(tailoredId)}
            target="_blank"
            rel="noreferrer"
          >
            <Download className="h-3.5 w-3.5" /> Download PDF
          </a>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted">
            Compiling LaTeX…
          </div>
        )}
        <iframe
          key={refreshKey}
          title="Resume PDF preview"
          src={src}
          className="h-full w-full"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}
