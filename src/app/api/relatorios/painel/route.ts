import { NextResponse } from 'next/server';
import { dadosDoRelatorioDoPainelSchema } from '@/lib/relatorios/painel';
import { gerarPdfDoPainel } from '@/lib/servidor/pdfDoPainel';
import { verificarTokenDoFirebase } from '@/lib/servidor/tokenFirebase';

export const runtime = 'nodejs';

const LIMITE_DO_CORPO = 3_000_000;

const erro = (mensagem: string, status: number) => NextResponse.json({ erro: mensagem }, { status });

function lerDados(corpo: string) {
  try {
    return dadosDoRelatorioDoPainelSchema.safeParse(JSON.parse(corpo));
  } catch {
    return null;
  }
}

// Os números já chegam calculados pelo navegador do usuário, que leu o Firestore sob as rules:
// aqui o servidor só confere quem pediu e desenha a página
export async function POST(request: Request) {
  const uid = await verificarTokenDoFirebase(request.headers.get('authorization'));
  if (!uid) return erro('Sessão inválida.', 401);

  const corpo = await request.text();
  if (corpo.length > LIMITE_DO_CORPO) return erro('Dados grandes demais.', 413);

  const dados = lerDados(corpo);
  if (!dados?.success) return erro('Dados do relatório inválidos.', 400);

  try {
    const pdf = await gerarPdfDoPainel(dados.data, new URL(request.url).origin);
    return new Response(Buffer.from(pdf), {
      headers: { 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store' },
    });
  } catch (falha) {
    console.error('[api/relatorios/painel] falha ao gerar o PDF:', falha);
    return erro('Não foi possível gerar o PDF.', 500);
  }
}
