import { StyleSheet } from '@react-pdf/renderer';

const CINZA_BORDA = '#cccccc';
const CINZA_TABELA = '#dddddd';
const CINZA_FUNDO = '#f2f2f2';
const CINZA_TEXTO = '#555555';

export function criarEstilos(cor: string) {
  return StyleSheet.create({
    pagina: { paddingTop: 37, paddingHorizontal: 37, paddingBottom: 60, fontFamily: 'Helvetica', fontSize: 9, color: '#000000' },

    cabecalho: { flexDirection: 'row', alignItems: 'flex-start', borderBottomWidth: 3, borderBottomColor: cor, paddingBottom: 12, marginBottom: 14 },
    logo: { height: 36, maxWidth: 135, objectFit: 'contain', marginRight: 15 },
    cabecalhoTextos: { flex: 1 },
    titulo: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#222222', marginBottom: 4 },
    linhaCabecalho: { color: CINZA_TEXTO, marginTop: 2 },
    rotulo: { fontFamily: 'Helvetica-Bold' },
    ok: { color: '#4CAF50' },
    alerta: { color: '#D32F2F' },

    caixa: { borderWidth: 1, borderColor: CINZA_BORDA, padding: 8, marginTop: 14 },
    caixaCabecalhoCor: { backgroundColor: cor, color: '#ffffff', paddingVertical: 4, paddingHorizontal: 8, fontFamily: 'Helvetica-Bold' },
    caixaCabecalhoCinza: { backgroundColor: CINZA_FUNDO, padding: 4, fontFamily: 'Helvetica-Bold' },
    caixaTexto: { marginTop: 6 },

    tabela: { marginTop: 8 },
    linhaTabela: { flexDirection: 'row' },
    celula: { flex: 1, borderWidth: 0.5, borderColor: CINZA_TABELA, padding: 6 },
    celulaRotulo: { flex: 1, borderWidth: 0.5, borderColor: CINZA_TABELA, padding: 6, fontFamily: 'Helvetica-Bold' },
    celulaCentro: { flex: 1, borderWidth: 0.5, borderColor: CINZA_TABELA, paddingVertical: 3, paddingHorizontal: 4, textAlign: 'center' },
    celulaCabecalho: {
      flex: 1, borderWidth: 0.5, borderColor: CINZA_TABELA, paddingVertical: 3, paddingHorizontal: 4,
      textAlign: 'center', backgroundColor: cor, color: '#ffffff', fontFamily: 'Helvetica-Bold',
    },

    observacaoTecnica: { borderWidth: 2, borderColor: cor, borderRadius: 4, padding: 8, marginTop: 14 },
    observacaoTecnicaTitulo: { color: cor, fontFamily: 'Helvetica-Bold', fontSize: 10, marginBottom: 4 },

    tituloSecao: {
      fontSize: 11, fontFamily: 'Helvetica-Bold', color: cor, marginTop: 14, marginBottom: 6,
      borderLeftWidth: 3, borderLeftColor: cor, paddingLeft: 6,
    },

    amostras: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    amostra: { width: '48%', borderWidth: 1, borderColor: CINZA_BORDA, padding: 8, marginBottom: 12 },
    amostraTitulo: { backgroundColor: CINZA_FUNDO, padding: 4, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
    pesagem: { marginBottom: 3 },

    fotos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    foto: { width: '48%', marginBottom: 10 },
    fotoImagem: { width: '100%', maxHeight: 240, objectFit: 'contain', borderWidth: 1, borderColor: CINZA_TABELA },
    fotoLegenda: { marginTop: 3, textAlign: 'center', color: CINZA_TEXTO },

    rodape: {
      position: 'absolute', bottom: 22, left: 37, right: 37, borderTopWidth: 2, borderTopColor: cor, paddingTop: 4,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', fontSize: 7, color: '#888888',
    },
    rodapeMarca: { flexDirection: 'row', alignItems: 'center', fontFamily: 'Helvetica-Bold', color: CINZA_TEXTO },
    rodapeLogo: { width: 9, height: 9, marginRight: 3 },
  });
}

export type EstilosDoRelatorio = ReturnType<typeof criarEstilos>;
