import { useState, useRef } from "react";
import Editor from "@monaco-editor/react";
import { ArrowLeft, Download, Loader2, RefreshCw, Save } from "lucide-react";
import { tailorApi, documentApi, apiError } from "../api";
import type { TailoredResume } from "../types";

interface Props {
  tailored: TailoredResume;
  onBack: () => void;
  onSaved: (updated: TailoredResume) => void;
}

export default function LatexEditorPage({ tailored, onBack, onSaved }: Props) {
  const [latex, setLatex] = useState(tailored.latexSource ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pdfKey, setPdfKey] = useState(0);
  const editorRef = useRef<unknown>(null);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const updated = await tailorApi.saveLatex(tailored.id, latex);
      onSaved(updated);
      setPdfKey(k => k + 1);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-canvas">
      {/* Toolbar */}
      <header className="z-20 flex shrink-0 items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
        <button className="btn-ghost px-2 py-1.5" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <span className="label hidden sm:inline">LaTeX Editor</span>
        <span className="text-xs text-muted hidden sm:inline">— edit source directly, then compile to preview</span>

        <div className="ml-auto flex items-center gap-2">
          {error && <span className="text-xs text-bad">{error}</span>}
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <><Save className="h-4 w-4" /><RefreshCw className="h-3.5 w-3.5" /></>
            }
            {saving ? "Compiling…" : "Save & Compile"}
          </button>
          <a
            className="btn-ghost px-3 py-1.5 text-xs"
            href={documentApi.downloadUrl(tailored.id)}
            target="_blank"
            rel="noreferrer"
          >
            <Download className="h-4 w-4" /> PDF
          </a>
        </div>
      </header>

      {/* Split pane */}
      <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-line">
        {/* Left: Monaco LaTeX editor */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="latex"
            value={latex}
            onChange={val => setLatex(val ?? "")}
            onMount={editor => { editorRef.current = editor; }}
            theme="vs-dark"
            options={{
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
              minimap: { enabled: false },
              wordWrap: "on",
              scrollBeyondLastLine: false,
              lineNumbers: "on",
              renderLineHighlight: "line",
              tabSize: 2,
              automaticLayout: true,
            }}
          />
        </div>

        {/* Right: PDF preview */}
        <div className="flex min-h-0 flex-col bg-neutral-100">
          <div className="flex shrink-0 items-center justify-between border-b border-line bg-surface px-4 py-2">
            <span className="label flex items-center gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${saving ? "animate-spin text-brand" : "text-muted"}`} />
              {saving ? "Compiling PDF…" : "PDF preview"}
            </span>
            <span className="text-xs text-muted">Save &amp; Compile to refresh</span>
          </div>
          <div className="relative min-h-0 flex-1">
            <iframe
              key={pdfKey}
              title="Resume PDF"
              src={`${documentApi.pdfUrl(tailored.id)}?v=${pdfKey}`}
              className="h-full w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
