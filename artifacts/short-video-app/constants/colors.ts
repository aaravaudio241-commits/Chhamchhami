/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#F8F5F0',
    tint: '#FF6B57',

    // Core surfaces
    background: '#0B1020',
    foreground: '#F8F5F0',

    // Cards / elevated surfaces
    card: '#151C32',
    cardForeground: '#F8F5F0',

    // Primary action color (buttons, links, active states)
    primary: '#FF6B57',
    primaryForeground: '#0B1020',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#202A47',
    secondaryForeground: '#F8F5F0',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#1A2440',
    mutedForeground: '#B6BDD0',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#29D3C2',
    accentForeground: '#0B1020',

    // Destructive actions (delete, error states)
    destructive: '#FF5268',
    destructiveForeground: '#F8F5F0',

    // Borders and input outlines
    border: '#2A3554',
    input: '#2A3554',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
