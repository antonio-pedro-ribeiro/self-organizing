# Campo Auto-Organizado: Manual do Utilizador

*Also available in English: [User Manual](USER_MANUAL.md).*

Este manual explica para que serve o simulador, como usar cada definição e como ler o que vê no ecrã. Não precisa de conhecimentos de programação nem de biologia.

> A interface do simulador está em inglês. Neste manual, os nomes dos controlos e botões aparecem **a negrito e em inglês**, exatamente como surgem no ecrã.

---

## 1. Para que serve este simulador

Os seres vivos, as chamas, os furacões e as cidades têm algo em comum: **a ordem aparece e mantém-se sem que ninguém mande**. Ninguém desenha as manchas de um leopardo nem diz a um bando de estorninhos para onde virar. A ordem nasce de muitas interações simples e locais, e só se mantém enquanto houver energia a fluir pelo sistema.

Este simulador deixa-o ver isso a acontecer e fazer experiências. Segue as ideias do físico e pensador sistémico Fritjof Capra:

- **Estruturas dissipativas:** padrões que só existem enquanto a energia flui através deles.
- **Autopoiese:** "autocriação". Um ser vivo reconstrói-se continuamente a partir do que absorve.
- **Cognição como perceber e responder:** até a vida mais simples sente o que a rodeia e reage.

Tudo o que aparece no ecrã vem de duas camadas:

1. **Um campo químico:** uma superfície com dois químicos virtuais que reagem e se espalham. Nas condições certas, formam sozinhos manchas, riscas e ondas.
2. **Protocélulas:** milhares de pequenas "células" simples que vivem no campo. Alimentam-se dele, mantêm a pele reparada, deslocam-se em direção ao alimento, dividem-se e morrem.

Nenhuma regra do programa diz "forma uma colónia", "cria uma frente" ou "repara os danos". Quando vir essas coisas, estão a emergir por si mesmas.

> Este é um modelo ilustrativo, feito para tornar ideias visíveis. Não é um modelo validado de biologia ou química reais.

---

## 2. A grande ideia numa imagem: um lago alimentado por um ribeiro

Imagine um **lago pouco fundo alimentado por um ribeiro**.

- O **ribeiro** traz **alimento** fresco para o lago a toda a hora.
- Onde o alimento abunda, aparecem **florescências de algas** que se espalham. Deixadas em paz, organizam-se em manchas regulares ou em faixas sinuosas.
- No lago vivem pequenas **criaturas**. Cada uma come, usa parte desse alimento para **remendar a própria pele**, nada em direção a águas mais ricas, divide-se em duas quando está bem alimentada e **desfaz-se** quando a pele falha. Ao desfazer-se, os seus restos alimentam uma nova florescência.
- **Feche o ribeiro com uma represa** e as florescências desvanecem, as criaturas morrem de fome e o lago fica parado. A ordem nunca esteve "dentro" do lago. Vivia no fluxo de alimento que o atravessava.

Tudo no simulador corresponde a esta imagem:

| No lago | No simulador | A ideia que mostra |
| --- | --- | --- |
| A entrada de alimento pelo ribeiro | **F (feed)**: a rapidez com que entra nutriente | O fluxo de energia mantém a ordem viva (*estrutura dissipativa*) |
| O alimento dissolvido na água | **u**, o nutriente | O recurso de que tudo depende |
| As florescências de algas | **v**, o segundo químico, mostrado a cores | Padrões que se formam sozinhos |
| A rapidez com que as florescências morrem | **k (kill)** | Dissipação: a rapidez com que a ordem decai |
| Mudar o caudal do ribeiro | Mexer em **F** ou fazer um **varrimento de F** | Pequenas mudanças podem virar todo o padrão (*bifurcação*) |
| Onde, por acaso, começaram as primeiras florescências | **seed** (semente) | O acaso decide os pormenores, não o estilo geral (*ordem através de flutuações*) |
| Uma criatura | Uma **protocélula** (um pequeno anel) | Uma unidade que se mantém a si própria |
| Uma criatura a remendar a própria pele | Reparação da membrana com os seus próprios componentes | *Autopoiese* |
| Nadar em direção a águas mais ricas | Orientar-se pelo gradiente de nutriente | *Cognição* como perceber e responder |
| Duas criaturas a reagir de forma diferente à mesma chuva | O mesmo impulso de nutriente, respostas diferentes conforme o genoma | *Acoplamento estrutural* |
| Grupos de criaturas que ninguém organizou | Colónias e frentes | *Emergência* |
| O lago a repovoar-se depois de uma tempestade | Recrescimento depois de apagar uma zona | *Resiliência* |

