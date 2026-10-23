import type { Caminhao } from '@/schemas/caminhao';

export function rotuloCaminhao(caminhao: Pick<Caminhao, 'placa' | 'tag'>): string {
  return caminhao.tag?.trim() || caminhao.placa;
}
