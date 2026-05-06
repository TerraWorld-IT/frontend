import type { CategoryListResponse, CategoryResponse, CreateCategoryRequest } from '@terraworld-it/openapi-frontend'

/**
 * 커스텀 카테고리 CRUD composable.
 * - listMine(): 본인 커스텀만 필터
 * - create(payload): 최대 10개. 중복 이름 시 409
 * - remove(id): soft-delete
 */
export function useCustomCategory() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const { sdk, client } = useOpenApi()

  async function fetchAll(): Promise<CategoryResponse[]> {
    const res = await sdk.listCategories({ client })
    if (res.error) throw res.error
    return castData<CategoryListResponse>(res.data)?.categories ?? []
  }

  async function listMine(): Promise<CategoryResponse[]> {
    return (await fetchAll()).filter(c => c.isCustom)
  }

  async function create(payload: CreateCategoryRequest): Promise<CategoryResponse | null> {
    loading.value = true
    error.value = null
    try {
      const res = await sdk.createCustomCategory({ client, body: payload })
      if (res.error) throw res.error
      return castData<CategoryResponse>(res.data) ?? null
    } catch (e) {
      error.value = errMsg(e, '카테고리 생성 실패')
      return null
    } finally {
      loading.value = false
    }
  }

  async function remove(categoryId: number): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      const res = await sdk.deleteCategory({ client, path: { categoryId } })
      if (res.error) throw res.error
      return true
    } catch (e) {
      error.value = errMsg(e, '카테고리 삭제 실패')
      return false
    } finally {
      loading.value = false
    }
  }

  return { loading, error, fetchAll, listMine, create, remove }
}
