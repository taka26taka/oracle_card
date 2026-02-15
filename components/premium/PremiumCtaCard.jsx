export default function PremiumCtaCard({ title, description, buttonLabel, onClick, className = "mt-4" }) {
  return (
    <article
      className={`${className} rounded-2xl border border-amber-200/80 bg-[linear-gradient(170deg,rgba(255,251,235,0.98),rgba(255,255,255,0.98))] p-4 shadow-[0_18px_42px_rgba(15,23,42,0.22)]`}
    >
      <p className="text-xs tracking-[0.16em] text-slate-500">PREMIUM</p>
      <h2 className="mt-2 font-serif-jp text-lg text-slate-700">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <ul className="mt-3 space-y-2 text-xs text-slate-600">
        <li className="rounded-lg border border-amber-200 bg-white px-2.5 py-2">相手視点で温度差の理由を確認</li>
        <li className="rounded-lg border border-amber-200 bg-white px-2.5 py-2">恋の流れを時系列で把握</li>
        <li className="rounded-lg border border-amber-200 bg-white px-2.5 py-2">今週の行動を1行で明確化</li>
      </ul>
      <button
        type="button"
        className="mt-4 min-h-11 w-full rounded-full border border-indigo-300 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(79,70,229,0.38)]"
        onClick={onClick}
      >
        {buttonLabel}
      </button>
    </article>
  );
}
