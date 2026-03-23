import { AlertTriangle } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";

interface AdvancedOptionsPanelProps {
  recursiveScan: boolean;
  fileOperation: "copy" | "move";
  organizeByDate: boolean;
  onlyPaired: boolean;
  includeVideo: boolean;
  onRecursiveScanChange: (value: boolean) => void;
  onFileOperationChange: (value: "copy" | "move") => void;
  onOrganizeByDateChange: (value: boolean) => void;
  onOnlyPairedChange: (value: boolean) => void;
  onIncludeVideoChange: (value: boolean) => void;
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
      style={{
        background: checked ? "var(--accent)" : "var(--switch-background)",
      }}
    >
      <motion.div
        animate={{ x: checked ? 20 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 bg-white rounded-full"
      />
    </button>
  );
}

export function AdvancedOptionsPanel({
  recursiveScan,
  fileOperation,
  organizeByDate,
  onlyPaired,
  includeVideo,
  onRecursiveScanChange,
  onFileOperationChange,
  onOrganizeByDateChange,
  onOnlyPairedChange,
  onIncludeVideoChange,
}: AdvancedOptionsPanelProps) {
  const { t } = useTranslation();
  return (
    <div
      className="rounded-2xl backdrop-blur-lg border"
      style={{
        background: "var(--glass-bg)",
        borderColor: "var(--glass-border)",
        boxShadow: "0 8px 32px 0 rgba(139, 92, 246, 0.1)",
      }}
    >
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: "var(--glass-divider)" }}
      >
        <h2
          className="text-white"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {t("advanced.title")}
        </h2>
      </div>

      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm" style={{ color: "var(--text-primary)" }}>
            {t("advanced.recursive")}
          </label>
          <Toggle checked={recursiveScan} onChange={onRecursiveScanChange} />
        </div>

        <div>
          <label
            className="block text-xs mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("advanced.fileOp")}
          </label>
          <div className="flex gap-2">
            {(["copy", "move"] as const).map((op) => (
              <button
                key={op}
                onClick={() => onFileOperationChange(op)}
                className="flex-1 px-3 py-2 rounded-lg text-sm transition-all"
                style={{
                  background:
                    fileOperation === op
                      ? "var(--accent-lightops)"
                      : "var(--input-background)",
                  color:
                    fileOperation === op ? "white" : "var(--text-secondary)",
                  border:
                    fileOperation === op
                      ? "none"
                      : "1px solid var(--glass-border)",
                }}
              >
                {t(`advanced.${op}`)}
              </button>
            ))}
          </div>
          {fileOperation === "move" && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1.5 mt-2 text-xs"
              style={{ color: "var(--log-warn)" }}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>{t("advanced.moveWarning")}</span>
            </motion.div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <label
            className="text-sm mr-4"
            style={{ color: "var(--text-primary)" }}
          >
            {t("advanced.organizeByDate")}
          </label>
          <Toggle checked={organizeByDate} onChange={onOrganizeByDateChange} />
        </div>

        <div className="flex items-center justify-between">
          <label
            className="text-sm mr-4"
            style={{ color: "var(--text-primary)" }}
          >
            {t("advanced.onlyPaired")}
          </label>
          <Toggle checked={onlyPaired} onChange={onOnlyPairedChange} />
        </div>

        <div className="flex items-center justify-between">
          <label
            className="text-sm mr-4"
            style={{ color: "var(--text-primary)" }}
          >
            {t("advanced.includeVideo")}
          </label>
          <Toggle checked={includeVideo} onChange={onIncludeVideoChange} />
        </div>
      </div>
    </div>
  );
}
