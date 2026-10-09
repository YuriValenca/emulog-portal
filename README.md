# Emulog Portal

Portal web de gestão para operações de desmonte com emulsão bombeada. É a contraparte
administrativa do app mobile: o app registra os fogos em campo, o portal consolida,
audita e acompanha o que foi registrado.

O que o portal faz:

- **Painel operacional** — fogos, Kg aplicados, densidade média e conformidade por período, com rankings de UMB e de operador.
- **Cadastros** — usuários, equipe, UMBs, produtos e clientes de cada empresa.
- **Gestão de fogos** — lista paginada, filtros, detalhe de amostras e criação manual de fogo.
- **Ocorrências** — desvios detectados automaticamente (densidade fora da faixa do produto, diferença de Kg acima de uma regra, licença expirando) mais registros manuais.
- **Vencimentos** — documentos de UMB, certificações de operador e calibrações, com alertas configuráveis por tipo.
- **Empresas** — visão de superadmin: criar empresas, ligar módulos, definir matriz e filiais.

---

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Linguagem | TypeScript em `strict` |
| Backend | Firebase — Auth + Firestore, direto do cliente |
| Estado de servidor | TanStack Query |
| Estado de UI | Zustand (seleção de empresa, gatilho de rescan) |
| Validação | Zod, na borda de leitura do Firestore |
| Formulários | React Hook Form |
| UI | Radix primitives + CSS Modules sobre design tokens |
| Gráficos | Recharts |

Não há backend próprio: **não existe rota de API neste projeto**. Todo acesso a dado é
o SDK do Firebase falando com o Firestore a partir do navegador, e quem autoriza é
`firestore.rules`.

---

## Rodando local

```bash
npm install
npm run dev     # http://localhost:3000
```

Crie um `.env` na raiz com as credenciais do projeto Firebase:

```
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="..."
```

Essas chaves são públicas por natureza — vão no bundle e qualquer um que abra o site
as vê. Elas identificam o projeto, não autorizam nada. Quem autoriza são as rules.

| Script | |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção (roda o type check e **falha** se houver erro de tipo) |
| `npm run start` | serve o build |
| `npm run lint` | ESLint |

Antes de abrir PR: `npx tsc --noEmit` e `npx eslint src` precisam sair limpos.

---

## Estrutura

```
src/
├─ app/
│  ├─ layout.tsx            fontes, providers, metadata
│  ├─ providers.tsx         QueryClient, ToastProvider, AppAuthProvider
│  ├─ page.tsx              rota "/" — login, ou redirect pro dashboard
│  ├─ components/           LoginForm (fora do shell autenticado)
│  └─ (app)/                shell autenticado: Sidebar + Topbar
│     ├─ layout.tsx         gate de acesso + dispara o auto-scan
│     ├─ dashboard/ cadastros/ fogos/ ocorrencias/ vencimentos/ empresas/
│     └─ */components/      componentes usados só naquela rota (colocation)
├─ components/
│  ├─ ui/                   design system: Button, Input, Modal, ConfirmModal, Table, Select…
│  └─ layout/               Sidebar, Topbar, ScanProgressCard
├─ hooks/                   um hook por domínio, encapsulando queries e mutations
├─ lib/                     regra de negócio pura, sem React e sem Firebase
├─ schemas/                 schemas Zod — a fonte de verdade dos tipos
├─ helpers/                 utilitários de formatação e parsing
├─ stores/                  Zustand
└─ types/                   re-export dos tipos inferidos dos schemas
```

Três convenções que valem seguir:

1. **Componente usado por uma rota só mora dentro da rota.** Subiu para `src/components/` quando a segunda rota passou a usar.
2. **`lib/` não importa React nem Firebase.** São funções puras — é onde a regra de negócio fica testável. `hooks/` é quem fala com o Firestore.
3. **O schema Zod define o tipo, não o contrário.** Nada de escrever `interface Projeto` à mão: o tipo sai de `z.infer`.

---

## Como o dado flui

```
Firestore ──► hooks/*.ts ──► Zod parse ──► TanStack Query cache ──► componente
                                │
                                └─► lib/*.ts calcula (densidade, detecção, urgência)
```

