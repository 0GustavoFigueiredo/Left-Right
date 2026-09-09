# LEFT/RIGHT 🌋

Jogo de esquiva infinita (dodge/runner vertical) feito com **HTML, CSS e JavaScript puro**,
desenvolvido para a Atividade Prática 1 da disciplina GAC116 - Programação Web.

## Objetivo do jogo

O vulcão despertou e a lava avança. Desvie das pedras e brasas que caem em direção ao
jogador, movendo-se para os lados, até percorrer a distância da meta e escapar com vida.

## Regras

- O personagem se move apenas para os lados (esquerda/direita); não há pulo.
- Pedras e brasas caem em direção ao jogador e precisam ser desviadas.
- A velocidade da corrida aumenta gradualmente com o tempo, tornando o jogo mais difícil.
- Existem três níveis de dificuldade, cada um com uma meta de distância diferente:
  - **Fácil:** 600 metros
  - **Médio:** 1000 metros
  - **Difícil:** 1400 metros
- **Derrota:** colidir com uma pedra ou brasa.
- **Vitória:** percorrer a distância da meta sem colidir.
- O recorde (maior distância percorrida) é salvo localmente no navegador.
- O jogo pode ser reiniciado a qualquer momento pela tela de início/fim de partida.

## Como jogar

1. Abra o jogo (veja o link publicado abaixo, ou `index.html` localmente).
2. Escolha a dificuldade (Fácil, Médio ou Difícil) e clique em **"Iniciar jogo"**.
3. Use as setas **← →**, as teclas **A D** ou arraste o dedo/mouse na tela para desviar
   dos obstáculos.
4. Sobreviva até completar a meta de distância.

## Instalação (uso local)

Não há dependências. Basta clonar o repositório e abrir o arquivo `index.html`
diretamente em um navegador:

```bash
git clone https://github.com/<seu-usuario>/<seu-repositorio>.git
cd <seu-repositorio>
```

Depois, abra `index.html` no navegador (duplo clique ou "Abrir com").

## Tecnologias utilizadas

- HTML5 (estrutura e `<canvas>`)
- CSS3 (estilização e responsividade)
- JavaScript puro (movimento do jogador, geração de obstáculos e lógica do jogo, sem
  frameworks ou bibliotecas)

## Link da versão publicada (GitHub Pages)

`https://<seu-usuario>.github.io/<seu-repositorio>/`

> Substitua pelo link real após publicar no GitHub Pages.

## Informações do projeto

```json
{
  "nome": "Left/Right",
  "descricao": "Jogo de esquiva em que o jogador se move para os lados a fim de fugir de pedras e brasas de um vulcão em erupção, com dificuldade crescente, até percorrer a distância da meta e escapar.",
  "autores": "Gustavo",
  "turma": "14A"
}
```

## Licença

Este projeto está licenciado sob a licença MIT — veja o arquivo [LICENSE](LICENSE)
para mais detalhes.
