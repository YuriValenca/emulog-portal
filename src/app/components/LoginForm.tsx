'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Input } from '@/components/ui/Input/Input';
import styles from './LoginForm.module.scss';
import { Button } from '@/components/ui/Button/Button';

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
      <h1 className={styles.title}>Portal Emulog</h1>

      <div className={styles.inputs}>
        <Input
          id="email"
          type="email"
          label="E-mail"
          autoComplete="email"
          disabled={submitting}
          error={Boolean(errors.email)}
          errorMessage={errors.email?.message}
          {...register('email')}
        />

        <Input
          id="password"
          type="password"
          label="Senha"
          autoComplete="current-password"
          disabled={submitting}
          error={Boolean(errors.password)}
          errorMessage={errors.password?.message}
          {...register('password')}
        />
      </div>

      {firebaseError && <p className={styles.formError}>{firebaseError}</p>}

      <Button
        variant="ok"
        loading={submitting}
        onClick={() => {
          handleSubmit(onSubmit)();
        }}
      >Entrar</Button>
    </form>
  );
}