Todo documento lido do Firestore passa por um schema antes de virar estado. Duas
exceções conscientes, comentadas no código: `useProjetosPeriodo` e o auto-scan montam
`Projeto` com `as Projeto` sem parse, porque um documento legado inválido derrubaria a
leitura inteira em vez de uma linha. Por isso o acesso a peso e densidade de amostra
passa sempre por `lib/amostras.ts`, que normaliza os três formatos que existem no banco.

### Os três formatos de amostra

O mesmo campo `densidade` chega de três jeitos, dependendo de quem gravou o fogo:

| Formato | Origem | Forma |
|---|---|---|
| `AmostraGrupo` | mobile atual | `{ amostraId, pesagens: [{ peso, densidade, timestamp }] }` |
| `LegacyPesagemFlat` | mobile antigo | uma pesagem solta por item, agrupada por `grupoId` |
| `AmostraManual` | portal | `{ amostraId, densidadeInicial, densidadeFinal }` |

`lib/amostras.ts` tem os type guards e a normalização. **Não acesse `amostra.peso` ou
`amostra.densidade` direto** — use `isAmostraGrupo` / `isAmostraManual` / `numeroOuNull`.

### Furos

Etapa opcional, gravada em `projetos.furos` (e em `projetos_rascunho.furos` enquanto o fogo
está em andamento):

```ts
furos: null | {
  profundidadePrevista: number; // m, a mesma para todos os furos
  cargaPrevista: number;        // kg, a mesma para todos os furos
  itens: { profundidadeReal: number; cargaReal: number }[]; // a ordem é o número do furo
}
```

- **Kg aplicado:** quando o fogo tem furos, `informacoesOperacao.kgAplicado` é a soma das
  `cargaReal`, arredondada em 2 casas. O app e a criação manual do portal calculam e travam o campo.
- **Rascunho:** qualquer número pode vir `null`, porque o operador ainda está digitando.
- **Formato inválido vira "sem furos":** o campo tem `.catch(null)` no schema. Inclui o array
  `[{ kg }]` dos testes antigos do app. Sem isso o `safeParse` da lista descartaria o fogo inteiro.
- **Imutável depois de concluído:** a rule de update de `projetos` não libera `furos`.
- **Destaque no detalhe:** os limiares de alerta e crítico ficam em `LIMIARES_DESVIO_FURO`,
  em `lib/furos.ts`.

---

## Autorização

Três papéis, em `users/{uid}.role`:

| Papel | No portal |
|---|---|
| `user` | não entra — vê a tela "acesso não autorizado" |
| `company_admin` | acesso completo à própria empresa (e às filiais dela, em leitura) |
| `superadmin` | acesso a todas as empresas, com seletor no topo, e à rota `/empresas` |

Além do papel, a empresa precisa ter `modules.portal` ligado.

`hooks/useAppAuth.tsx` resolve isso e expõe um `authStatus` — `loading`,
`unauthenticated`, `forbidden`, `module-disabled`, `config-error` ou `authenticated`.
O `(app)/layout.tsx` renderiza a tela correspondente.

**Esse gate é UX, não segurança.** Ele decide o que a interface mostra. Quem de fato
nega leitura e escrita é o `firestore.rules`, que está versionado na raiz do projeto.
Qualquer mudança de permissão precisa acontecer nos dois lugares — e a rule é a que
conta.

```bash
firebase deploy --only firestore:rules
```

As rules seguem um padrão consistente: `companyId` do documento tem que bater com o
`companyId` do usuário, `superadmin` passa por cima, e todo update restringe as chaves
alteráveis com `affectedKeys().hasOnly([...])`.

> Isso significa que **acrescentar um campo novo a um documento já existente é negado**
> se a chave não estiver na lista do `hasOnly`. Ao adicionar um campo a uma coleção que
> já tem dado em produção, atualize a rule junto ou grave o campo só na criação.

### Coleções

