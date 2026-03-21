import { CompaniesPageClient } from "@/components/companies-page-client";
import { getCompanies, getCompanyOpenRoleCount } from "@/lib/platform";

type CompaniesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getStringValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CompaniesPage({ searchParams }: CompaniesPageProps) {
  const params = await searchParams;
  const selectedCategory = getStringValue(params.category) ?? "";
  const companies = getCompanies()
    .filter((company) => !selectedCategory || company.sector === selectedCategory)
    .map((company) => ({
    company,
    openRoles: getCompanyOpenRoleCount(company.slug)
  }));

  return <CompaniesPageClient companies={companies} selectedCategory={selectedCategory} />;
}