Guarde esta imagem; o resto do manual volta a ela.

---

## 3. Início rápido

1. Abra o simulador numa versão atual do Chrome, Edge ou Firefox. Se alguém o preparou para si, abra a ligação que lhe deram; para o executar no seu computador, veja o README (`npm install`, depois `npm run dev`, depois abra `http://localhost:5173`).
2. Começa logo a correr com a predefinição **Mitosis** e 200 protocélulas.
3. Observe o primeiro minuto:
   - **0–5 s:** pequenos quadrados brilhantes, as primeiras "florescências", arredondam-se e crescem até se tornarem manchas luminosas. Anéis coloridos, as protocélulas, estão espalhados pelo campo e começam a deambular.
   - **5–20 s:** as manchas crescem e dividem-se. As protocélulas multiplicam-se, e os seus rastos mostram-nas a afastar-se das manchas em direção a águas mais ricas.
   - **20–60 s:** as protocélulas espalham-se em colónias. Onde se aglomeram, comem tanto nutriente que as manchas desvanecem. Os gráficos à esquerda acompanham tudo isto.
4. Carregue em `H` para esconder todos os painéis e apenas observar. Carregue em `H` outra vez para os trazer de volta.

---

## 4. O ecrã num relance

```
┌──────────────┬──────────────────────────────────┬──────────────────┐
│ GRÁFICOS     │                                  │ PAINEL DE        │
│ Population   │                                  │ CONTROLO         │
│ Mean energy  │           O CAMPO                │ Chemistry        │
│ Order param. │   (o lago, visto de cima)        │ Run              │
│ Dissipation  │                                  │ Protocells       │
│ Lineages     │                                  │ Perturb & record │
│ Bifurcation* │                                  │ Analysis/capture │
│              │                                  │ Look             │
├──────────────┴──────────────────────────────────┴──────────────────┤
│ Linha de estado: 60 fps · 2547 protocells · F 0.0367 · k 0.0649 ...  │
└──────────────────────────────────────────────────────────────────────┘
  * O painel de bifurcação só aparece durante ou depois de um varrimento de F.
```

O campo é um quadrado que **dá a volta** nas margens, como o mapa de um videojogo: uma protocélula que sai pela direita volta a entrar pela esquerda.

---

## 5. Ler o que se vê

### 5.1 O campo (a água do lago)

- **A cor mostra v, o químico das "florescências".** Com o mapa de cores predefinido, **magma**, quase preto significa sem florescência; roxo, depois laranja, depois amarelo-claro significam cada vez mais.
- **O brilho também acompanha u, o nutriente.** A água rica em nutriente parece ligeiramente mais clara; a água esgotada parece mais escura e azulada.
- **Halo luminoso:** com o efeito **bloom** ligado, as zonas mais brilhantes ganham um halo suave. É apenas visual.

Padrões típicos:

| O que vê | O que significa |
| --- | --- |
| Campo uniforme e escuro | Nenhum padrão: ou ainda nada começou, ou a ordem desapareceu |
| Manchas redondas e luminosas que se dividem | Manchas auto-replicantes, ao estilo **Mitosis** |
| Faixas sinuosas a encher o campo | Labirinto ao estilo **Coral** |
| Faixas a espalhar-se a partir de alguns pontos | **Worms** (vermes) |
| Anéis, ondas e formas em agitação | **Chaos**: padrões que nunca assentam |

### 5.2 Protocélulas (as criaturas)

Cada protocélula é um pequeno disco:

```
     ○      anel   = saúde da membrana (pele): anel sólido = saudável, anel ténue = a falhar
    (●)     núcleo = energia: núcleo brilhante = bem alimentada, núcleo baço = com fome
```

