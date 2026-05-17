export default function PremiumDiffTable() {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="grid grid-cols-3 bg-slate-100 text-xs text-slate-600">
        <p className="px-3 py-2">項目</p>
        <p className="px-3 py-2">無料</p>
        <p className="px-3 py-2 font-medium text-slate-700">有料</p>
      </div>
      {[
        ["カード枚数", "1枚", "3枚（過去・現在・未来）"],
        ["視点", "今の示唆", "相手視点まで含む"],
        ["行動", "1つ", "今週の行動プラン"],
        ["内容", "汎用", "あなた専用解析"]
      ].map((row) => (
        <div key={row[0]} className="grid grid-cols-3 border-t border-slate-200 text-xs text-slate-600">
          <p className="px-3 py-2">{row[0]}</p>
          <p className="px-3 py-2">{row[1]}</p>
          <p className="bg-indigo-50/70 px-3 py-2 font-medium text-slate-700">{row[2]}</p>
        </div>
      ))}
    </div>
  );
}
