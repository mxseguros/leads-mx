# @mx/widget

Widget de captura da MX — **Fase 1** do plano de execução.

O que ele precisa ser (§5.2 do planejamento):

- Preact + Shadow DOM, abaixo de 25 kB gz
- Dois modos: flutuante (botão no canto) e inline (dentro de um `<div>`)
- Carrega as próprias fontes; não herda nem vaza CSS do site hospedeiro
- Servido em `/widget.js` com cache de 1h e CORS

Instalação prevista:

```html
<script
  src="https://leads.mxseguros.com.br/widget.js"
  data-origem="site-seguro-auto"
  data-modo="flutuante"
  data-produto="Auto"
></script>
```

O pacote existe desde a Fase 0 para o workspace já estar no lugar certo — o
código entra na Fase 1.
