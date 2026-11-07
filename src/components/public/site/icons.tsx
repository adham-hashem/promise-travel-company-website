import type { ProgramIconKey } from './siteData';

export function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3z" />
    </svg>
  );
}

const paths: Record<ProgramIconKey, JSX.Element> = {
  hajj: <><path d="M4 9l8-4 8 4v10H4z" /><path d="M4 12h16" /><path d="M10 19v-4h4v4" /></>,
  umrah: <><path d="M12 3a6 6 0 1 0 6 9 7 7 0 1 1-6-9z" /><path d="M17 4l.6 1.4L19 6l-1.4.6L17 8l-.6-1.4L15 6l1.4-.6z" /></>,
  hotels: <><path d="M3 20V8l9-4 9 4v12" /><path d="M3 20h18M8 12h2M14 12h2M8 16h2M14 16h2" /></>,
  internal: <><circle cx="12" cy="8" r="3.5" /><path d="M2 18c3-2 5-2 7 0s5 2 7 0 4-2 6 0" /></>,
  flights: <path d="M2 14l8-2 4-8 2 1-2 7 6-1 1 2-7 3-2 6-2-1 0-5-7 1z" />,
};

export function ProgramIcon({ name, size = 24 }: { name: ProgramIconKey; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
