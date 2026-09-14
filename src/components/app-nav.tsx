import Link from "next/link";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile", label: "Profile" },
  { href: "/skills", label: "Skills" },
  { href: "/assessments", label: "Assessments" },
  { href: "/teammates", label: "Find teammates" },
  { href: "/team", label: "My team" },
];

export default function AppNav() {
  return (
    <nav aria-label="Primary navigation" className="max-w-full overflow-x-auto">
      <ul className="flex min-w-max items-center gap-4 text-sm text-stone-600">
        {navigation.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="whitespace-nowrap hover:text-stone-950"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
