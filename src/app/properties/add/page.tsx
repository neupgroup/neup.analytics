import { PropertyFormPage } from '@/components/properties/property-form-page';

export default function PropertiesAddPage({
  searchParams,
}: {
  searchParams?: { created?: string };
}) {
  return <PropertyFormPage saved={searchParams?.created === '1'} />;
}