'use client';

import { useEffect, useState } from 'react';
import {
  useForm, useFieldArray, useWatch,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, ChevronDown, ChevronUp, Eraser, Check, CheckCircle2,
} from 'lucide-react';
import clsx from 'clsx';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { MultiSelect } from '@/components/ui/Multiselect/Multiselect';
import { Button } from '@/components/ui/Button/Button';
import { useCreateProjeto } from '@/hooks/fogos/useProjetos';
import type { Produto, Caminhao, Operador } from '@/types';
import styles from './CriarFogoModal.module.scss';

function parseDensidade(value: string): number | null {
  if (!value) return null;
  const normalizado = value.replace(',', '.').trim();
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}

const amostraSchema = z.object({
  densidadeInicial: z.number().nullable(),
  densidadeFinal: z.number().nullable(),
}).superRefine((data, ctx) => {
  if (data.densidadeInicial !== null && data.densidadeFinal !== null && data.densidadeFinal > data.densidadeInicial) {
    ctx.addIssue({
      code: 'custom',
      message: 'Densidade final deve ser menor ou igual à inicial',
      path: ['densidadeFinal'],
    });
  }
});

const formSchema = z.object({
  nomeProjeto: z.string().min(1, 'Nome obrigatório'),
  data: z.string().min(1, 'Data obrigatória'),
  amostras: z.array(amostraSchema).min(1),
  numeroNF: z.string().optional(),
  kgPrevisto: z.string().optional(),
  kgAplicado: z.string().optional(),
  caminhaoId: z.string().optional(),
  produtoId: z.string().optional(),
  informacoesGerais: z.string().optional(),
}).superRefine((data, ctx) => {
  const hoje = new Date().toISOString().split('T')[0];
  if (data.data && data.data > hoje) {
    ctx.addIssue({
      code: 'custom',
      message: 'Data não pode ser no futuro',
      path: ['data'],
    });
  }
});

type FormValues = z.infer<typeof formSchema>;
type Tipo = 'inicial' | 'final';

const amostraVazia = () => ({ densidadeInicial: null, densidadeFinal: null });

const defaultFormValues: FormValues = {
  nomeProjeto: '',
  data: '',
  amostras: [amostraVazia()],
  numeroNF: '',
  kgPrevisto: '',
  kgAplicado: '',
  caminhaoId: '',
  produtoId: '',
  informacoesGerais: '',
};

const FORM_ID = 'criar-fogo-form';

interface PendingConfirmation {
  amostraIndex: number;
  tipo: Tipo;
  numero: number;
}

interface CriarFogoModalProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  uidUsuario: string;
  produtos: Produto[];
  caminhoes: Caminhao[];
  operadores: Operador[];
}

