const rp = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function rupiah(n: number): string {
  return rp.format(n);
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  return `${d} ${months[m - 1]} ${y}`;
}

export function formatDateTime(stamp: string): string {
  const [date, time] = stamp.split(" ");
  if (!time) return stamp;
  return `${formatDate(date)} · ${time}`;
}

export function periodLabel(from: string, to: string): string {
  if (from === to) return formatDate(from);
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  if (y1 === y2 && m1 === m2) {
    return `${d1}–${d2}/${m1}/${y1}`;
  }
  return `${formatDate(from)} – ${formatDate(to)}`;
}
