# Pac-Man

Um clone simples de Pac-Man que roda direto no navegador, feito para ser jogável tanto no desktop quanto no celular (touch).

🎮 **Jogue online:** https://vagnnermartins.github.io/pacman/

## Como jogar

- **Desktop:** setas do teclado ou `W A S D`
- **Celular:** D-pad na tela ou swipe (arrastar o dedo) sobre o tabuleiro
- Coma todos os pontos para vencer a fase
- As pílulas grandes (power pellets) deixam os fantasmas vulneráveis por alguns segundos — eles piscam pouco antes do efeito acabar, avisando que está terminando
- Perca todas as vidas e o jogo acaba; sua pontuação entra no ranking local (top 5), guardado no navegador

## Funcionalidades

- Labirinto, pontuação, vidas e colisão com fantasmas
- 4 fantasmas com IA simples (perseguem o Pac-Man, fogem quando vulneráveis)
- 3 níveis de dificuldade (Fácil, Médio, Difícil), com label mostrando o nível ativo durante a partida
- Botões de **Reiniciar** (reinicia a partida com 3 vidas) e **Sair** (volta ao menu de dificuldade)
- Ranking de pontuação salvo em `localStorage`
- Controles touch e suporte a swipe para uso em celular
- Publicado via GitHub Pages

## Stack

- HTML5 Canvas
- CSS
- JavaScript puro (sem frameworks ou dependências)

Escolhido por ser leve, carregar rápido em conexões móveis e dar controle total sobre o game loop, grid do labirinto e colisões — exatamente o que esse tipo de jogo precisa, sem a sobrecarga de um framework.

## Estrutura do projeto

```
pacman/
├── index.html   # estrutura da página, HUD, overlay de menu/ranking, controles touch
├── style.css    # estilos e responsividade
└── game.js      # lógica do jogo: maze, movimento, fantasmas, colisões, ranking
```

## Como foi criado

Este projeto foi desenvolvido com o auxílio do [Claude Code](https://claude.com/claude-code), de forma incremental:

1. Estrutura inicial do jogo (maze, Pac-Man, fantasmas, pontuação, controles touch/teclado)
2. Correção do sistema de movimento (de comparação de ponto flutuante para um modelo de progresso por célula, eliminando bugs de atravessar paredes e ignorar direções)
3. Publicação via GitHub Pages
4. Botão de reiniciar e níveis de dificuldade
5. Botão de sair (volta ao menu) e ranking de pontuação persistido
6. Efeito de "piscar" nos fantasmas avisando o fim do modo vulnerável
7. Label de dificuldade ativa no HUD

## Rodando localmente

Não precisa de build nem instalação — é só abrir o `index.html` no navegador, ou servir a pasta com qualquer servidor estático:

```bash
python -m http.server 8000
```

Depois acesse `http://localhost:8000`.
