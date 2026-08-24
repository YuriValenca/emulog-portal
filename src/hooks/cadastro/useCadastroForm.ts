'use client';

import { useState } from 'react';

interface UseCadastroFormOptions<T extends { id: string }, V extends object> {
  initialValues: V;
  toFormValues: (item: T) => V;
  validate: (values: V, editando: T | null) => string | null;
  criar: (values: V & { companyId: string }) => Promise<unknown>;
  editar: (input: { id: string } & V) => Promise<unknown>;
  companyId: string | null;
  isCriando: boolean;
  isEditando: boolean;
  errorMessage?: (editando: T | null) => string;
}

export function useCadastroForm<T extends { id: string }, V extends object>(
  options: UseCadastroFormOptions<T, V>
) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<T | null>(null);
  const [values, setValues] = useState<V>(options.initialValues);
  const [erro, setErro] = useState<string | null>(null);

  const abrir = (item: T | null = null) => {
    setEditando(item);
    setValues(item ? options.toFormValues(item) : options.initialValues);
    setErro(null);
    setModalOpen(true);
  };

  const fechar = () => {
    setModalOpen(false);
    setEditando(null);
    setValues(options.initialValues);
    setErro(null);
  };

  const salvando = options.isCriando || options.isEditando;

  const handleSalvar = async () => {
    if (!options.companyId) return;
    const erroValidacao = options.validate(values, editando);
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }
    setErro(null);
    try {
      if (editando) {
        await options.editar({ id: editando.id, ...values });
      } else {
        await options.criar({ ...values, companyId: options.companyId });
      }
      fechar();
    } catch {
      setErro(options.errorMessage?.(editando) ?? 'Não foi possível salvar. Tente novamente.');
    }
  };

  return { modalOpen, editando, values, setValues, erro, salvando, abrir, fechar, handleSalvar };
}
