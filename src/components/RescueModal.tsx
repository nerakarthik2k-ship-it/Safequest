import { CheckCircle2, UserCheck, UserMinus, X } from 'lucide-react';
import { createItem, SCENARIOS } from '../data/scenarios';
import { ActiveRunState, Survivor } from '../types/game';
import { hasItemType } from '../utils/gameEngine';

interface RescueModalProps {
  run: ActiveRunState;
  survivor: Survivor;
  onEscort: (id: string) => void;
  onSelfEvacuate: (id: string) => void;
  onLeaveBehind: (id: string) => void;
  onClose: () => void;
}

export function RescueModal({
  run,
  survivor,
  onEscort,
  onSelfEvacuate,
  onLeaveBehind,
  onClose,
}: RescueModalProps) {
  const scenario = SCENARIOS[run.scenarioId];
  const canSelfEvac = hasItemType(run.inventory, survivor.selfEvacItem);
  const itemTemplate = createItem(survivor.selfEvacItem, scenario, 'modal-preview');

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rescue-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-amber-500/60 bg-[#131C2B] p-6 space-y-4 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-amber-400">
              Civilian Encounter · {survivor.roomName}
            </p>
            <h3 id="rescue-modal-title" className="font-display text-2xl font-bold text-slate-100">
              {survivor.name} · <span className="font-normal text-slate-300">{survivor.role}</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close rescue dialog"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">{survivor.condition}</p>

        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 space-y-1 text-xs">
          <p className="text-emerald-300 font-medium">Party Bonus: {survivor.perkLabel}</p>
          {survivor.escortSpeedPenalty > 0 && (
            <p className="text-amber-300">
              Injured: Escorting reduces movement speed by {Math.round(survivor.escortSpeedPenalty * 100)}% unless healed with a Medkit.
            </p>
          )}
          {survivor.inHazard && (
            <p className="text-red-400 font-semibold font-mono-tabular">
              Hazard reaching room: {Math.ceil(survivor.urgencySeconds)}s remaining!
            </p>
          )}
        </div>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => onEscort(survivor.id)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
          >
            <UserCheck className="h-4 w-4" />
            <span>Save &amp; Escort With You</span>
          </button>

          <button
            type="button"
            disabled={!canSelfEvac}
            onClick={() => onSelfEvacuate(survivor.id)}
            className={`w-full inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              canSelfEvac
                ? 'border-emerald-500/60 bg-emerald-950/40 text-emerald-200 hover:bg-emerald-900/50 cursor-pointer'
                : 'border-slate-700 bg-slate-900/50 text-slate-500 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              Give {itemTemplate.emoji} {itemTemplate.shortLabel} to Self-Evacuate
            </span>
          </button>
          <p className="text-[11px] text-slate-400 px-1">{survivor.selfEvacText}</p>

          <button
            type="button"
            onClick={() => onLeaveBehind(survivor.id)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-red-300 hover:border-red-500/40 transition-colors cursor-pointer"
          >
            <UserMinus className="h-4 w-4" />
            <span>Leave Behind</span>
          </button>
        </div>
      </div>
    </div>
  );
}
