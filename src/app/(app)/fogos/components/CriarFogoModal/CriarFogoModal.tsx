'use client';

import { useState } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eraser } from 'lucide-react';
import { FormModal } from '@/components/layout/FormModal/FormModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal/ConfirmModal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { MultiSelect } from '@/components/ui/Multiselect/Multiselect';
import { Button } from '@/components/ui/Button/Button';
import { useToast } from '@/components/ui/Toast/Toast';
import { useCreateProjeto } from '@/hooks/fogos/useProjetos';
import { paraKg } from '@/helpers/parseNumbers';
import { formatarKg } from '@/lib/fogoUtils';
import type { Produto, Caminhao, Operador } from '@/types';
import { SecaoAmostras, isAmostraCompleta, type TipoDensidade } from './SecaoAmostras';
import { SecaoFurosFormulario } from './SecaoFurosFormulario';
import { SecaoFotosFormulario } from './SecaoFotosFormulario';
import { furosParaSalvar, pendenciasDosFuros, somarCargasDigitadas, type FurosFormulario } from './furosFormulario';
import styles from './CriarFogoModal.module.scss';

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

const kgDigitadoSchema = z.string().optional().refine(
  (valor) => !valor?.trim() || paraKg(valor) !== null,
  'Informe um número, ex.: 1.500,5',
);

