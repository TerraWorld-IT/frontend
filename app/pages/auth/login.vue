<template>
  <div class="min-h-screen bg-riso-cream flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <!-- Glass jar container -->
      <div class="relative">
        <!-- Jar lid -->
        <div class="mx-auto w-32 h-5 bg-riso-walnut/30 rounded-t-lg border-2 border-riso-walnut/20" />
        <div class="mx-auto w-40 h-3 bg-riso-walnut/20 rounded-b-sm -mt-px" />

        <!-- Jar body -->
        <div
          class="relative mx-auto w-full bg-white/30 backdrop-blur-md border-2 border-white/50 rounded-[2rem] rounded-t-[1rem] px-8 pt-10 pb-10 riso-shadow"
          style="background: linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.2) 100%)"
        >
          <!-- Glass highlights -->
          <div class="absolute top-6 left-6 w-16 h-2 bg-white/60 rounded-full rotate-[-20deg]" />
          <div class="absolute top-12 left-4 w-8 h-1.5 bg-white/40 rounded-full rotate-[-20deg]" />

          <!-- Logo -->
          <div class="text-center mb-8">
            <div class="text-4xl mb-2">🪻</div>
            <h1 class="text-xl font-bold text-riso-dark">TerraWorld</h1>
            <p class="text-xs text-riso-dark/40 mt-1">유리병 속 작은 세계</p>
          </div>

          <!-- Form -->
          <form class="space-y-3" @submit.prevent="onSubmit">
            <!-- Signup fields (only visible in signup mode) -->
            <input
              v-if="mode === 'signup'"
              v-model="nickname"
              type="text"
              placeholder="닉네임"
              required
              class="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/80 rounded-xl text-sm text-riso-dark placeholder-riso-dark/30 focus:outline-none focus:border-riso-sage focus:ring-2 focus:ring-riso-sage/20 transition"
            >

            <input
              v-model="email"
              type="email"
              placeholder="이메일"
              required
              class="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/80 rounded-xl text-sm text-riso-dark placeholder-riso-dark/30 focus:outline-none focus:border-riso-sage focus:ring-2 focus:ring-riso-sage/20 transition"
            >

            <input
              v-model="password"
              type="password"
              placeholder="비밀번호"
              required
              class="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/80 rounded-xl text-sm text-riso-dark placeholder-riso-dark/30 focus:outline-none focus:border-riso-sage focus:ring-2 focus:ring-riso-sage/20 transition"
            >

            <button
              type="submit"
              class="w-full py-3 bg-riso-sage text-white font-semibold rounded-xl riso-shadow-sm hover:brightness-110 active:riso-shadow-press transition disabled:opacity-50"
              :disabled="submitting"
            >
              {{ submitting ? '잠시만...' : (mode === 'login' ? '로그인' : '가입하기') }}
            </button>
          </form>

          <!-- Toggle mode -->
          <div class="mt-6 text-center">
            <button
              type="button"
              class="text-xs text-riso-dark/40 hover:text-riso-sage transition"
              @click="toggleMode"
            >
              {{ mode === 'login' ? '계정이 없으신가요? 가입하기' : '이미 계정이 있나요? 로그인' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const { sdk, client } = useOpenApi()
const { setTokens } = useAuth()
const toast = useToast()
const { trackLogin, trackSignup } = useGtagEvents()

const mode = ref<'login' | 'signup'>('login')
const email = ref('')
const password = ref('')
const nickname = ref('')
const submitting = ref(false)

function toggleMode() {
  mode.value = mode.value === 'login' ? 'signup' : 'login'
}

async function onSubmit() {
  if (submitting.value) return
  submitting.value = true
  try {
    if (mode.value === 'login') {
      const { data, error } = await sdk.login({
        client,
        body: { email: email.value, password: password.value },
      })
      if (error) throw new Error(errMsg(error, '로그인 실패'))
      if (data) {
        setTokens(data)
        trackLogin('email')
        toast.success(`${data.nickname}님 환영합니다!`)
        await navigateTo('/')
      }
    }
 else {
      const { data, error } = await sdk.signup({
        client,
        body: { email: email.value, password: password.value, nickname: nickname.value },
      })
      if (error) throw new Error(errMsg(error, '가입 실패'))
      if (data) {
        setTokens(data)
        trackSignup('email')
        toast.success('가입 완료! 테라월드에 오신 걸 환영해요')
        await navigateTo('/')
      }
    }
  }
 catch (e) {
    toast.error((e as Error).message)
  }
 finally {
    submitting.value = false
  }
}
</script>
