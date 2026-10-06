'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal/Modal';
import { Input } from '@/components/ui/Input/Input';
import { Select } from '@/components/ui/Select/Select';
import { Button } from '@/components/ui/Button/Button';
import { useConfigurarAlertaVencimento } from '@/hooks/vencimentos/useConfigurarAlertaVencimento';
import { DEFAULT_ALERTA_VENCIMENTO } from '@/lib/vencimento';
import type { AlertaVencimentoPorTipo, VencimentoTipo } from '@/types';
import styles from './ConfigurarAlertaModal.module.scss';

const TIPO_LABEL: Record<VencimentoTipo, string> = {
  documento_umb: 'Documento de UMB',
  certificacao_operador: 'Certificação de operador',
  calibracao_equipamento: 'Calibração de equipamento',
  manual: 'Outro',
};

const TIPOS: VencimentoTipo[] = ['documento_umb', 'certificacao_operador', 'calibracao_equipamento', 'manual'];

type Unidade = 'horas' | 'dias';

interface LinhaState {
  unidade: Unidade;
  alerta: string;
  critico: string;
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

function estadoInicial(config: AlertaVencimentoPorTipo | undefined): Record<VencimentoTipo, LinhaState> {
  const linhas = {} as Record<VencimentoTipo, LinhaState>;
  TIPOS.forEach((tipo) => {
    const atual = config?.[tipo] ?? DEFAULT_ALERTA_VENCIMENTO[tipo];
    const unidade = unidadeInicial(atual.horasAlerta);
    linhas[tipo] = {
      unidade,
      alerta: horasParaValor(atual.horasAlerta, unidade),
      critico: horasParaValor(atual.horasCritico, unidade),
    };
  });
  return linhas;
}

interface ConfigurarAlertaModalProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  alertaVencimentoAtual: AlertaVencimentoPorTipo | undefined;
}

export default function ConfigurarAlertaModal({ open, onClose, companyId, alertaVencimentoAtual }: ConfigurarAlertaModalProps) {
  const { salvarAlertaVencimento, isSalvando } = useConfigurarAlertaVencimento();
  const [linhas, setLinhas] = useState<Record<VencimentoTipo, LinhaState>>(estadoInicial(alertaVencimentoAtual));
  const [erro, setErro] = useState<string | null>(null);

  const atualizarLinha = (tipo: VencimentoTipo, patch: Partial<LinhaState>) => {
    setLinhas((prev) => ({ ...prev, [tipo]: { ...prev[tipo], ...patch } }));
  };

  const trocarUnidade = (tipo: VencimentoTipo, unidade: Unidade) => {
    setLinhas((prev) => {
      const linha = prev[tipo];
      const horasAlerta = valorParaHoras(linha.alerta, linha.unidade);
      const horasCritico = valorParaHoras(linha.critico, linha.unidade);
      return {
        ...prev,
        [tipo]: {
          unidade,
          alerta: Number.isFinite(horasAlerta) ? horasParaValor(horasAlerta, unidade) : linha.alerta,
          critico: Number.isFinite(horasCritico) ? horasParaValor(horasCritico, unidade) : linha.critico,
        },
      };
    });
  };

  const handleSalvar = async () => {
    const resultado = {} as AlertaVencimentoPorTipo;

    for (const tipo of TIPOS) {
      const linha = linhas[tipo];
      const horasAlerta = valorParaHoras(linha.alerta, linha.unidade);
      const horasCritico = valorParaHoras(linha.critico, linha.unidade);

      if (!Number.isFinite(horasAlerta) || !Number.isFinite(horasCritico)) {
        setErro(`Preencha valores válidos para "${TIPO_LABEL[tipo]}".`);
        return;
      }
      if (horasAlerta <= horasCritico) {
        setErro(`Em "${TIPO_LABEL[tipo]}", o valor de alerta deve ser maior que o de crítico.`);
        return;
      }

      resultado[tipo] = { horasAlerta: Math.round(horasAlerta), horasCritico: Math.round(horasCritico) };
    }

    setErro(null);
    try {
      await salvarAlertaVencimento({ companyId, alertaVencimento: resultado });
      onClose();
    } catch {
      setErro('Não foi possível salvar a configuração. Tente novamente.');
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title="Configurar alertas de vencimento"
      description="Defina, por tipo, com quanto tempo de antecedência cada nível de urgência começa."
      width={520}
      footer={
        <Button variant="ok" onClick={handleSalvar} loading={isSalvando} disabled={isSalvando}>
          Salvar configuração
        </Button>
      }
    >
      <div className={styles.lista}>
        {TIPOS.map((tipo) => {
          const linha = linhas[tipo];
          return (
            <div key={tipo} className={styles.linha}>
              <span className={styles.tipoLabel}>{TIPO_LABEL[tipo]}</span>
              <div className={styles.camposRow}>
                <Input
                  id={`alerta-${tipo}`}
                  label="Alerta"
                  value={linha.alerta}
                  onChange={(e) => atualizarLinha(tipo, { alerta: e.target.value })}
                  disabled={isSalvando}
                />
                <Input
                  id={`critico-${tipo}`}
                  label="Crítico"
                  value={linha.critico}
                  onChange={(e) => atualizarLinha(tipo, { critico: e.target.value })}
                  disabled={isSalvando}
                />
                <Select
                  value={linha.unidade}
                  label='Unidade'
                  onValueChange={(v) => trocarUnidade(tipo, v as Unidade)}
                  options={[
                    { value: 'horas', label: 'Horas' },
                    { value: 'dias', label: 'Dias' },
                  ]}
                  disabled={isSalvando}
                  size="sm"
                />
              </div>
            </div>
          );
        })}

        {erro && <p className={styles.formError}>{erro}</p>}
      </div>
    </Modal>
  );
}
