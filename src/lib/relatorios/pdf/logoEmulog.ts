export interface LogoVetorial {
  viewBox: string;
  caminhos: { d: string; fill: string }[];
}

// O <Image> do react-pdf não aceita SVG: o logo é redesenhado com <Svg>/<Path> a partir do mesmo arquivo do site
export async function carregarLogoEmulog(): Promise<LogoVetorial | null> {
  try {
    const texto = await (await fetch('/assets/emulogLogo.svg')).text();
    const svg = new DOMParser().parseFromString(texto, 'image/svg+xml').documentElement;
    const caminhos = Array.from(svg.querySelectorAll('path')).map((path) => ({
      d: path.getAttribute('d') ?? '',
      fill: path.getAttribute('fill') ?? '#000000',
    }));
    return { viewBox: svg.getAttribute('viewBox') ?? '0 0 590 591', caminhos };
  } catch (erro) {
    console.error('[relatorios] não foi possível carregar o logo do Emulog:', erro);
    return null;
  }
}
