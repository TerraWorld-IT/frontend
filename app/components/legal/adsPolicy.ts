import { computed, ref } from 'vue'
import { useRuntimeConfig, useState } from '#imports'
import { isAdsPolicyEffective } from '#shared/utils/adsPolicyEffective'

export { isAdsPolicyEffective }

export function useLegalVersion() {
  const config = useRuntimeConfig()
  // 서버에서 정한 시각을 payload로 전달해 시행 경계에서도 첫 렌더와 하이드레이션을 일치시킨다.
  const renderedAt = useState('ads-policy-rendered-at', () => Date.now())
  const effective = computed(() => isAdsPolicyEffective(config.public.adsEffectiveAt, renderedAt.value))
  const selected = ref<boolean | null>(null)
  const revised = computed({
    get: () => selected.value ?? effective.value,
    set: (value: boolean) => { selected.value = value },
  })
  return { effective, revised }
}