- **A cor** vem dos três genes da célula (ganho sensorial, mobilidade e eficiência de construção). As filhas herdam os genes da mãe com pequenas alterações aleatórias, por isso **células aparentadas partilham a cor**, e uma lenta deriva de cor numa colónia é a evolução a acontecer.
- **Os rastos** (riscos finos que se desvanecem) mostram por onde as células passaram. Trajetos que curvam em direção a água mais rica, mais escura em v, mostram células a *perceber e responder*.
- Quando uma célula morre, liberta um sopro do químico das florescências, por isso pode ver surgir um pequeno brilho onde ela estava.

### 5.3 Camadas sobrepostas

| Camada | Como ligar | O que mostra |
| --- | --- | --- |
| **Rastos** | Look ▸ trails (ligado por predefinição) | Os trajetos recentes das protocélulas |
| **Rede de sinais** | Tecla `4`, ou Look ▸ view ▸ "Both + network (4)" | Linhas azul-claras entre células suficientemente próximas para se influenciarem; pares mais próximos têm linhas mais grossas e brilhantes |
| **Fluxo** | Look ▸ flow overlay | Partículas ténues à deriva que seguem o nutriente quando este se move da água rica para onde está a ser comido, como ver a corrente no lago |
| **Ondulações do pincel** | Usar o pincel (drag brush) | Anéis que marcam onde tocou no campo |

A rede e o fluxo custam fotogramas por segundo, por isso começam desligados.

### 5.4 A linha de estado

`60 fps · 2547 protocells · F 0.0367 · k 0.0649 · 8 steps/tick · 1–4 view · H hides UI`

- **fps:** fotogramas por segundo. 60 é fluido.
- **protocells:** quantas criaturas estão vivas neste momento.
- **F e k:** os valores que a simulação está realmente a usar. Deslizam para um novo valor em cerca de meio segundo, por isso podem atrasar-se brevemente em relação ao controlo.
- **steps/tick, ou paused:** quanta química corre por passo de simulação (*tick*), ou se a simulação está em pausa.

### 5.5 Os gráficos

Todos os gráficos deslizam e mostram aproximadamente os últimos 100 segundos.

| Gráfico | O que mede | Na imagem do lago | Como ler |
| --- | --- | --- | --- |
| **Population** | Número de protocélulas vivas | Quantas criaturas | Sobe enquanto o alimento abunda, estabiliza quando escasseia, desce depois de danos ou de fome |
| **Mean energy** | Energia média armazenada por célula | Quão bem alimentadas estão, em média | Desce quando a sobrelotação torna o alimento escasso |
| **Order parameter (std v)** | Quão desigual é o químico das florescências no campo | Quanto padrão existe | Perto de 0 = plano, sem padrão; mais alto = manchas ou faixas fortes. **O indicador principal de ordem.** |
| **Dissipation proxy (mean u·v²)** | A rapidez global da reação | O "esforço" do lago para manter as florescências | Sobe com padrões ativos e cai para 0 quando morrem. Representa a energia que a estrutura consome. |

Com protocélulas ligadas, é comum ver o parâmetro de ordem **subir durante 10 a 20 segundos e depois descer**. As manchas formam-se, e depois a população em crescimento come o nutriente e as manchas desvanecem.

### 5.6 Vista de linhagens

**Lineage shares (top 8)** é um gráfico empilhado. Cada faixa é uma linhagem (todos os descendentes de uma célula inicial), colorida como os seus membros no campo. A altura da faixa é a quota dessa família na população; o cinzento é o resto.

- Faixas a **alargar** com o tempo: uma família está a dominar.
- **Muitas faixas finas:** uma população diversa.
- Uma única faixa a ocupar tudo: os descendentes de um antepassado venceram.

### 5.7 Painel de bifurcação

Aparece quando faz um **varrimento de F** (secção 6.5). Mostra o **parâmetro de ordem em função de F**:

- A linha **laranja** é o varrimento a **subir** (F a aumentar).
- A linha **azul** é o varrimento a **descer**.
- A **linha vertical tracejada** é o F atual.

Como ler:

