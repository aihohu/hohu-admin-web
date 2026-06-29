import { ref, onMounted, onUnmounted } from 'vue';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export interface ResponsiveConfig {
  mobile: number;
  tablet: number;
}

const DEFAULT_CONFIG: ResponsiveConfig = {
  mobile: 768,
  tablet: 1024
};

export function useResponsive(config: Partial<ResponsiveConfig> = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const width = ref(typeof window !== 'undefined' ? window.innerWidth : 1920);
  const breakpoint = ref<Breakpoint>('desktop');

  function update() {
    if (typeof window === 'undefined') return;
    width.value = window.innerWidth;
    if (width.value < cfg.mobile) breakpoint.value = 'mobile';
    else if (width.value < cfg.tablet) breakpoint.value = 'tablet';
    else breakpoint.value = 'desktop';
  }

  onMounted(() => {
    update();
    window.addEventListener('resize', update);
  });
  onUnmounted(() => {
    window.removeEventListener('resize', update);
  });

  return { width, breakpoint };
}

export function resolveSpan(fieldUiSchema: Record<string, any>, breakpoint: Breakpoint): number {
  const baseSpan = fieldUiSchema.span ?? 12;
  const responsive = fieldUiSchema.responsive;
  if (responsive?.[breakpoint]?.span !== undefined) {
    return responsive[breakpoint].span;
  }
  if (breakpoint === 'mobile') return 24;
  return baseSpan;
}
