import UnicornScene from "unicornstudio-react";

export default function UnicornSceneEmbed({
  projectId,
}: {
  projectId: string;
}) {
  return <UnicornScene projectId={projectId} width="100%" height="100%" />;
}