- Um **degrau** súbito numa linha é uma *bifurcação*: uma mudança mínima na alimentação fez o lago passar de "sem padrão" a "com padrão", ou vice-versa.
- Se as duas linhas **não coincidem**, isso é *histerese*: o lago lembra-se do passado. A descer, os padrões sobrevivem com caudais em que, a subir, ainda não se tinham formado. Uma vez com padrão, o lago agarra-se a ele.
- A linha de texto por baixo resume o resultado, por exemplo: *"Done: 2 jumps over 3×; jump up at F 0.0363, down at F 0.0212; max gap 0.0938 at F 0.0350"* (2 saltos de mais de 3×; salto a subir em F 0,0363, a descer em F 0,0212; maior diferença 0,0938 em F 0,0350).

---

## 6. Usar os controlos

O painel de controlo está à direita. Clique no título de uma pasta para a recolher ou expandir. As alterações têm efeito imediato, salvo indicação em contrário.

### 6.1 Chemistry (química): o ribeiro e as florescências

| Definição | Intervalo (predefinição) | O que faz |
| --- | --- | --- |
| **preset** | Mitosis, Coral, Worms, Chaos (Mitosis) | Coloca F e k num estilo de padrão conhecido. Escolha um e carregue em **Reset with seed** para recomeçar do zero. |
| **F (feed)** | 0 – 0,08 (0,0367) | A rapidez com que entra nutriente. **O controlo principal.** Demasiado baixo e as florescências morrem à fome; mudá-lo pode virar o tipo de padrão. |
| **k (kill)** | 0,04 – 0,07 (0,0649) | A rapidez com que o químico das florescências decai. Pequenas mudanças aqui alteram muito o estilo do padrão. |
| **cut flux** | ligado/desligado (desligado) | Fecha o ribeiro: põe F a 0. Os padrões desvanecem em cerca de um segundo. Desligue-o depressa para os ver recuperar; se esperar demasiado, o lago fica vazio até algo o voltar a semear (experimente o pincel de ruído). |

As predefinições, tal como aparecem neste simulador (só o campo):

| Predefinição | F, k | Aspeto |
| --- | --- | --- |
| **Mitosis** | 0,0367; 0,0649 | Manchas redondas que crescem e se dividem |
| **Coral** | 0,0545; 0,062 | Um labirinto denso de faixas |
| **Worms** | 0,078; 0,061 | Faixas em forma de verme a espalhar-se |
| **Chaos** | 0,026; 0,051 | Ondas e anéis inquietos |

### 6.2 Run (execução): tempo e acaso

| Definição | Intervalo (predefinição) | O que faz |
| --- | --- | --- |
| **paused** | ligado/desligado (desligado) | Congela a simulação; a imagem mantém-se. A tecla `Espaço` faz o mesmo. |
| **Step one tick** | botão | Em pausa, avança exatamente um passo. Útil para seguir células individuais. |
| **field steps/tick** | 1 – 16 (8) | Quanta química corre por passo. Mais alto faz os padrões evoluírem mais depressa face às protocélulas, mas torna tudo mais lento. |
| **speed** | 0,25× – 4× (1×) | Passos por fotograma. 0,25× é câmara lenta; 4× é avanço rápido. Acima de 1×, os fotogramas por segundo podem descer em computadores mais lentos. |
| **seed** | 0 – 99999 (1) | Os "dados" para as florescências e protocélulas iniciais. A mesma semente com as mesmas definições dá o mesmo início. |
| **Reset with seed** | botão | Recomeça com a semente, a predefinição e as definições de protocélulas atuais. Limpa os gráficos. |

### 6.3 Protocells (protocélulas): as criaturas

| Definição | Intervalo (predefinição) | O que faz |
| --- | --- | --- |
| **membrane decay** | 0 – 0,05 (0,01) | A rapidez com que a pele de cada célula se gasta por passo. Mais alto significa um mundo mais duro: as células têm de trabalhar mais para se manterem vivas. As membranas também se gastam mais depressa à medida que as células envelhecem. |
| **mutation sigma** | 0 – 0,1 (0,02) | Quanto os genes de uma filha diferem dos da mãe. 0 significa cópias perfeitas; mais alto significa mais variedade e uma deriva de cor mais rápida. |
| **sensing noise** | 0 – 1 (0,3) | Quão aleatoriamente as células se orientam. 0 significa que vão direitas ao alimento; 1 significa que deambulam quase ao acaso. |
| **cut production** | ligado/desligado (desligado) | **Experiência de supressão:** nenhuma célula consegue produzir material novo para a pele. Veja o anel de cada célula a desvanecer e toda a população a morrer em cerca de 2 segundos. |
| **initial (on reset)** | 0 – 2000 (200) | Com quantas células começar no próximo **Reset with seed**. Ponha **0** para estudar o campo sozinho. |