export default function CriarFogoModal({
  open, onClose, companyId, uidUsuario, produtos, caminhoes, operadores,
}: CriarFogoModalProps) {
  const { criarProjeto, isCriando } = useCreateProjeto();
  const [equipeIds, setEquipeIds] = useState<string[]>([]);
  const [portalContainer, setPortalContainer] = useState<HTMLFormElement | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [rawInputs, setRawInputs] = useState<Record<string, { inicial: string; final: string }>>({});
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);

  const {
    register, control, handleSubmit, reset, setValue, setError, clearErrors, formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultFormValues,
  });

  const { fields, append } = useFieldArray({ control, name: 'amostras' });

  const nomeProjeto = useWatch({ control, name: 'nomeProjeto' });
  const dataValue = useWatch({ control, name: 'data' });
  const amostrasValues = useWatch({ control, name: 'amostras' });

  useEffect(() => {
    if (open) {
      reset(defaultFormValues);
      setEquipeIds([]);
      setCollapsedIds(new Set());
      setConfirmClearOpen(false);
      setRawInputs({});
      setPendingConfirmation(null);
    }
  }, [open, reset]);

  const maxDate = new Date().toISOString().split('T')[0];

  const toggleCollapse = (fieldId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(fieldId)) {
        next.delete(fieldId);
      } else {
        next.add(fieldId);
      }
      return next;
    });
  };

  const getRaw = (fieldId: string, tipo: Tipo) => rawInputs[fieldId]?.[tipo] ?? '';

  const handleRawChange = (fieldId: string, tipo: Tipo, value: string) => {
    setRawInputs((prev) => ({ ...prev, [fieldId]: { ...prev[fieldId], [tipo]: value } }));
  };

  const requestConfirm = (amostraIndex: number, fieldId: string, tipo: Tipo) => {
    const raw = getRaw(fieldId, tipo);
    const numero = parseDensidade(raw);
    if (numero === null) return;

    const amostraAtual = amostrasValues[amostraIndex];
    const path = `amostras.${amostraIndex}.densidade${tipo === 'inicial' ? 'Inicial' : 'Final'}` as const;

    if (tipo === 'inicial' && amostraAtual.densidadeFinal !== null && numero < amostraAtual.densidadeFinal) {
      setError(path, { type: 'manual', message: 'Densidade inicial não pode ser menor que a final já confirmada' });
      return;
    }
    if (tipo === 'final' && amostraAtual.densidadeInicial !== null && numero > amostraAtual.densidadeInicial) {
      setError(path, { type: 'manual', message: 'Densidade final não pode ser maior que a inicial já confirmada' });
      return;
    }

    clearErrors(path);
    setPendingConfirmation({ amostraIndex, tipo, numero });
  };

  const handleConfirmDensidade = () => {
    if (!pendingConfirmation) return;
    const { amostraIndex, tipo, numero } = pendingConfirmation;
    const path = `amostras.${amostraIndex}.densidade${tipo === 'inicial' ? 'Inicial' : 'Final'}` as const;
    setValue(path, numero, { shouldValidate: true });
    setPendingConfirmation(null);
  };

  const isAmostraCompleta = (amostra: { densidadeInicial: number | null; densidadeFinal: number | null }) => (
    amostra.densidadeInicial !== null && amostra.densidadeFinal !== null
  );

  const nomePreenchido = Boolean(nomeProjeto?.trim());
  const dataPreenchida = Boolean(dataValue);
  const densidadesCompletas = amostrasValues.every(isAmostraCompleta);
  const podeSalvar = nomePreenchido && dataPreenchida && densidadesCompletas;

  const handleClear = () => {
    reset(defaultFormValues);
    setEquipeIds([]);
    setCollapsedIds(new Set());
    setRawInputs({});
    setPendingConfirmation(null);
    setConfirmClearOpen(false);
  };

  const onSubmit = async (values: FormValues) => {
    const caminhao = caminhoes.find((c) => c.id === values.caminhaoId);
    const produto = produtos.find((p) => p.id === values.produtoId);
    const equipe = equipeIds
      .map((id) => operadores.find((o) => o.id === id))
      .filter((o): o is Operador => Boolean(o))
      .map((o) => ({ id: o.id, nome: o.nome }));

    const amostras = values.amostras.map((amostra, index) => ({
      amostraId: index + 1,
      densidadeInicial: amostra.densidadeInicial,
      densidadeFinal: amostra.densidadeFinal,
    }));

    await criarProjeto({
      nomeProjeto: values.nomeProjeto,
      companyId,
      uidUsuario,
      data: values.data,
      amostras,
      numeroNF: values.numeroNF,
      kgPrevisto: values.kgPrevisto,
      kgAplicado: values.kgAplicado,
      caminhao: caminhao ? { id: caminhao.id, placa: caminhao.placa } : null,
      produto: produto ? { id: produto.id, nome: produto.nome } : null,
      equipe,
      informacoesGerais: values.informacoesGerais,
    });

    onClose();
  };

  const footerContent = (
    <div className={styles.footerContent}>
      {!podeSalvar && (
        <span className={styles.saveHint}>
          {!nomePreenchido && 'Informe o nome do fogo. '}
          {!dataPreenchida && 'Informe a data. '}
          {!densidadesCompletas && 'Confirme a densidade inicial e final de cada amostra.'}
        </span>
      )}

      <Button type="submit" form={FORM_ID} variant="ok" loading={isCriando} disabled={!podeSalvar}>
        Salvar fogo
      </Button>
    </div>
  );

  const headerActionContent = (
    <Button type="button" variant="ghost" icon={<Eraser size={16} />} onClick={() => setConfirmClearOpen(true)}>
      Limpar valores
    </Button>
  );

  return (
    <>
      <Modal
        open={open}
        onOpenChange={(v) => !v && onClose()}
        title="Novo fogo"
        description="Cadastro manual"
        headerAction={headerActionContent}
        width={550}
        footer={footerContent}
      >
        <form id={FORM_ID} ref={setPortalContainer} onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <Input label="Nome do fogo" {...register('nomeProjeto')} errorMessage={errors.nomeProjeto?.message} />

          <div className={styles.row}>
            <Input
              type="date"
              label="Data"
              max={maxDate}
              {...register('data')}
              errorMessage={errors.data?.message}
            />
            <Input label="Nº Nota Fiscal" {...register('numeroNF')} />
          </div>

          <div className={styles.row}>
            <Input label="Kg previsto" {...register('kgPrevisto')} />
            <Input label="Kg aplicado" {...register('kgAplicado')} />
          </div>

          <div className={styles.row}>
            <Select
              placeholder="UMB"
              onValueChange={(value) => setValue('caminhaoId', value)}
              options={caminhoes.map((c) => ({ value: c.id, label: c.tag ?? c.placa }))}
            />
            <Select
              placeholder="Produto"
              onValueChange={(value) => setValue('produtoId', value)}
              options={produtos.map((p) => ({ value: p.id, label: p.nome }))}
            />
          </div>

          <MultiSelect
            label="Equipe"
            placeholder="Adicionar membro"
            searchPlaceholder="Buscar operador"
            values={equipeIds}
            onValuesChange={setEquipeIds}
            options={operadores.map((o) => ({ value: o.id, label: `${o.nome} — ${o.cargo}` }))}
            portalContainer={portalContainer}
          />

          <div className={styles.amostras}>
            {fields.map((field, amostraIndex) => {
              const amostraAtual = amostrasValues[amostraIndex];
              const completa = amostraAtual ? isAmostraCompleta(amostraAtual) : false;
              const isCollapsed = collapsedIds.has(field.id);

              return (
                <div key={field.id} className={styles.amostraBox}>
                  <div className={styles.amostraHeader}>
                    <span className={styles.amostraTitulo}>Amostra {amostraIndex + 1}</span>
                    <span className={clsx(styles.amostraProgress, completa && styles.amostraProgressDone)}>
                      {completa ? 'Completa' : 'Incompleta'}
                    </span>
                    <button
                      type="button"
                      className={styles.collapseBtn}
                      onClick={() => toggleCollapse(field.id)}
                      aria-expanded={!isCollapsed}
                      aria-label={isCollapsed ? 'Expandir amostra' : 'Recolher amostra'}
                    >
                      {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                  </div>

                  <div
                    className={clsx(styles.collapseWrapper, !isCollapsed && styles.collapseWrapperOpen)}
                    aria-hidden={isCollapsed}
                  >
                    <div className={styles.collapseInner}>
                      {(['inicial', 'final'] as Tipo[]).map((tipo) => {
                        const confirmado = tipo === 'inicial' ? amostraAtual?.densidadeInicial : amostraAtual?.densidadeFinal;
                        const label = tipo === 'inicial' ? 'Densidade inicial' : 'Densidade final';
                        const errorMessage = tipo === 'inicial'
                          ? errors.amostras?.[amostraIndex]?.densidadeInicial?.message
                          : errors.amostras?.[amostraIndex]?.densidadeFinal?.message;

                        if (confirmado !== null && confirmado !== undefined) {
                          return (
                            <div key={tipo} className={styles.densidadeConfirmedRow}>
                              <CheckCircle2 size={16} color="var(--ok)" />
                              <span>{label}: {confirmado.toFixed(2)} g/cm³</span>
                            </div>
                          );
                        }

                        return (
                          <div key={tipo} className={styles.densidadeRow}>
                            <div className={styles.densidadeInputWrapper}>
                              <Input
                                label={label}
                                placeholder="g/cm³"
                                value={getRaw(field.id, tipo)}
                                onChange={(e) => handleRawChange(field.id, tipo, e.target.value)}
                                errorMessage={errorMessage}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              icon={<Check size={20} />}
                              disabled={parseDensidade(getRaw(field.id, tipo)) === null}
                              onClick={() => requestConfirm(amostraIndex, field.id, tipo)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            <Button type="button" variant="ghost" icon={<Plus size={16} />} onClick={() => append(amostraVazia())}>
              Adicionar amostra
            </Button>
          </div>

          <Input label="Informações gerais" {...register('informacoesGerais')} />
        </form>
      </Modal>

      <Modal
        open={pendingConfirmation !== null}
        onOpenChange={(v) => !v && setPendingConfirmation(null)}
        title="Confirmar densidade"
        width={300}
      >
        {pendingConfirmation && (
          <div className={styles.confirmPopup}>
            <p>
              Confirma densidade {pendingConfirmation.tipo === 'inicial' ? 'inicial' : 'final'} de {pendingConfirmation.numero} g/cm³ para a amostra {pendingConfirmation.amostraIndex + 1}?
            </p>
            <div className={styles.confirmActions}>
              <Button type="button" variant="ghost" onClick={() => setPendingConfirmation(null)}>
                Cancelar
              </Button>
              <Button type="button" variant="ok" onClick={handleConfirmDensidade}>
                Confirmar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={confirmClearOpen}
        onOpenChange={(v) => !v && setConfirmClearOpen(false)}
        title="Limpar valores?"
        description="Essa ação não pode ser desfeita."
        width={350}
      >
        <div className={styles.confirmPopup}>
          <p>Tem certeza que deseja limpar todos os valores preenchidos neste formulário?</p>
          <div className={styles.confirmActions}>
            <Button type="button" variant="ghost" onClick={() => setConfirmClearOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="cancel" onClick={handleClear}>
              Limpar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
