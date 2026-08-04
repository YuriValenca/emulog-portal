'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import styles from './LoginForm.module.scss';

const loginSchema = z.object({
  email: z.string().email('Insira um e-mail válido.'),
  password: z.string().min(1, 'Insira sua senha.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const ERROS_LOGIN: Record<string, string> = {
  'auth/invalid-email': 'Insira um e-mail válido.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'Usuário não encontrado.',
  'auth/wrong-password': 'Senha incorreta.',
  'auth/network-request-failed': 'Sem conexão com a internet. Verifique sua rede e tente novamente.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
};

export function LoginForm() {
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setFirebaseError(null);
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
    } catch (error) {
      const code = (error as { code?: string })?.code ?? '';
      setFirebaseError(ERROS_LOGIN[code] ?? 'Não foi possível entrar. Tente novamente.');
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      <h1 className={styles.title}>Emulog Portal</h1>
      <p className={styles.subtitle}>Entre com sua conta</p>

      <label className={styles.label} htmlFor="email">E-mail</label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        className={styles.input}
        disabled={submitting}
        {...register('email')}
      />
      {errors.email && <span className={styles.fieldError}>{errors.email.message}</span>}

      <label className={styles.label} htmlFor="password">Senha</label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        className={styles.input}
        disabled={submitting}
        {...register('password')}
      />
      {errors.password && <span className={styles.fieldError}>{errors.password.message}</span>}

      {firebaseError && <p className={styles.formError}>{firebaseError}</p>}

      <button type="submit" className={styles.submit} disabled={submitting}>
        {submitting ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}
