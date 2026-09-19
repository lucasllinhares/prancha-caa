/**
 * Redimensiona uma imagem escolhida pelo usuário (foto da câmera ou da galeria)
 * usando canvas, no próprio navegador. Nenhuma imagem sai do dispositivo.
 *
 * O lado maior fica com no máximo `ladoMaximo` pixels (300 por padrão), o que
 * mantém o IndexedDB leve mesmo com centenas de símbolos personalizados.
 */
export async function redimensionarImagem(
  arquivo: File,
  ladoMaximo = 300,
  manterTransparencia = false
): Promise<string> {
  const dataUrlOriginal = await lerComoDataUrl(arquivo);
  const img = await carregarImagem(dataUrlOriginal);

  const escala = Math.min(1, ladoMaximo / Math.max(img.width, img.height));
  const largura = Math.max(1, Math.round(img.width * escala));
  const altura = Math.max(1, Math.round(img.height * escala));

  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível processar a imagem neste navegador.');

  // Fundo branco: evita que PNG com transparência fique escuro ao virar JPEG.
  // Cartões de imagem (com cantos arredondados) mantêm a transparência.
  if (!manterTransparencia) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, largura, altura);
  }
  ctx.drawImage(img, 0, 0, largura, altura);

  if (manterTransparencia) return canvas.toDataURL('image/webp', 0.88);

  // JPEG com qualidade 0,82 dá um arquivo pequeno e imagem ainda nítida.
  return canvas.toDataURL('image/jpeg', 0.82);
}

function lerComoDataUrl(arquivo: File): Promise<string> {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => resolver(String(leitor.result));
    leitor.onerror = () => rejeitar(new Error('Falha ao ler o arquivo de imagem.'));
    leitor.readAsDataURL(arquivo);
  });
}

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolver, rejeitar) => {
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = () => rejeitar(new Error('Arquivo de imagem inválido.'));
    img.src = src;
  });
}

/** Lê um arquivo de texto (usado na importação de pranchas .json). */
export function lerComoTexto(arquivo: File): Promise<string> {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => resolver(String(leitor.result));
    leitor.onerror = () => rejeitar(new Error('Falha ao ler o arquivo.'));
    leitor.readAsText(arquivo);
  });
}
