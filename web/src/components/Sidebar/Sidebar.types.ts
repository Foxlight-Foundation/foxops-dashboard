import type { Section } from '../../types';

export interface SidebarProps {
  section: Section;
  onSectionChange: (section: Section) => void;
}
