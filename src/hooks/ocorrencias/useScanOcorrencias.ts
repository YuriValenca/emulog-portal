'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { doc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useProjetosPeriodo } from '@/hooks/useProjetosPeriodo';
import { useProdutos } from '@/hooks/cadastro/useProdutos';
import { useToast } from '@/components/ui/Toast/Toast';
import { detectarOcorrenciasDoProjeto } from '@/lib/deteccaoOcorrencia';

interface ScanState {
  isScanning: boolean;
  total: number;
  processados: number;
}

export function useScanOcorrencias(companyId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: projetos } = useProjetosPeriodo(companyId);
  const { produtos } = useProdutos(companyId);
  const [scanState, setScanState] = useState<ScanState>({ isScanning: false, total: 0, processados: 0 });
  const jaRodouRef = useRef(false);

  useEffect(() => {
    jaRodouRef.current = false;
    setScanState({ isScanning: false, total: 0, processados: 0 });
  }, [companyId]);

  useEffect(() => {
    if (!companyId || !projetos || jaRodouRef.current) return;

    const pendentes = projetos.filter((p) => !p.ocorrenciasVerificadas);
    if (pendentes.length === 0) return;

    jaRodouRef.current = true;
    const produtosById = new Map(produtos.map((p) => [p.id, p]));

    const rodarScan = async () => {
      setScanState({ isScanning: true, total: pendentes.length, processados: 0 });
      toast({ title: 'Verificando fogos pendentes', description: `${pendentes.length} fogo(s) sendo analisados` });

      for (let i = 0; i < pendentes.length; i++) {
        const projeto = pendentes[i];
        const detectadas = detectarOcorrenciasDoProjeto(projeto, produtosById);

        await Promise.all(
          detectadas.map((d) =>
            setDoc(doc(db, 'ocorrencias', `${projeto.id}_${d.tipo}`), {
              companyId,
              projetoId: projeto.id,
              tipo: d.tipo,
              origem: 'automatica',
              status: 'aberta',
              descricao: d.descricao,
              valorReferencia: d.valorReferencia,
              responsavelUid: null,
              criadoEm: Timestamp.now(),
            })
          )
        );

        await updateDoc(doc(db, 'projetos', projeto.id), { ocorrenciasVerificadas: true });
        setScanState({ isScanning: true, total: pendentes.length, processados: i + 1 });
      }

      setScanState({ isScanning: false, total: pendentes.length, processados: pendentes.length });
      queryClient.invalidateQueries({ queryKey: ['ocorrencias'] });
      queryClient.invalidateQueries({ queryKey: ['projetosPeriodo', companyId] });
      toast({ title: 'Verificação concluída', description: 'As ocorrências detectadas já estão disponíveis.' });
    };

    rodarScan();
  }, [companyId, projetos, produtos, queryClient, toast]);

  return scanState;
}
