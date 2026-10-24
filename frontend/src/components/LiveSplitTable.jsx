const personColors = [
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
  "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
  "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200",
  "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200",
  "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
];

function colorForPerson(name, index) {
  return personColors[index % personColors.length];
}

export default function LiveSplitTable({ billState, itemsSubtotal }) {
  const personIndex = {};
  billState.participants.forEach((name, idx) => {
    personIndex[name] = idx;
  });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h2 className="text-lg font-semibold">Live Bill Split</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Session {billState.session_id.slice(0, 8)}…
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
            <tr>
              <th className="px-5 py-3 font-medium">Item</th>
              <th className="px-3 py-3 font-medium">Qty</th>
              <th className="px-3 py-3 font-medium">Price</th>
              <th className="px-5 py-3 font-medium">Assigned</th>
            </tr>
          </thead>
          <tbody>
            {billState.items.map((item) => (
              <tr
                key={item.item_id}
                className="border-t border-slate-100 dark:border-slate-800"
              >
                <td className="px-5 py-3 font-medium">{item.name}</td>
                <td className="px-3 py-3">{item.qty}</td>
                <td className="px-3 py-3">₹{item.total_price.toFixed(2)}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {item.assigned_to.length === 0 ? (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                        Unassigned
                      </span>
                    ) : (
                      item.assigned_to.map((person) => (
                        <span
                          key={`${item.item_id}-${person}`}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorForPerson(
                            person,
                            personIndex[person] ?? 0,
                          )}`}
                        >
                          {person}
                        </span>
                      ))
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="grid gap-2 border-t border-slate-200 px-5 py-4 text-sm dark:border-slate-700">
        <div className="flex justify-between">
          <span className="text-slate-600 dark:text-slate-300">Items Subtotal</span>
          <span className="font-semibold">₹{itemsSubtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600 dark:text-slate-300">Tax / GST</span>
          <span className="font-semibold">₹{billState.tax_and_fees.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-amber-700 dark:text-amber-300">
          <span>Unassigned Amount</span>
          <span className="font-semibold">₹{billState.unassigned_total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-2 text-base dark:border-slate-700">
          <span className="font-semibold">Grand Total</span>
          <span className="font-bold text-saffron-600 dark:text-saffron-500">
            ₹{billState.grand_total.toFixed(2)}
          </span>
        </div>
      </footer>
    </section>
  );
}