Os três genes de cada célula:

- **Ganho sensorial (sensing gain):** a força com que se orienta para o alimento e quanto consegue absorver (com um custo de energia).
- **Mobilidade (motility):** a rapidez com que nada. Mover-se gasta energia.
- **Eficiência de construção (build efficiency):** quanta energia gasta a produzir material para a pele. Pouco demais e a pele falha; demais e desperdiça energia.

### 6.4 Perturb and record (perturbar e registar): mexer no lago

| Definição | O que faz |
| --- | --- |
| **drag brush** | Escolhe o que faz clicar e arrastar no campo: **Off** (desligado); **Add noise** (salpica o químico das florescências, o que pode semear novos padrões); **Add nutrient** (enriquece a água); **Damage** (apaga o campo e as células debaixo do pincel). Uma ondulação marca cada toque. |
| **brush radius** | O tamanho do pincel em células do campo (4 – 200, predefinição 24). O campo tem 512 células de largura. |
| **Wipe 25% of the area** | Apaga um disco que cobre um quarto do campo, ao centro: a experiência padrão de resiliência. |
| **Download metrics CSV** | Guarda todas as medições registadas (até às últimas 20 000 amostras) num ficheiro de folha de cálculo. |

### 6.5 Analysis and capture (análise e captura)

| Botão | O que faz |
| --- | --- |
| **Run / stop F sweep (k fixed)** | Faz F variar automaticamente de 0,02 até 0,07 e de volta, mantendo cada valor cerca de 5 segundos a velocidade 1×, e desenha o painel de bifurcação. Em cada degrau salpica algumas pequenas sementes de florescência, para que se *possa* formar um padrão se as condições o permitirem. Demora alguns minutos a 1×; ponha **speed** a 4× para ir mais depressa. Carregue outra vez para parar. Para um resultado mais claro, ponha **initial** a 0 e carregue em **Reset with seed** antes. |
| **Snapshot PNG** | Guarda uma imagem do ecrã atual. |
| **Record 10 s WebM** | Grava os 10 segundos seguintes num ficheiro de vídeo. |
| **Export state JSON** | Guarda todas as definições e a semente, para que o próprio ou outra pessoa possa reproduzir a execução. |
| **Import state JSON** | Carrega um ficheiro de definições guardado e recomeça com a sua semente. Ficheiros inválidos são recusados com a lista do que está errado, e nada muda. |

### 6.6 Look (aspeto)

| Definição | Predefinição | O que faz |
| --- | --- | --- |
| **view** | Both (3) | Só o campo (1), só as células (2), ambos (3), ou ambos mais a rede (4). As teclas `1`–`4` fazem o mesmo. |
| **trails** | ligado | Rastos que se desvanecem atrás das células |
| **bloom** | ligado | Halo luminoso à volta das zonas brilhantes |
| **bloom strength** | 0,8 | Intensidade do halo (0 – 2) |
| **flow overlay** | desligado | Partículas que mostram o fluxo de nutriente |
| **lineage view** | ligado | O gráfico de quotas por família, na coluna de gráficos |
| **colormap** | Magma | Magma (preto→roxo→laranja→amarelo) ou Viridis (roxo→verde-azulado→amarelo) |
| **v scale** | 0,35 | Quanto químico de florescência conta como "cor plena". Baixe-o se o campo parecer apagado; suba-o se tudo parecer desbotado. |

---

## 7. Teclado e rato

| Ação | Efeito |
| --- | --- |
| `H` | Esconder ou mostrar todos os painéis |
| `Espaço` | Pausa ou retomar |
| `1` / `2` / `3` / `4` | Só o campo / só as células / ambos / ambos mais a rede |
| Clicar e arrastar no campo | Aplicar o pincel atual (**drag brush**, quando não está em Off) |

