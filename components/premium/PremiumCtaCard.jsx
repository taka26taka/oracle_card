export default function PremiumCtaCard({ title, description, buttonLabel, onClick, className = "mt-4" }) {
  return (
    <article className={`${className} rounded-2xl border border-amber-200/70 bg-gradient-to-b from-amber-50 to-white p-4`}>
      <p className="text-xs tracking-[0.16em] text-slate-500">PREMIUM</p>
      <h2 className="mt-2 font-serif-jp text-lg text-slate-700">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <button
        type="button"
        className="mt-3 w-full rounded-full border border-slate-200 bg-slate-700 px-5 py-3 text-sm text-white"
        onClick={onClick}
      >
        {buttonLabel}
      </button>
    </article>
  );
}
