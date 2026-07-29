/**
 * The standalone pages listed in the overlay menu, in display order.
 *
 * Photo collections are not listed here: they come from the database and are
 * passed to the menu separately.
 */

export type NavLink = {
  /** Rendered lowercase at display size, so it doubles as the transition label. */
  label: string
  href: string
}

export const NAV_LINKS: NavLink[] = [
  { label: "index", href: "/" },
  { label: "about", href: "/about" },
  { label: "gear", href: "/gear" },
]