---

## 8. Experiências guiadas

Cada experiência mostra uma ideia da imagem do lago. Comece cada uma com **Reset with seed**, salvo indicação em contrário.

### 8.1 A ordem precisa de fluxo (estrutura dissipativa)
1. Ponha **initial** a 0, carregue em **Reset with seed** e espere até as manchas encherem o campo e o gráfico **Order parameter** estabilizar.
2. Ligue **cut flux**.
3. **O que observar:** as manchas desvanecem em cerca de um segundo, e os gráficos do parâmetro de ordem e da dissipação caem para quase zero. O padrão nunca esteve guardado em lado nenhum; só existia enquanto o alimento fluía.
4. Desligue **cut flux**. Nada volta sozinho. Use o pincel **Add noise** para voltar a semear.

### 8.2 Pontos de viragem e memória (bifurcação, histerese)
1. Ponha **initial** a 0, carregue em **Reset with seed** e ponha **speed** a 4×.
2. Carregue em **Run / stop F sweep**.
3. **O que observar:** um degrau na linha laranja (a subir) onde os padrões aparecem de repente, e uma linha azul (a descer) que se mantém alta até valores de F mais baixos antes de cair. A diferença entre elas é a memória do lago.

### 8.3 As mesmas regras, pormenores diferentes (ordem através de flutuações)
1. Ponha **initial** a 0. Recomece com a semente 1 e tire uma fotografia (**Snapshot PNG**) quando as manchas encherem o campo.
2. Mude **seed** para 2 e recomece.
3. **O que observar:** uma disposição de manchas completamente diferente, com o **mesmo espaçamento**. O acaso decidiu onde ficam; as regras decidem o seu tamanho.

### 8.4 A vida reconstrói-se a si própria (autopoiese)
1. Comece com as 200 células predefinidas e deixe-as espalhar-se durante 10 segundos.
2. Ligue **cut production**.
3. **O que observar:** os anéis de todas as células a desvanecer, e depois o gráfico da população a cair para zero em cerca de 2 segundos. Uma célula que não se consegue reconstruir não consegue existir.

### 8.5 O mesmo empurrão, respostas diferentes (acoplamento estrutural)
1. Deixe desenvolver-se uma população de várias cores durante 20 a 30 segundos.
2. Escolha **Add nutrient** no pincel e pinte por cima de um grupo de células.
3. **O que observar:** células de cores diferentes (genes diferentes) reagem de maneira diferente. Algumas ficam mais brilhantes e dividem-se depressa; outras quase não mudam. O ambiente desencadeia a resposta, mas é a constituição de cada célula que decide qual é.

### 8.6 Ninguém manda (emergência)
1. Deixe correr a predefinição durante um minuto. Carregue em `4` para ver a rede.
2. **O que observar:** colónias, cadeias e frentes de células, e o gráfico de linhagens a mostrar algumas famílias a dominar. Nada disto está escrito nas regras; cada célula apenas come, repara, orienta-se, divide-se ou morre.

### 8.7 Nadar em direção ao alimento (cognição)
1. Baixe **sensing noise** para cerca de 0,1 e mantenha **trails** ligado.
2. **O que observar:** rastos que curvam suavemente para longe das manchas luminosas (onde o nutriente está gasto) em direção a água mais rica.

### 8.8 Recuperar (resiliência)
1. Deixe a população crescer até o gráfico **Population** estabilizar.
2. Carregue em **Wipe 25% of the area**.
3. **O que observar:** uma descida no gráfico da população, e depois células vindas das margens a dividirem-se para dentro da zona vazia até o gráfico recuperar. Não existe nenhuma regra de reparação; o espaço é ocupado pelo crescimento normal.

---

## 9. Guardar e partilhar

- **Reproduzir uma execução:** use **Export state JSON**; quem a carregar com **Import state JSON** obtém as mesmas definições e a mesma semente. O início é idêntico. Execuções longas no navegador podem divergir ligeiramente entre computadores, porque as placas gráficas arredondam os números de maneira diferente.
- **Analisar os números:** **Download metrics CSV** dá uma linha por amostra (a cada 10 fotogramas) com estas colunas:

