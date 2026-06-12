import { DefinitionStudioPage } from "@/components/templates/DefinitionStudioPage";

export default async function DefinitionPage({
  params,
}: {
  params: Promise<{ definitionId: string }>;
}) {
  const { definitionId } = await params;

  return <DefinitionStudioPage definitionId={definitionId} />;
}