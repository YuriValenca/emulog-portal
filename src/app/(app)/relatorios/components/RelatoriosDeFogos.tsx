'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/Button/Button';
import { StatusPill } from '@/components/ui/StatusPill/StatusPill';
import { Table } from '@/components/ui/Table/Table';
import type { Projeto } from '@/schemas/projeto';
import { ModalGerarRelatorio } from './ModalGerarRelatorio';
import styles from '../page.module.scss';

// O react-pdf monta o PDF inteiro na memória da aba, com até 10 fotos por fogo: acima disso a aba trava
const LIMITE_FOGOS_POR_RELATORIO = 20;

const plural = (quantidade: number, singular: string, pluralizado: string) =>
  `${quantidade} ${quantidade === 1 ? singular : pluralizado}`;

interface BarraDeSelecaoProps {
  quantidade: number;
  onLimpar: () => void;
  onGerar: () => void;
}

function BarraDeSelecao({ quantidade, onLimpar, onGerar }: BarraDeSelecaoProps) {
  return (
    <div className={styles.barraSelecao}>
      {quantidade === 0 ? (
        <span className={styles.instrucao}>Marque os fogos que vão entrar no relatório.</span>
      ) : (
        <span className={styles.selecionados}>
          {plural(quantidade, 'fogo selecionado', 'fogos selecionados')}
          {quantidade >= LIMITE_FOGOS_POR_RELATORIO && (
            <span className={styles.limite}>máximo de {LIMITE_FOGOS_POR_RELATORIO} por relatório</span>
          )}
          <button type="button" className={styles.limpar} onClick={onLimpar}>
            Limpar seleção
          </button>
        </span>
      )}
      <Button variant="brand" icon={<FileDown size={16} />} onClick={onGerar} disabled={quantidade === 0}>
        Gerar relatório
      </Button>
    </div>
  );
}

export function RelatoriosDeFogos({ fogos }: { fogos: Projeto[] }) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [modalAberto, setModalAberto] = useState(false);

  const escolhidos = fogos.filter((fogo) => selecionados.has(fogo.id));
  const marcaveis = Math.min(fogos.length, LIMITE_FOGOS_POR_RELATORIO);
  const todosMarcados = fogos.length > 0 && escolhidos.length === marcaveis;
  const limiteAtingido = escolhidos.length >= LIMITE_FOGOS_POR_RELATORIO;

  // Recomeça só dos visíveis: um fogo marcado e escondido pelo filtro não pode furar o limite
  const alternarFogo = (id: string) => {
    const proximos = new Set(escolhidos.map((fogo) => fogo.id));
    if (proximos.has(id)) proximos.delete(id);
    else if (!limiteAtingido) proximos.add(id);
    setSelecionados(proximos);
  };

  const alternarTodos = () =>
    setSelecionados(todosMarcados ? new Set() : new Set(fogos.slice(0, LIMITE_FOGOS_POR_RELATORIO).map((fogo) => fogo.id)));

  const bloqueado = (id: string) => limiteAtingido && !selecionados.has(id);

  if (fogos.length === 0) return <p className={styles.empty}>Nenhum fogo neste filtro.</p>;

  return (
    <>
      <BarraDeSelecao
        quantidade={escolhidos.length}
        onLimpar={() => setSelecionados(new Set())}
        onGerar={() => setModalAberto(true)}
      />

      <Table columns={['44px', '1fr', '120px', '1fr', '120px', '110px']}>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={todosMarcados}
                onChange={alternarTodos}
                aria-label={fogos.length > LIMITE_FOGOS_POR_RELATORIO ? `Selecionar os ${LIMITE_FOGOS_POR_RELATORIO} primeiros` : 'Selecionar todos'}
                title={fogos.length > LIMITE_FOGOS_POR_RELATORIO ? `Seleciona os ${LIMITE_FOGOS_POR_RELATORIO} primeiros` : undefined}
              />
            </th>
            <th>Fogo</th>
            <th>Data</th>
            <th>Cliente</th>
            <th>UMB</th>
            <th>Furos</th>
          </tr>
        </thead>
        <tbody>
          {fogos.map((fogo) => (
            <tr
              key={fogo.id}
              className={clsx(styles.linha, bloqueado(fogo.id) && styles.linhaBloqueada)}
              onClick={() => alternarFogo(fogo.id)}
            >
              <td>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={selecionados.has(fogo.id)}
                  disabled={bloqueado(fogo.id)}
                  onChange={() => alternarFogo(fogo.id)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Selecionar ${fogo.nomeProjeto}`}
                />
              </td>
              <td>{fogo.nomeProjeto}</td>
              <td>{fogo.dataCriacao.toDate().toLocaleDateString('pt-BR')}</td>
              <td>{fogo.cliente?.nome ?? '—'}</td>
              <td>{fogo.informacoesOperacao?.caminhao?.placa ?? '—'}</td>
              <td>
                {fogo.furos ? (
                  <StatusPill label={plural(fogo.furos.itens.length, 'furo', 'furos')} tone="data" />
                ) : (
                  <StatusPill label="Sem furos" tone="neutral" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {modalAberto && <ModalGerarRelatorio fogos={escolhidos} onFechar={() => setModalAberto(false)} />}
    </>
  );
}
