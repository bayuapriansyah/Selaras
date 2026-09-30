export type NavItem = {
  label: string;
  href: string;
};

export const navItems: NavItem[] = [
  { label: "Problem", href: "#masalah" },
  { label: "Cara Kerja", href: "#cara-kerja" },
  { label: "Service Passport", href: "#paspor" },
  { label: "Golden Case", href: "#golden-case" },
  { label: "AI", href: "#ai" },
  { label: "Evidence", href: "#graph" },
  { label: "Skalabilitas", href: "#skalabilitas" },
  { label: "Governance", href: "#governance" },
];

export const navHrefs: string[] = navItems.map((item) => item.href);

export const footerLinks: { label: string; href: string }[] = [
  { label: "Problem", href: "#masalah" },
  { label: "How it works", href: "#cara-kerja" },
  { label: "Golden Case", href: "#golden-case" },
  { label: "Governance", href: "#governance" },
  { label: "GitHub", href: "#" },
  { label: "Contact", href: "#" },
];
