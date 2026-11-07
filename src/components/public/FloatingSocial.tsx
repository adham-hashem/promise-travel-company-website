import { waLink } from './site/siteData';
import { WhatsAppIcon } from './site/icons';

export default function FloatingSocial() {
  return (
    <a className="pm-fab" href={waLink()} target="_blank" rel="noopener noreferrer" aria-label="راسلنا على واتساب">
      <WhatsAppIcon size={30} />
    </a>
  );
}
