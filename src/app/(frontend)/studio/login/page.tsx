import { Suspense } from 'react'
import { LoginForm } from './LoginForm'
import './login.css'

export default function StudioLoginPage() {
  return (
    <main className="studio-login">
      <section className="studio-login__card">
        <h1>Studio Login</h1>
        <p>Sign in with your Payload account to access private studio tools.</p>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  )
}
