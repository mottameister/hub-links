# Coruja Shop — implementação do revamp

Esta cópia foi preparada na branch `codex/shop-revamp-preview`.

## O que entrou

- Coruja++ como oferta principal, com benefícios atuais e formulário de nick/cupom no topo.
- Layout mais curto: meta, produtos, kits e serviços manuais recolhidos no fim. O fundo animado, a galeria longa e o ranking saíram da página de compra.
- Três Kits Explorador, cada um com armadura completa, espada, picareta, machado, pá e enxada em uma shulker box entregue por um comando RCON.
- Os kits são aceitos pela API com `SHOP_KITS_ENABLED=true`. O container de entrega foi atualizado na Oracle VM, e os três comandos compactos foram aceitos pelo RCON do servidor com seletor sem jogador. Uma compra real de ponta a ponta ainda não foi executada.
- Meta coletiva com percentual público acumulado e percentual contribuído no mês. O cálculo usa apenas pedidos BRL aprovados após a ativação, excluindo testes e pedidos arquivados. Nenhum valor de receita é retornado ao navegador.
- Preview fora do domínio oficial bloqueia o checkout.

## Valores propostos para revisão

| Produto | Valor |
| --- | ---: |
| Kit Ferro | R$ 9,90 (definido pelo usuário) |
| Kit Diamante | R$ 29,90 (proposta) |
| Kit Netherita | R$ 89,90 (proposta) |
| Meta interna | R$ 5.500 em compras brutas aprovadas |

A meta toma como referência a [lista do PCPartPicker](https://pcpartpicker.com/list/FV3vdq), que mostrava US$ 755,05 em 23/09/2026. Com câmbio de aproximadamente R$ 5,17, a conversão simples é R$ 3.903,61. O alvo de R$ 5.500 deixa aproximadamente R$ 1.596 de margem para imposto local, taxas de pagamento/conversão e variação de preços. É uma estimativa, não uma cotação fechada. O valor da meta não aparece na página pública. A lista sinaliza possível atualização de BIOS e adaptadores USB; conferir antes da compra.

## Início da meta

O endpoint `GET /api/shop/server-goal` usa o horário fixo `2026-09-24T02:37:25.738Z`, marcado pelo primeiro deploy READY da loja renovada na Vercel. A API soma as compras aprovadas a partir desse instante. O alvo e o horário são internos ao Worker, e o navegador recebe apenas percentuais.

Antes de publicar os kits, conferir em um servidor de teste Minecraft 1.21.1: sintaxe do comando gerado, conteúdo da shulker, encantamentos, jogador com inventário cheio, retorno positivo do RCON e recuperação de um timeout sem duplicar o kit. A verificação estática e os testes Node não provam a entrega dentro do jogo.

## Cosméticos

Simple Hats tem versão Fabric 1.21.1, mas requer Accessories e owo-lib. O mod oferece chapéus por drops e baús por padrão. A Coleção da Coruja ficou fora do catálogo até confirmar compatibilidade com o modpack e uma configuração que restrinja os itens escolhidos à forma de obtenção pretendida.
