import type { SkinState } from "../skins/types";

interface CompanionArtworkProps {
  state: SkinState;
  imageUrl?: string | undefined;
}

export function CompanionArtwork({ state, imageUrl }: CompanionArtworkProps): React.JSX.Element {
  if (imageUrl) {
    return <img className="fr-community-art" src={imageUrl} alt="" draggable={false} />;
  }
  return (
    <span className="fr-artwork" aria-hidden="true" data-art-state={state}>
      <span className="fr-orb-core" />
      <span className="fr-orb-focus" />
      <span className="fr-art-detail" />
    </span>
  );
}
