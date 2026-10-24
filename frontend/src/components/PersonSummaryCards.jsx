export default function PersonSummaryCards({ billState }) {
  const participants =
    billState.participants.length > 0
      ? billState.participants
      : Object.keys(billState.person_totals);

  if (participants.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center dark:border-slate-600 dark:bg-slate-900/50">
        <h2 className="text-lg font-semibold">No splits yet</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Use voice or text to assign items to friends.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Per-Person Summary</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {participants.map((person) => {
          const ownedItems = billState.items.filter((item) =>
            item.assigned_to.includes(person),
          );
          const itemShareTotal = ownedItems.reduce((sum, item) => {
            const share = item.total_price / item.assigned_to.length;
            return sum + share;
          }, 0);
          const payable = billState.person_totals[person] ?? 0;

          return (
            <article
              key={person}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70"
            >
              <header className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold">{person}</h3>
                <span className="rounded-full bg-saffron-100 px-3 py-1 text-sm font-bold text-saffron-700 dark:bg-saffron-900/40 dark:text-saffron-200">
                  ₹{payable.toFixed(2)}
                </span>
              </header>
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                Items paying for
              </p>
              <ul className="mb-3 space-y-1 text-sm text-slate-700 dark:text-slate-200">
                {ownedItems.length === 0 ? (
                  <li className="text-slate-500">No items assigned</li>
                ) : (
                  ownedItems.map((item) => (
                    <li key={`${person}-${item.item_id}`}>
                      {item.name}{" "}
                      <span className="text-slate-500">
                        (₹{(item.total_price / item.assigned_to.length).toFixed(2)})
                      </span>
                    </li>
                  ))
                )}
              </ul>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-xs dark:border-slate-700">
                <span className="text-slate-500">Item share (pre-tax)</span>
                <span className="font-medium">₹{itemShareTotal.toFixed(2)}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
