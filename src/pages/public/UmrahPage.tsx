import ServicePage from './ServicePage';
import type { PublicPage, NavigateProps } from '../../components/public/WebsiteRouter';

interface Props {
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }, id?: string) => void;
}

export default function UmrahPage({ onNavigate }: Props) {
  return <ServicePage type="عمرة" onNavigate={onNavigate} />;
}