| Coleção | O que guarda |
|---|---|
| `companies` | empresa, módulos, matriz/filial, config de alerta de vencimento |
| `companies/{id}/licenses` | licenças do app mobile |
| `users` | papel e vínculo com a empresa |
| `caminhoes` · `operadores` · `produtos` · `clientes` | cadastros por empresa |
| `projetos` | o fogo completo, com amostras e furos |
| `projetos/{id}/midias` | fotos da operação, em base64 no próprio documento (< 1 MB) enquanto não há Storage; até 10 por fogo, lidas só ao abrir o detalhe |
| `projetos_meta` | espelho leve do fogo (nome, data, empresa) para listar e paginar sem puxar as amostras |
| `regras_deteccao` | regras de diferença de Kg que geram ocorrência |
| `ocorrencias` | desvios, automáticos e manuais |
| `vencimentos` | documentos, certificações e calibrações com data limite |
| `calibragens` | calibragens registradas pelo mobile |

`projetos_meta` existe porque um fogo com muitas amostras é pesado: a lista carrega só
o meta e busca o documento completo apenas da página visível.

O Firestore não apaga subcoleção junto com o documento pai, então a exclusão de fogo
(`deletarProjeto`) apaga no mesmo batch `projetos`, `projetos_meta`, as `ocorrencias` e as
fotos em `projetos/{id}/midias`.

---

## O auto-scan de ocorrências

`hooks/ocorrencias/useOcorrenciasAutoScan.ts` roda a cada montagem do `(app)/layout.tsx`.
Ele varre os fogos ainda não verificados, aplica as detecções, grava as ocorrências,
marca o fogo com `ocorrenciasVerificadas: true` e apaga ocorrências encerradas há mais
de `RETENCAO_OCORRENCIA_ENCERRADA_DIAS`.

**Isso é trabalho de backend rodando no navegador, e é uma decisão consciente:** Cloud
Functions exigem o plano Blaze, e o projeto ainda não está nele. Enquanto isso, o custo
fica no cliente do gestor. O que o código faz para conter o estrago:

- cancela no cleanup do efeito, para não escrever estado depois do unmount nem continuar varrendo quando o usuário troca de empresa;
- exclusões em `writeBatch`, com fallback item a item — o batch é atômico, e basta uma rule negar uma exclusão (ocorrência de filial que o admin da matriz não pode apagar) para o lote inteiro falhar;
- `ocorrenciasVerificadas` garante que cada fogo é processado uma vez só; criar uma regra nova reseta a flag e força o rescan.

Quando migrar para o Blaze, isso vira uma function agendada e o hook some.

### Id determinístico da ocorrência

Ocorrência automática usa id previsível, para que rodar o scan de novo atualize em vez
de duplicar:

- detecção de densidade: `{projetoId}_{tipo}`
- detecção vinda de regra: `{projetoId}_{tipo}_{regraId}`

O `regraId` entra no id e no documento porque duas regras podem apontar o mesmo fogo, e
porque apagar uma automação precisa apagar só as ocorrências dela.

---

## Estilo

Tema escuro único, definido em `src/app/tokens.scss` como CSS custom properties: cores,
espaçamentos, raios, tipografia. Componentes usam CSS Modules e leem os tokens —
`var(--surface)`, `var(--spacing-default)`, `var(--crit)`. Não escreva hex dentro de um
`.module.scss`; se falta um token, adicione em `tokens.scss`.

Semântica de cor: `--ok` conforme, `--warn` atenção, `--crit` crítico, `--accent` ação
primária, `--data` neutro de dado. Usar `--accent` para significar "atenção" mistura as
duas linguagens.

---

## Limitações conhecidas

- **Sem testes automatizados.** As funções de `lib/` são puras e seriam o primeiro alvo óbvio (`avaliarRegra`, `densidade`, `licenca`, `vencimento`).
- **Criar e excluir usuário acontece no cliente.** A criação usa uma instância secundária do Firebase Auth para não deslogar o admin. Excluir apaga o documento do Firestore, mas **a conta no Firebase Auth continua existindo** — remover de verdade precisa do Admin SDK, ou seja, do Blaze.
- **Conta órfã se o doc for negado.** A conta é criada no Auth antes do `setDoc` em `users`. Se as rules negarem o doc (company_admin só cria `user` ou `company_admin` da própria empresa), a conta de login fica no Auth sem doc.
- **Módulo de relatórios não existe ainda.** As pastas `relatorios/` estão vazias e o link na Sidebar está desabilitado.
