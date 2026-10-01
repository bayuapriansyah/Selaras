export type NavItem = {
  label: string;
  href: string;
};

export const navItems: NavItem[] = [
  { label: "Masalah", href: "#masalah" },
  { label: "Cara Kerja", href: "#cara-kerja" },
  { label: "Service Passport", href: "#paspor" },
  { label: "Golden Case", href: "#golden-case" },
  { label: "AI", href: "#ai" },
  { label: "Bukti", href: "#graph" },
  { label: "Skalabilitas", href: "#skalabilitas" },
  { label: "Tata Kelola", href: "#governance" },
];

export const navHrefs: string[] = navItems.map((item) => item.href);

export const footerLinks: { label: string; href: string }[] = [
  { label: "Masalah", href: "#masalah" },
  { label: "Cara Kerja", href: "#cara-kerja" },
  { label: "Golden Case", href: "#golden-case" },
  { label: "Tata Kelola", href: "#governance" },
  { label: "GitHub", href: "#" },
  { label: "Kontak", href: "#" },
];
