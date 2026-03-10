import type { Section, HealthMap } from '../../types';

export interface SidebarProps {
  section: Section;
  onSectionChange: (section: Section) => void;
  health?: HealthMap;
}
