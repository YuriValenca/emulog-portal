'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebase/client';
import { useToast } from '@/components/ui/Toast/Toast';
import { baixarArquivo } from '@/helpers/arquivo';
import { nomeDoArquivoDoPainel, type DadosDoRelatorioDoPainel } from '@/lib/relatorios/painel';

async function pedirPdfDoPainel(dados: DadosDoRelatorioDoPainel): Promise<Blob> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Usuário sem sessão');

  const resposta = await fetch('/api/relatorios/painel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(dados),
  });
  if (!resposta.ok) throw new Error(`Falha ao gerar o PDF do painel (${resposta.status})`);
  return resposta.blob();
}

export function useExportarPainel() {
  const { toast } = useToast();
  const [exportando, setExportando] = useState(false);

  const exportar = async (dados: DadosDoRelatorioDoPainel): Promise<boolean> => {
    setExportando(true);
    try {
      baixarArquivo(await pedirPdfDoPainel(dados), nomeDoArquivoDoPainel(new Date()));
      return true;
    } catch (erro) {
      console.error('[relatorios] falha ao exportar o painel:', erro);
      toast({ title: 'Não foi possível gerar o PDF', description: 'Tente novamente em instantes.' });
      return false;
    } finally {
      setExportando(false);
    }
  };

  return { exportar, exportando };
}
