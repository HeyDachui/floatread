import type { SkinState } from "../skins/types";

interface CompanionArtworkProps {
  state: SkinState;
  communityImageUrl?: string | undefined;
}

export function CompanionArtwork({
  state,
  communityImageUrl,
}: CompanionArtworkProps): React.JSX.Element {
  if (communityImageUrl) {
    return <img className="fr-community-art" src={communityImageUrl} alt="" draggable={false} />;
  }
  return (
    <span className="fr-artwork" aria-hidden="true" data-art-state={state}>
      <span className="fr-orb-core" />
      <span className="fr-orb-focus" />
      <span className="fr-art-detail" />
    </span>
  );
}
