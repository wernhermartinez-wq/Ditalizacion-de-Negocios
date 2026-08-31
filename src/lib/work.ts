export const workCategories = [
  { value: "website", label: "Sitio web" },
  { value: "seo", label: "SEO" },
  { value: "google_profile", label: "Perfil de Google" },
  { value: "design", label: "Diseño" },
  { value: "campaign", label: "Campaña" },
  { value: "automation", label: "Automatización" },
  { value: "consulting", label: "Consultoría" },
  { value: "maintenance", label: "Mantenimiento" },
  { value: "other", label: "Otro" },
] as const;

export type WorkCategory = (typeof workCategories)[number]["value"];

export function workCategoryLabel(value: string) {
  return workCategories.find((category) => category.value === value)?.label ?? "Otro";
}