| Coluna | Significado |
| --- | --- |
| `tick` | Passos de simulação desde o recomeço |
| `timeS` | Segundos desde o recomeço |
| `F`, `k` | Valores de alimentação e de decaimento em uso |
| `population`, `lineages` | Células vivas e linhagens distintas |
| `meanEnergy` | Energia média por célula |
| `closureIndex` | Quota de células cuja reparação da pele acompanha o desgaste (células que se mantêm a si próprias) |
| `orderParameter` | Quanto padrão existe |
| `dissipation` | O "esforço" da reação |
| `wavelength` | Espaçamento típico do padrão, em células do campo. Mostra 512 quando o campo não tem padrão regular, ou quando o padrão ainda não se espalhou pelo campo todo. |

- **Mostrar a outros:** **Snapshot PNG** ou **Record 10 s WebM**.

---

## 10. Dicas de desempenho

- A linha de estado mostra os **fps**. Abaixo de cerca de 50, o movimento começa a engasgar.
- A **rede** e o **fluxo** são os extras mais exigentes; desligue-os primeiro.
- **speed** acima de 1× e **field steps/tick** acima de 8 também custam fotogramas.
- Uma janela do navegador maior significa mais píxeis para desenhar.

---

## 11. Resolução de problemas

| Problema | O que fazer |
| --- | --- |
| Uma mensagem de erro simples em vez do simulador | O navegador ou a placa gráfica não suportam WebGL2 com texturas de vírgula flutuante. Experimente uma versão atual do Chrome, Edge ou Firefox, com a aceleração por hardware ativada nas definições do navegador. |
| O campo está todo escuro | Não há padrão: F pode estar a 0 (**cut flux** está ligado?), o padrão pode ter morrido, ou **v scale** pode estar demasiado alto. Experimente **Reset with seed** ou o pincel de ruído. |
| Tudo parece desbotado | Baixe **bloom strength** ou suba **v scale**. |
| Não há protocélulas | **initial** estava a 0 no último recomeço, ou a população morreu (cortou a produção?). Ponha **initial** acima de 0 e recomece. |
| O pincel não faz nada | Escolha em **drag brush** um modo diferente de **Off**. |
| O painel de bifurcação não aparece | Só aparece depois de iniciar um varrimento de F. |
| A importação foi recusada | O ficheiro tem um valor fora do intervalo ou do tipo errado; a mensagem indica cada um. |

---

## 12. Glossário

- **Acoplamento estrutural:** o ambiente desencadeia mudanças num sistema, mas é a estrutura do próprio sistema que decide que mudanças são.
- **Autopoiese:** "autocriação"; um sistema que reconstrói continuamente as partes de que é feito.
- **Bifurcação:** um ponto em que uma pequena mudança numa definição provoca uma mudança súbita de comportamento.
- **Emergência:** padrões ao nível do grupo que nenhuma regra individual descreve.
- **Estrutura dissipativa:** um padrão ordenado que só existe enquanto a energia flui através dele.
- **Gradiente:** a direção em que uma grandeza, aqui o nutriente, aumenta.
- **Histerese:** quando o estado de um sistema depende da sua história, de modo que subir e descer seguem caminhos diferentes.
- **Linhagem:** todos os descendentes de uma protocélula original.
- **Parâmetro de ordem:** um único número que diz quanto padrão existe.
- **Protocélula:** uma unidade mínima parecida com a vida: uma fronteira, um metabolismo e a capacidade de se dividir.
- **Semente (seed):** o número que fixa todas as escolhas "aleatórias" de uma execução.
- **u, v:** os dois químicos. u é o nutriente (o alimento do lago); v é o químico autocatalítico das "florescências", que forma os padrões.

---

## 13. Limites, com honestidade

- O simulador ilustra ideias; não prevê organismos nem reações reais.
- As protocélulas e as florescências competem pelo mesmo nutriente. Com muitas protocélulas, a água é tão comida que as manchas desvanecem onde elas se aglomeram. Isto é intencional, mas significa que os padrões do próprio campo se estudam melhor com **initial** a 0.
- Há um limite fixo de 5000 protocélulas, por segurança e rapidez.