const formSchema = z.object({
  nomeProjeto: z.string().min(1, 'Nome obrigatório'),
  data: z.string().min(1, 'Data obrigatória'),
  amostras: z.array(amostraSchema).min(1),
  numeroNF: z.string().optional(),
  kgPrevisto: kgDigitadoSchema,
  kgAplicado: kgDigitadoSchema,
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
  tipo: TipoDensidade;
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
  const { toast } = useToast();
  const [equipeIds, setEquipeIds] = useState<string[]>([]);
  const [portalContainer, setPortalContainer] = useState<HTMLFormElement | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [versaoAmostras, setVersaoAmostras] = useState(0);
  const [furos, setFuros] = useState<FurosFormulario | null>(null);
  const [fotos, setFotos] = useState<string[]>([]);
  const [erroAoSalvar, setErroAoSalvar] = useState<string | null>(null);

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
  const caminhaoIdValue = useWatch({ control, name: 'caminhaoId' });
  const produtoIdValue = useWatch({ control, name: 'produtoId' });

  const maxDate = new Date().toISOString().split('T')[0];

  const pedirConfirmacao = (amostraIndex: number, tipo: TipoDensidade, numero: number) => {
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

  const pendenciasFuros = pendenciasDosFuros(furos);
  const nomePreenchido = Boolean(nomeProjeto?.trim());
  const dataPreenchida = Boolean(dataValue);
  const densidadesCompletas = amostrasValues.every(isAmostraCompleta);
  const podeSalvar = nomePreenchido && dataPreenchida && densidadesCompletas && pendenciasFuros.length === 0;

  const handleClear = () => {
    reset(defaultFormValues);
    setEquipeIds([]);
    setVersaoAmostras((versao) => versao + 1);
    setFuros(null);
    setFotos([]);
    setPendingConfirmation(null);
    setConfirmClearOpen(false);
  };

  const montarFogo = (values: FormValues) => {
    const caminhao = caminhoes.find((c) => c.id === values.caminhaoId);
    const produto = produtos.find((p) => p.id === values.produtoId);
    const equipe = equipeIds
      .map((id) => operadores.find((o) => o.id === id))
      .filter((o): o is Operador => Boolean(o))
      .map((o) => ({ id: o.id, nome: o.nome }));

    return {
      nomeProjeto: values.nomeProjeto,
      companyId,
      uidUsuario,
      data: values.data,
      amostras: values.amostras.map((amostra, index) => ({
        amostraId: index + 1,
        densidadeInicial: amostra.densidadeInicial,
        densidadeFinal: amostra.densidadeFinal,
      })),
      numeroNF: values.numeroNF,
      kgPrevisto: paraKg(values.kgPrevisto),
      kgAplicado: furos ? somarCargasDigitadas(furos.itens) : paraKg(values.kgAplicado),
      caminhao: caminhao ? { id: caminhao.id, placa: caminhao.placa } : null,
      produto: produto ? { id: produto.id, nome: produto.nome } : null,
      equipe,
      informacoesGerais: values.informacoesGerais,
      furos: furos ? furosParaSalvar(furos) : null,
      fotos,
    };
  };

  const onSubmit = async (values: FormValues) => {
    setErroAoSalvar(null);
    try {
      const { fotosEnviadas } = await criarProjeto(montarFogo(values));
      if (!fotosEnviadas) {
        toast({
          title: 'Fogo salvo, mas as fotos não foram enviadas',
          description: 'Abra o fogo na lista e envie as fotos pela galeria.',
        });
      }
      onClose();
    } catch (erro) {
      console.error('[CriarFogoModal] falha ao salvar fogo:', erro);
      setErroAoSalvar('Não foi possível salvar o fogo. Confira sua permissão nesta empresa e tente novamente.');
    }
  };

  const dicaParaSalvar = !podeSalvar && (
    <>
      {!nomePreenchido && 'Informe o nome do fogo. '}
      {!dataPreenchida && 'Informe a data. '}
      {!densidadesCompletas && 'Confirme a densidade inicial e final de cada amostra. '}
      {pendenciasFuros.join(' ')}
    </>
  );

  const headerActionContent = (
    <Button type="button" variant="ghost" icon={<Eraser size={16} />} onClick={() => setConfirmClearOpen(true)}>
      Limpar valores
    </Button>
  );

  return (
    <>
      <FormModal
        open={open}
        onOpenChange={(v) => !v && onClose()}
        title="Novo fogo"
        description="Cadastro manual"
        headerAction={headerActionContent}
        width={550}
        rotuloAcao="Salvar fogo"
        formId={FORM_ID}
        salvando={isCriando}
        desabilitado={!podeSalvar}
        complementoRodape={dicaParaSalvar}
        erro={erroAoSalvar}
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
            <Input label="Kg previsto" {...register('kgPrevisto')} errorMessage={errors.kgPrevisto?.message} />
            {furos ? (
              <Input
                key="kg-aplicado-dos-furos"
                label="Kg aplicado (soma dos furos)"
                value={formatarKg(somarCargasDigitadas(furos.itens))}
                disabled
                readOnly
              />
            ) : (
              <Input key="kg-aplicado-digitado" label="Kg aplicado" {...register('kgAplicado')} errorMessage={errors.kgAplicado?.message} />
            )}
          </div>

          <div className={styles.row}>
            <Select
              value={caminhaoIdValue ?? ''}
              placeholder="UMB"
              onValueChange={(value) => setValue('caminhaoId', value)}
              options={caminhoes.map((c) => ({ value: c.id, label: c.tag ?? c.placa }))}
            />
            <Select
              value={produtoIdValue ?? ''}
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

          <SecaoAmostras
            key={versaoAmostras}
            campos={fields}
            amostras={amostrasValues}
            mensagemDeErro={(amostraIndex, tipo) =>
              errors.amostras?.[amostraIndex]?.[tipo === 'inicial' ? 'densidadeInicial' : 'densidadeFinal']?.message
            }
            onAdicionar={() => append(amostraVazia())}
            onPedirConfirmacao={pedirConfirmacao}
          />

          <SecaoFurosFormulario furos={furos} setFuros={setFuros} />

          <SecaoFotosFormulario fotos={fotos} setFotos={setFotos} />

          <Input label="Informações gerais" {...register('informacoesGerais')} />
        </form>
      </FormModal>

      <ConfirmModal
        open={pendingConfirmation !== null}
        title="Confirmar densidade"
        description={
          pendingConfirmation
            ? `Confirma densidade ${pendingConfirmation.tipo} de ${pendingConfirmation.numero} g/cm³ para a amostra ${pendingConfirmation.amostraIndex + 1}?`
            : undefined
        }
        onConfirm={handleConfirmDensidade}
        onCancel={() => setPendingConfirmation(null)}
      />

      <ConfirmModal
        open={confirmClearOpen}
        title="Limpar valores?"
        description="Todos os valores preenchidos neste formulário serão apagados. Essa ação não pode ser desfeita."
        confirmLabel="Limpar"
        tone="danger"
        onConfirm={handleClear}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </>
  );
}
