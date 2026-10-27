'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { Check, Info, Plus, Trash2 } from 'lucide-react';
import { FormModal } from '@/components/layout/FormModal/FormModal';
import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { useConfigurarAlertaVencimento } from '@/hooks/vencimentos/useConfigurarAlertaVencimento';
import {
  ROTULO_DO_TIPO_PADRAO, TIPOS_PADRAO, alertaPadraoDaChave, alertaParaChave, erroNoNomeDoTipo,
} from '@/lib/vencimento';
import { MAXIMO_DE_TIPOS_PERSONALIZADOS } from '@/schemas/vencimento';
import type { AlertaVencimento, AlertaVencimentoPorTipo, TipoVencimentoPersonalizado } from '@/types';
import styles from './ConfigurarAlertaModal.module.scss';

type Unidade = 'horas' | 'dias';

const MENSAGEM_DE_LIMITE = `A empresa já tem ${MAXIMO_DE_TIPOS_PERSONALIZADOS} tipos, o máximo. Exclua um tipo para criar outro.`;

interface LinhaState {
  unidade: Unidade;
  alerta: string;
  critico: string;
}

interface TipoEditado extends TipoVencimentoPersonalizado {
  salvo: boolean;
}

function unidadeInicial(horas: number): Unidade {
  return horas >= 48 ? 'dias' : 'horas';
}

function horasParaValor(horas: number, unidade: Unidade): string {
  return unidade === 'dias' ? String(Math.round(horas / 24)) : String(horas);
}

function valorParaHoras(valor: string, unidade: Unidade): number {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero <= 0) return NaN;
  return unidade === 'dias' ? numero * 24 : numero;
}

function linhaDoAlerta(alerta: AlertaVencimento): LinhaState {
  const unidade = unidadeInicial(alerta.horasAlerta);
  return { unidade, alerta: horasParaValor(alerta.horasAlerta, unidade), critico: horasParaValor(alerta.horasCritico, unidade) };
}

function prazoDaLinha(linha: LinhaState, rotulo: string | undefined): AlertaVencimento | string {
  const horasAlerta = valorParaHoras(linha.alerta, linha.unidade);
  const horasCritico = valorParaHoras(linha.critico, linha.unidade);
  if (!Number.isFinite(horasAlerta) || !Number.isFinite(horasCritico)) return `Preencha valores válidos para "${rotulo}".`;
  if (horasAlerta <= horasCritico) return `Em "${rotulo}", o valor de alerta deve ser maior que o de crítico.`;
  return { horasAlerta: Math.round(horasAlerta), horasCritico: Math.round(horasCritico) };
}

function estadoInicial(config: AlertaVencimentoPorTipo | undefined, tipos: TipoVencimentoPersonalizado[]): Record<string, LinhaState> {
  const chaves = [...TIPOS_PADRAO, ...tipos.map((tipo) => tipo.id)];
  return Object.fromEntries(chaves.map((chave) => [chave, linhaDoAlerta(alertaParaChave(config, chave))]));
}

interface CamposDoPrazoProps {
  chave: string;
  linha: LinhaState;
  desabilitado: boolean;
  onChange: (patch: Partial<LinhaState>) => void;
  onTrocarUnidade: (unidade: Unidade) => void;
}

function CamposDoPrazo({ chave, linha, desabilitado, onChange, onTrocarUnidade }: CamposDoPrazoProps) {
  return (
    <div className={styles.camposRow}>
      <Input id={`alerta-${chave}`} label="Alerta" value={linha.alerta} onChange={(e) => onChange({ alerta: e.target.value })} disabled={desabilitado} />
      <Input id={`critico-${chave}`} label="Crítico" value={linha.critico} onChange={(e) => onChange({ critico: e.target.value })} disabled={desabilitado} />
      <Select
        value={linha.unidade}
        label="Unidade"
        onValueChange={(v) => onTrocarUnidade(v as Unidade)}
        options={[
          { value: 'horas', label: 'Horas' },
          { value: 'dias', label: 'Dias' },
        ]}
        disabled={desabilitado}
        size="sm"
      />
    </div>
  );
}

interface ConfigurarAlertaModalProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  alertaVencimentoAtual: AlertaVencimentoPorTipo | undefined;
  tiposAtuais: TipoVencimentoPersonalizado[];
  onSolicitarExclusao: (tipo: TipoVencimentoPersonalizado) => void;
}

export default function ConfigurarAlertaModal({
  open, onClose, companyId, alertaVencimentoAtual, tiposAtuais, onSolicitarExclusao,
}: ConfigurarAlertaModalProps) {
  const { salvarConfiguracao, isSalvando } = useConfigurarAlertaVencimento();
  const [linhas, setLinhas] = useState<Record<string, LinhaState>>(() => estadoInicial(alertaVencimentoAtual, tiposAtuais));
  const [tipos, setTipos] = useState<TipoEditado[]>(() => tiposAtuais.map((tipo) => ({ ...tipo, salvo: true })));
  const [rascunho, setRascunho] = useState<TipoVencimentoPersonalizado | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const rotuloDaChave = (chave: string) =>
    ROTULO_DO_TIPO_PADRAO[chave as keyof typeof ROTULO_DO_TIPO_PADRAO] ?? tipos.find((tipo) => tipo.id === chave)?.nome.trim();
  const limiteAtingido = tipos.length >= MAXIMO_DE_TIPOS_PERSONALIZADOS;

  const atualizarLinha = (chave: string, patch: Partial<LinhaState>) => {
    setLinhas((prev) => ({ ...prev, [chave]: { ...prev[chave], ...patch } }));
  };

  const trocarUnidade = (chave: string, unidade: Unidade) => {
    setLinhas((prev) => {
      const linha = prev[chave];
      const horasAlerta = valorParaHoras(linha.alerta, linha.unidade);
      const horasCritico = valorParaHoras(linha.critico, linha.unidade);
      return {
        ...prev,
        [chave]: {
          unidade,
          alerta: Number.isFinite(horasAlerta) ? horasParaValor(horasAlerta, unidade) : linha.alerta,
          critico: Number.isFinite(horasCritico) ? horasParaValor(horasCritico, unidade) : linha.critico,
        },
      };
    });
  };

  const comecarTipo = () => {
    if (limiteAtingido) return;
    const id = crypto.randomUUID();
    setRascunho({ id, nome: '' });
    setLinhas((prev) => ({ ...prev, [id]: linhaDoAlerta(alertaPadraoDaChave(id)) }));
  };

  const cancelarTipo = () => {
    setRascunho(null);
    setErro(null);
  };

  const confirmarTipo = () => {
    if (!rascunho) return;
    if (limiteAtingido) return setErro(MENSAGEM_DE_LIMITE);
    const erroDoNome = erroNoNomeDoTipo(rascunho.nome, tipos.map((tipo) => tipo.nome));
    if (erroDoNome) return setErro(erroDoNome);
    const prazo = prazoDaLinha(linhas[rascunho.id], rascunho.nome.trim());
    if (typeof prazo === 'string') return setErro(prazo);

    setTipos((prev) => [...prev, { id: rascunho.id, nome: rascunho.nome.trim(), salvo: false }]);
    setRascunho(null);
    setErro(null);
  };

  const renomearTipo = (id: string, nome: string) => {
    setTipos((prev) => prev.map((tipo) => (tipo.id === id ? { ...tipo, nome } : tipo)));
  };

  const removerTipo = (tipo: TipoEditado) => {
    if (tipo.salvo) return onSolicitarExclusao(tipo);
    setTipos((prev) => prev.filter((t) => t.id !== tipo.id));
  };

  const erroNosNomes = (): string | null => {
    for (const tipo of tipos) {
      const outros = tipos.filter((t) => t.id !== tipo.id).map((t) => t.nome);
      const erroDoNome = erroNoNomeDoTipo(tipo.nome, outros);
      if (erroDoNome) return erroDoNome;
    }
    return null;
  };

  const handleSalvar = async () => {
    if (rascunho) return setErro('Confirme ou cancele o tipo novo antes de salvar.');
    if (tipos.length > MAXIMO_DE_TIPOS_PERSONALIZADOS) return setErro(MENSAGEM_DE_LIMITE);
    const erroDoNome = erroNosNomes();
    if (erroDoNome) return setErro(erroDoNome);

    const resultado: AlertaVencimentoPorTipo = {};
    for (const chave of [...TIPOS_PADRAO, ...tipos.map((tipo) => tipo.id)]) {
      const prazo = prazoDaLinha(linhas[chave], rotuloDaChave(chave));
      if (typeof prazo === 'string') return setErro(prazo);
      resultado[chave] = prazo;
    }

    setErro(null);
    try {
      await salvarConfiguracao({
        companyId,
        alertaVencimento: resultado,
        tiposVencimento: tipos.map(({ id, nome }) => ({ id, nome: nome.trim() })),
      });
      onClose();
    } catch {
      setErro('Não foi possível salvar a configuração. Tente novamente.');
    }
  };

  return (
    <FormModal
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title="Tipos e alertas de vencimento"
      description="Defina, por tipo, com quanto tempo de antecedência cada nível de urgência começa."
      width={560}
      rotuloAcao="Salvar configuração"
      onAcao={handleSalvar}
      salvando={isSalvando}
      erro={erro}
    >
      <div className={styles.lista}>
        {TIPOS_PADRAO.map((tipo) => (
          <div key={tipo} className={styles.linha}>
            <span className={styles.tipoLabel}>{ROTULO_DO_TIPO_PADRAO[tipo]}</span>
            <CamposDoPrazo
              chave={tipo}
              linha={linhas[tipo]}
              desabilitado={isSalvando}
              onChange={(patch) => atualizarLinha(tipo, patch)}
              onTrocarUnidade={(unidade) => trocarUnidade(tipo, unidade)}
            />
          </div>
        ))}

        <span className={styles.secao}>Tipos da empresa</span>
        {tipos.length === 0 && <p className={styles.vazio}>Nenhum tipo criado. Ex: CRLV, revisão da UMB, documentação ambiental.</p>}
        {tipos.map((tipo) => (
          <div key={tipo.id} className={styles.linha}>
            <div className={styles.nomeRow}>
              <Input
                id={`nome-${tipo.id}`}
                label="Nome do tipo"
                placeholder="Ex: CRLV"
                value={tipo.nome}
                onChange={(e) => renomearTipo(tipo.id, e.target.value)}
                maxLength={40}
                disabled={isSalvando}
              />
              <Button
                variant="ghost"
                icon={<Trash2 size={16} />}
                aria-label={`Excluir o tipo ${tipo.nome || 'novo'}`}
                className={styles.excluir}
                onClick={() => removerTipo(tipo)}
                disabled={isSalvando}
              />
            </div>
            <CamposDoPrazo
              chave={tipo.id}
              linha={linhas[tipo.id]}
              desabilitado={isSalvando}
              onChange={(patch) => atualizarLinha(tipo.id, patch)}
              onTrocarUnidade={(unidade) => trocarUnidade(tipo.id, unidade)}
            />
          </div>
        ))}

        {rascunho ? (
          <div className={clsx(styles.linha, styles.rascunho)}>
            <Input
              id="nome-tipo-novo"
              label="Nome do tipo novo"
              placeholder="Ex: CRLV"
              value={rascunho.nome}
              onChange={(e) => setRascunho({ ...rascunho, nome: e.target.value })}
              maxLength={40}
              autoFocus
            />
            <CamposDoPrazo
              chave={rascunho.id}
              linha={linhas[rascunho.id]}
              desabilitado={false}
              onChange={(patch) => atualizarLinha(rascunho.id, patch)}
              onTrocarUnidade={(unidade) => trocarUnidade(rascunho.id, unidade)}
            />
            <div className={styles.acoesDoRascunho}>
              <Button variant="ghost" onClick={cancelarTipo}>Cancelar</Button>
              <Button variant="brand" icon={<Check size={16} />} onClick={confirmarTipo}>Confirmar tipo</Button>
            </div>
          </div>
        ) : limiteAtingido ? (
          <p className={styles.cheio}>
            <Info size={16} aria-hidden="true" />
            {MENSAGEM_DE_LIMITE}
          </p>
        ) : (
          <Button variant="brand" icon={<Plus size={16} />} onClick={comecarTipo} disabled={isSalvando} className={styles.adicionar}>
            Adicionar tipo
          </Button>
        )}
      </div>
    </FormModal>
  );
}
